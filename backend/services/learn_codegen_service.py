"""
learn_codegen_service.py — Educational code generation with deep, beginner-friendly explanations.

The LLM is prompted to act as a patient coding teacher.  It produces:
  • working, sandbox-safe code
  • a detailed prose explanation of what EVERY part does
  • a numbered step-by-step breakdown of the logic flow
  • a list of key concepts a beginner needs to understand

When optional RAG context is provided (PDF chunks), the LLM is asked to ground
the code and explanation in that context.
"""
from __future__ import annotations

import json
import logging
import re
from typing import List, Optional

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from backend.models.schemas import LanguageType, LearnCodeResponse

logger = logging.getLogger(__name__)

# ── Pydantic schema for the LLM to fill ──────────────────────────────────────

class _LLMLearnOutput(BaseModel):
    language: str = Field(..., description="'python' or 'html'")
    code: str = Field(..., description="Complete, working, sandbox-safe code.")
    detailed_explanation: str = Field(
        ...,
        description=(
            "A thorough, conversational explanation written for a complete beginner. "
            "Explain what every significant line or block does in plain English. "
            "Use analogies where helpful. Aim for 3-8 paragraphs."
        ),
    )
    step_by_step: List[str] = Field(
        ...,
        description=(
            "A numbered list of steps that walk through the logic of the code "
            "from start to finish. Each step should be one clear sentence."
        ),
    )
    key_concepts: List[str] = Field(
        ...,
        description=(
            "A list of 4-8 important programming concepts used in this code "
            "that a beginner should study. Each entry: 'Concept: one-sentence description'."
        ),
    )


# ── JSON extraction helper ────────────────────────────────────────────────────

def _extract_json_from_response(text: str) -> dict:
    """
    Extract JSON from LLM response, handling markdown code blocks, truncated
    responses, and other wrapping.  Uses json_repair as final fallback.
    """
    if not text or not text.strip():
        raise ValueError("Empty response from LLM")

    # 1. Try direct parse
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # 2. Try extracting from markdown code blocks
    patterns = [
        r'```json\s*\n(.*?)\n```',
        r'```\s*\n(.*?)\n```',
        r'```json\s*(.*?)```',
        r'```\s*(.*?)```',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                continue

    # 3. Find the outermost JSON object and repair (handles truncated responses)
    json_match = re.search(r'\{.*', text, re.DOTALL)
    candidate = json_match.group(0) if json_match else text
    try:
        from json_repair import repair_json
        repaired = repair_json(candidate, return_objects=True)
        if isinstance(repaired, dict) and repaired:
            return repaired
    except Exception:
        pass

    raise ValueError(f"Could not extract valid JSON from response. Response preview: {text[:200]}")


# ── Prompt ────────────────────────────────────────────────────────────────────

_SYSTEM = """\
You are CodeTeach — a world-class programming tutor whose only goal is to help
absolute beginners understand how code works.

When you generate code you MUST also provide:
1. A DETAILED EXPLANATION — explain every meaningful line or block in plain,
   everyday English. Imagine you are explaining to someone who has never
   written a line of code. Use simple words and analogies.
2. A STEP-BY-STEP breakdown — walk through the logic numerically, describing
   what the computer is doing at each stage.
3. KEY CONCEPTS — list the important programming ideas used (e.g. loops,
   functions, variables) with a one-sentence beginner-friendly description.

Rules for code:
- Write complete, runnable code only. No placeholders like "# your code here".
- Do NOT import: os, sys, subprocess, shutil, socket, ctypes, importlib.
- Do NOT use: open(), eval(), exec(), __import__().
- If the language is HTML, produce a single self-contained HTML file.
- If the language is Python, produce a single runnable script.

{rag_instruction}

CRITICAL: You MUST respond with ONLY a valid JSON object. Do not include any text before or after the JSON.
Do not wrap the JSON in markdown code blocks. Just return the raw JSON object.

The JSON must exactly match this schema:
{{
  "language": "python" or "html",
  "code": "<full code here>",
  "detailed_explanation": "<long explanation>",
  "step_by_step": ["Step 1: ...", "Step 2: ...", ...],
  "key_concepts": ["Concept: description", ...]
}}
"""

_HUMAN_NO_RAG = """\
The user wants to learn by doing. Write educational code for this request and
explain it thoroughly as described:

Request: {prompt}
"""

_HUMAN_WITH_RAG = """\
The following context comes from a reference document the user has attached.
Use this context to ground your code and explanation — reference specific
pages when relevant.

Context from PDF:
{context}

---
Now write educational code for this request, explaining every part clearly:

Request: {prompt}
"""

_RAG_INSTRUCTION = (
    "The user has provided PDF context below. "
    "Ground your answer in that material and mention page numbers when citing it."
)

# ── Public API ────────────────────────────────────────────────────────────────

def generate_educational_code(
    prompt: str,
    model,
    rag_context: Optional[str] = None,
    rag_sources: Optional[List[str]] = None,
) -> LearnCodeResponse:
    """
    Generate educational code + explanation using the provided Groq model.

    Args:
        prompt:      User's learning request.
        model:       A ChatGroq (or compatible) LLM instance.
        rag_context: Formatted context string from rag_service.search_context().
        rag_sources: Human-readable source strings (page + file).

    Returns:
        LearnCodeResponse with code, explanation, steps, concepts, and sources.
    """
    rag_instruction = _RAG_INSTRUCTION if rag_context else ""

    if rag_context:
        human_template = _HUMAN_WITH_RAG
        human_vars: dict = {"context": rag_context, "prompt": prompt, "rag_instruction": rag_instruction}
    else:
        human_template = _HUMAN_NO_RAG
        human_vars = {"prompt": prompt, "rag_instruction": rag_instruction}

    chat_prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM),
        ("human", human_template),
    ])

    # Try with standard parser first, but add fallback
    parser = JsonOutputParser(pydantic_object=_LLMLearnOutput)
    chain = chat_prompt | model

    try:
        # Get raw response from LLM
        response = chain.invoke(human_vars)
        
        # Extract text content
        if hasattr(response, 'content'):
            raw_text = response.content
        elif isinstance(response, str):
            raw_text = response
        else:
            raw_text = str(response)
        
        logger.debug(f"Raw LLM response: {raw_text[:500]}...")
        
        # Try standard parser first
        try:
            raw: dict = parser.parse(raw_text)
        except Exception as parse_err:
            logger.warning(f"Standard JSON parsing failed: {parse_err}. Attempting manual extraction...")
            # Fallback to manual extraction
            raw = _extract_json_from_response(raw_text)
            
    except Exception as exc:
        logger.error("Educational codegen failed: %s", exc, exc_info=True)
        raise ValueError(f"Failed to generate valid educational code: {str(exc)}")

    # Normalise language field
    lang_raw = str(raw.get("language", "python")).lower()
    language = LanguageType.HTML if "html" in lang_raw else LanguageType.PYTHON

    return LearnCodeResponse(
        language=language,
        code=raw.get("code", ""),
        detailed_explanation=raw.get("detailed_explanation", ""),
        step_by_step=raw.get("step_by_step", []),
        key_concepts=raw.get("key_concepts", []),
        rag_sources=rag_sources if rag_sources else None,
    )
