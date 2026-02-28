import asyncio
import json
import logging
import os
import sys
from functools import partial
from pathlib import Path

# Ensure the project root (parent of backend/) is on sys.path so that
# "backend.graph.workflow" and all other backend.* imports resolve correctly
# regardless of the working directory the agent is launched from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, RunContext, function_tool, room_io
from livekit.plugins import noise_cancellation, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from backend.env_loader import load_backend_env

try:
    from livekit.plugins import deepgram as deepgram_plugin
except Exception:  # pragma: no cover - optional plugin at runtime
    deepgram_plugin = None

try:
    from livekit.plugins import google as google_plugin
except Exception:  # pragma: no cover - optional plugin at runtime
    google_plugin = None

load_backend_env()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("voiceforge-agent")


def _build_stt():
    """Use direct Deepgram API when DEEPGRAM_API_KEY is set to avoid LiveKit gateway 429s."""
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    model = os.environ.get("DEEPGRAM_STT_MODEL", "nova-3")
    language = os.environ.get("DEEPGRAM_STT_LANGUAGE", "multi")
    default_streaming_language = os.environ.get("DEEPGRAM_STT_DEFAULT_LANGUAGE", "en-US")

    if api_key and deepgram_plugin is not None:
        try:
            # Deepgram streaming mode does not support detect_language=True.
            # Use an explicit language for streaming STT.
            if language == "multi":
                stt = deepgram_plugin.STT(model=model, language=default_streaming_language, api_key=api_key)
                logger.warning(
                    "DEEPGRAM_STT_LANGUAGE=multi is not supported for streaming STT; using '%s' instead.",
                    default_streaming_language,
                )
            else:
                stt = deepgram_plugin.STT(model=model, language=language, api_key=api_key)
            logger.info(
                "STT configured via direct Deepgram API | model=%s | language=%s",
                model,
                default_streaming_language if language == "multi" else language,
            )
            return stt
        except Exception as exc:
            logger.warning("Deepgram STT init failed, using gateway STT fallback: %s", exc)

    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not found; using gateway STT fallback.")
    elif deepgram_plugin is None:
        logger.warning("Deepgram plugin unavailable in main thread; using gateway STT fallback.")

    gateway_str = f"deepgram/{model}:{language}"
    logger.warning(
        "No DEEPGRAM_API_KEY found in environment; falling back to gateway STT '%s'. "
        "This can fail with 429 when gateway quota/rate limits are hit. "
        "Set DEEPGRAM_API_KEY in backend/.env.local.",
        gateway_str,
    )
    return gateway_str


def _build_tts():
    """Use direct Deepgram TTS when DEEPGRAM_API_KEY is set to avoid LiveKit gateway 429s."""
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    model = os.environ.get("DEEPGRAM_TTS_MODEL", "aura-2-andromeda-en")

    if api_key and deepgram_plugin is not None:
        try:
            tts_engine = deepgram_plugin.TTS(model=model, api_key=api_key)
            logger.info("TTS configured via direct Deepgram API | model=%s", model)
            return tts_engine
        except Exception as exc:
            logger.warning("Deepgram TTS init failed, using gateway TTS fallback: %s", exc)

    if not api_key:
        logger.warning("DEEPGRAM_API_KEY not found; using gateway TTS fallback.")
    elif deepgram_plugin is None:
        logger.warning("Deepgram plugin unavailable in main thread; using gateway TTS fallback.")

    fallback = "cartesia/sonic-3:9626c31c-bec5-4cca-baa8-f8ba9e84c8bc"
    logger.warning(
        "No DEEPGRAM_API_KEY found; falling back to gateway TTS '%s'. "
        "This can fail with 429 when gateway quota/rate limits are hit. "
        "Set DEEPGRAM_API_KEY in backend/.env.local.",
        fallback,
    )
    return fallback


def _build_voice_llm():
    """Prefer direct Gemini API to avoid LiveKit gateway credit limits."""
    gemini_api_key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    model = os.environ.get("VOICE_LLM_MODEL", "gemini-2.5-flash")

    if gemini_api_key and google_plugin is not None:
        try:
            # The LiveKit Google plugin reads GOOGLE_API_KEY.
            os.environ.setdefault("GOOGLE_API_KEY", gemini_api_key)
            logger.info("Voice LLM configured via direct Google plugin | model=%s", model)
            return google_plugin.LLM(model=model, api_key=gemini_api_key)
        except Exception as exc:
            logger.warning("Google LLM init failed, using gateway LLM fallback: %s", exc)

    if not gemini_api_key:
        logger.warning("GEMINI/GOOGLE API key not found; using gateway LLM fallback.")
    elif google_plugin is None:
        logger.warning("Google plugin unavailable in main thread; using gateway LLM fallback.")

    fallback = os.environ.get("VOICE_LLM_FALLBACK", model)
    logger.warning(
        "No GEMINI/GOOGLE API key found; falling back to gateway LLM '%s'. "
        "If gateway credits are exhausted, set GEMINI_API_KEY or GOOGLE_API_KEY.",
        fallback,
    )
    return fallback


class Assistant(Agent):
    def __init__(self, room: rtc.Room) -> None:
        super().__init__(
            instructions="""You are a senior AI software architect and full-stack engineer.

Detect exactly ONE intent per user turn:
1) generate_code
2) explain_code
3) debug_code
4) run_code
5) learn_code (only when the user explicitly asks to be taught with code)

TOOL ROUTING:
- generate_code intent -> call generate_code once.
- explain_code intent -> call explain_code once.
- debug_code intent -> call debug_code once.
- run_code intent -> call run_code once.
- learn_code intent -> call generate_learn_code once.

Critical rules:
- Never call more than one tool in a turn.
- Never mix response formats.
- After tool output, speak a very short acknowledgement sentence and stop.
- If the request is general conversation, answer concisely without tools.
""",
        )
        self._room = room
        self._editor_code: str = ""
        self._editor_language: str = "python"
        # Set by the frontend when operating inside a Learn Book workspace
        self._learn_book_id: str = ""

    # ── Tool: generate new code ───────────────────────────────────────────────
    @function_tool(description=(
        "Generate brand-new code from the user's description and push it to the editor. "
        "Use ONLY for generate / write / create / build requests."
    ))
    async def generate_code(self, ctx: RunContext, prompt: str) -> str:
        """Calls the codegen workflow and publishes the result to the editor via data channel."""
        logger.info("generate_code | prompt=%r", prompt)
        try:
            import os
            from backend.graph.workflow import run_generate_only
            model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

            loop = asyncio.get_event_loop()
            code_obj, _ = await loop.run_in_executor(
                None, partial(run_generate_only, prompt, model, None)
            )

            await self._publish_response(
                {
                    "type": "code",
                    "language": str(code_obj.language.value),
                    "content": code_obj.code,
                }
            )
            return f"TOOL_DONE: Generated {code_obj.language.value} code and sent it to the editor."

        except Exception as exc:
            logger.error("generate_code error: %s", exc, exc_info=True)
            return "I ran into a problem generating that code. Please try again."

    # ── Tool: explain existing editor code ────────────────────────────────────
    @function_tool(description=(
        "Explain the code currently open in the editor and publish a structured summary "
        "for the Summary tab. Use ONLY for explain requests."
    ))
    async def explain_code(self, ctx: RunContext) -> str:
        if not self._editor_code.strip():
            return "TOOL_DONE: There is no code in the editor right now."
        try:
            import os
            from backend.services.explain_service import explain_code_as_summary

            model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
            loop = asyncio.get_event_loop()
            summary = await loop.run_in_executor(
                None,
                partial(
                    explain_code_as_summary,
                    self._editor_code,
                    self._editor_language,
                    model,
                ),
            )
            await self._publish_response(
                {
                    "type": "summary",
                    "content": {
                        "what_it_does": summary.what_it_does,
                        "components": summary.components,
                        "flow": summary.flow,
                    },
                }
            )
            return f"TOOL_DONE: {summary.what_it_does}"
        except Exception as exc:
            logger.error("explain_code error: %s", exc, exc_info=True)
            return "I ran into a problem explaining that code. Please try again."

    # ── Tool: debug existing editor code ─────────────────────────────────────
    @function_tool(description=(
        "Analyse the code in the editor, identify bugs, and push a fixed version back to the editor. "
        "Use ONLY for debug / fix / error / broken requests."
    ))
    async def debug_code(self, ctx: RunContext, error_message: str = "") -> str:
        """Runs the debug workflow on editor code and publishes the fix via data channel."""
        logger.info("debug_code | language=%s | error=%r", self._editor_language, error_message)
        if not self._editor_code.strip():
            return "TOOL_DONE: There is no code in the editor to debug."
        try:
            import os
            from backend.graph.workflow import run_debug_only
            model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")

            loop = asyncio.get_event_loop()
            debug_obj = await loop.run_in_executor(
                None,
                partial(
                    run_debug_only,
                    self._editor_code,
                    self._editor_language,
                    error_message,
                    model,
                ),
            )

            await self._publish_response(
                {
                    "type": "code",
                    "language": self._editor_language,
                    "content": debug_obj.fixed_code,
                }
            )
            return f"TOOL_DONE: {debug_obj.issue_summary}"

        except Exception as exc:
            logger.error("debug_code error: %s", exc, exc_info=True)
            return "I ran into a problem debugging that code. Please try again."

    # ── Tool: run existing editor code ───────────────────────────────────────
    @function_tool(description=(
        "Run the current Python code in the editor and report output. "
        "Use ONLY for run/execute requests."
    ))
    async def run_code(self, ctx: RunContext) -> str:
        if not self._editor_code.strip():
            return "TOOL_DONE: There is no code in the editor to run."
        if self._editor_language != "python":
            return "TOOL_DONE: Run is only available for Python code."
        try:
            from backend.services.execution_service import run_python

            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, partial(run_python, self._editor_code))

            if result.timed_out:
                return "TOOL_DONE: Execution timed out."
            if result.exit_code != 0:
                err = (result.stderr or "Unknown runtime error").strip()
                return f"TOOL_DONE: Run failed. {err[:300]}"
            out = (result.stdout or "(no output)").strip()
            return f"TOOL_DONE: Run completed. Output: {out[:300]}"
        except Exception as exc:
            logger.error("run_code error: %s", exc, exc_info=True)
            return "I ran into a problem running that code. Please try again."

    # ── Tool: educational code generation (Learn Book mode) ───────────────────
    @function_tool(description=(
        "Generate code WITH a detailed beginner-friendly explanation, step-by-step breakdown, "
        "and key concepts. Use when the user is in Learn Book mode or says 'teach me', "
        "'explain how to', 'how does X work', 'I want to learn', etc."
    ))
    async def generate_learn_code(self, ctx: RunContext, prompt: str) -> str:
        """Generates educational code + explanation and publishes 'learn_code_result'."""
        logger.info("generate_learn_code | book_id=%r | prompt=%r", self._learn_book_id, prompt)
        try:
            import os
            from backend.services.llm_service import LLMConfig, build_llm
            from backend.services.learn_codegen_service import generate_educational_code
            from backend.services.rag_service import search_context

            model_name = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
            llm = build_llm(LLMConfig(model=model_name, temperature=0.3, max_tokens=None))

            rag_context = None
            rag_sources = None

            if self._learn_book_id:
                try:
                    collection_name = f"learn-book-{self._learn_book_id}"
                    loop = asyncio.get_event_loop()
                    rag_context, rag_sources = await loop.run_in_executor(
                        None, lambda: search_context(prompt, collection_name, k=3)
                    )
                    if rag_context:
                        logger.info(
                            "RAG context found | collection=%s | chars=%d | sources=%s",
                            collection_name, len(rag_context), rag_sources
                        )
                    else:
                        logger.warning(
                            "RAG search returned empty context | collection=%s | "
                            "ensure PDF was uploaded and Qdrant+Ollama are running",
                            collection_name
                        )
                except Exception as rag_exc:
                    logger.warning("RAG search failed in agent: %s", rag_exc)
                    rag_context = None
            else:
                logger.warning("generate_learn_code called but _learn_book_id is empty — RAG skipped")

            loop = asyncio.get_event_loop()
            learn_obj = await loop.run_in_executor(
                None,
                partial(generate_educational_code, prompt, llm, rag_context, rag_sources),
            )

            payload = json.dumps({
                "type": "learn_code_result",
                "code": learn_obj.code,
                "language": str(learn_obj.language.value),
                "detailed_explanation": learn_obj.detailed_explanation,
                "step_by_step": learn_obj.step_by_step,
                "key_concepts": learn_obj.key_concepts,
                "rag_sources": learn_obj.rag_sources or [],
            })
            await self._room.local_participant.publish_data(
                payload.encode(),
                reliable=True,
                topic="learn_code_result",
            )
            logger.info("Learn code pushed | language=%s", learn_obj.language.value)

            # Spoken summary: first key concept + brief encouragement
            first_concept = learn_obj.key_concepts[0] if learn_obj.key_concepts else ""
            return (
                f"TOOL_DONE: Code is ready with a full explanation. "
                f"Key concept to note: {first_concept}"
            )

        except Exception as exc:
            logger.error("generate_learn_code error: %s", exc, exc_info=True)
            return "I ran into a problem generating that educational code. Please try again."

    # ── Internal helper ───────────────────────────────────────────────────────
    async def _publish_response(self, response: dict) -> None:
        payload = json.dumps(response)
        await self._room.local_participant.publish_data(
            payload.encode(),
            reliable=True,
            topic="assistant_result",
        )
        logger.info("Assistant response published | type=%s", response.get("type"))


server = AgentServer()


@server.rtc_session(agent_name="my-agent")
async def my_agent(ctx: agents.JobContext):
    load_backend_env()
    logger.info("Agent session starting | room=%s", ctx.room.name)

    assistant = Assistant(room=ctx.room)

    # Listen for editor code published by the frontend on "editor_context" topic
    @ctx.room.on("data_received")
    def on_data(data_packet: rtc.DataPacket):
        try:
            if data_packet.topic == "editor_context":
                payload = json.loads(bytes(data_packet.data).decode("utf-8"))
                assistant._editor_code = payload.get("code", "")
                assistant._editor_language = payload.get("language", "python")
                logger.info(
                    "Editor context updated | language=%s | chars=%d",
                    assistant._editor_language,
                    len(assistant._editor_code),
                )
            elif data_packet.topic == "learn_book_context":
                payload = json.loads(bytes(data_packet.data).decode("utf-8"))
                assistant._learn_book_id = payload.get("book_id", "")
                assistant._editor_code = payload.get("code", "")
                assistant._editor_language = payload.get("language", "python")
                logger.info(
                    "Learn book context updated | book_id=%s | language=%s",
                    assistant._learn_book_id,
                    assistant._editor_language,
                )
        except Exception as exc:
            logger.warning("Failed to parse data packet: %s", exc)

    session = AgentSession(
        stt=_build_stt(),
        llm=_build_voice_llm(),
        tts=_build_tts(),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    try:
        await session.start(
            room=ctx.room,
            agent=assistant,
            room_options=room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(
                    noise_cancellation=lambda params: (
                        noise_cancellation.BVCTelephony()
                        if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP
                        else noise_cancellation.BVC()
                    ),
                ),
            ),
        )
        logger.info("Agent session started successfully")
    except Exception as e:
        logger.error("Failed to start agent session: %s", e)
        raise

    await session.generate_reply(
        instructions="Greet the user briefly and let them know they can ask you to write code."
    )


if __name__ == "__main__":
    agents.cli.run_app(server)
