from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, TypedDict

from langgraph.graph import END, StateGraph

from backend.models.schemas import (
    CodeResponse,
    DebugResponse,
    IntentResponse,
    IntentType,
    LanguageType,
    PlanResponse,
    SummaryResponse,
)
from backend.services.codegen_service import detect_language, generate_code
from backend.services.debug_service import debug_code
from backend.services.intent_service import classify_intent
from backend.services.planning_service import build_plan
from backend.services.summary_service import summarize_code


class WorkflowState(TypedDict, total=False):
    prompt: str
    model: str
    # Existing editor content (used for debug / explain)
    existing_code: str
    existing_language: str
    error_message: str
    # Pipeline results
    intent: IntentResponse
    plan: PlanResponse
    code: CodeResponse
    summary: SummaryResponse
    debug: DebugResponse
    explanation: str


@dataclass(frozen=True)
class WorkflowResult:
    intent: IntentResponse
    plan: Optional[PlanResponse] = field(default=None)
    code: Optional[CodeResponse] = field(default=None)
    summary: Optional[SummaryResponse] = field(default=None)
    debug: Optional[DebugResponse] = field(default=None)
    explanation: Optional[str] = field(default=None)


# ── Node implementations ──────────────────────────────────────────────────────

def _intent_node(state: WorkflowState) -> WorkflowState:
    intent = classify_intent(state["prompt"], state["model"])
    return {"intent": intent}


def _plan_node(state: WorkflowState) -> WorkflowState:
    plan = build_plan(state["prompt"], state["model"])
    return {"plan": plan}


def _code_node(state: WorkflowState) -> WorkflowState:
    plan = state["plan"]
    code = generate_code(state["prompt"], state["model"], plan.language)
    return {"code": code}


def _summary_node(state: WorkflowState) -> WorkflowState:
    summary = summarize_code(state["prompt"], state["code"].code, state["model"])
    return {"summary": summary}


def _debug_node(state: WorkflowState) -> WorkflowState:
    lang_str = state.get("existing_language", "python")
    try:
        lang = LanguageType(lang_str)
    except ValueError:
        lang = LanguageType.PYTHON
    result = debug_code(
        code=state.get("existing_code", ""),
        language=lang,
        error_message=state.get("error_message", ""),
        model=state["model"],
    )
    return {"debug": result}


# ── Intent-based router ───────────────────────────────────────────────────────

def _route_intent(state: WorkflowState) -> str:
    """Return the name of the next node based on classified intent."""
    intent = state.get("intent")
    if intent is None:
        return "plan"
    it = intent.intent if isinstance(intent, IntentResponse) else intent
    if it in (IntentType.GENERATE, IntentType.REFACTOR):
        return "plan"
    if it == IntentType.DEBUG:
        return "debug"
    # explain / run — nothing to generate; caller handles it
    return END


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_workflow() -> StateGraph:
    graph = StateGraph(WorkflowState)

    graph.add_node("intent", _intent_node)
    graph.add_node("plan", _plan_node)
    graph.add_node("code", _code_node)
    graph.add_node("summary", _summary_node)
    graph.add_node("debug", _debug_node)

    graph.set_entry_point("intent")

    # Route after intent classification
    graph.add_conditional_edges(
        "intent",
        _route_intent,
        {
            "plan": "plan",
            "debug": "debug",
            END: END,
        },
    )

    # Generate path: plan → code → summary → END
    graph.add_edge("plan", "code")
    graph.add_edge("code", "summary")
    graph.add_edge("summary", END)

    # Debug path: debug → END
    graph.add_edge("debug", END)

    return graph


# ── Public helpers ────────────────────────────────────────────────────────────

def run_plan_only(
    prompt: str,
    model: str,
) -> tuple[IntentResponse, PlanResponse]:
    """Classify intent and build an ordered plan (2 LLM calls, no code gen)."""
    intent = classify_intent(prompt, model)
    plan = build_plan(prompt, model)
    return intent, plan


def run_generate_only(
    prompt: str,
    model: str,
    plan: Optional[PlanResponse] = None,
) -> tuple[CodeResponse, SummaryResponse]:
    """Generate code + summary with a single intent-detected language.

    If a pre-built plan is supplied (e.g. from REST API) its language is used.
    Otherwise the language is detected with a fast keyword heuristic —
    no extra LLM call needed because the Gemini agent already classified intent.
    """
    language = plan.language if plan is not None else detect_language(prompt)
    code = generate_code(prompt, model, language)
    summary = summarize_code(prompt, code.code, model)
    return code, summary


def run_debug_only(
    existing_code: str,
    existing_language: str,
    error_message: str,
    model: str,
) -> DebugResponse:
    """Debug existing code without running the full intent pipeline."""
    try:
        lang = LanguageType(existing_language)
    except ValueError:
        lang = LanguageType.PYTHON
    return debug_code(
        code=existing_code,
        language=lang,
        error_message=error_message,
        model=model,
    )


def run_workflow(prompt: str, model: str) -> WorkflowResult:
    graph = build_workflow().compile()
    state: WorkflowState = {"prompt": prompt, "model": model}
    result = graph.invoke(state)
    return WorkflowResult(
        intent=result.get("intent"),
        plan=result.get("plan"),
        code=result.get("code"),
        summary=result.get("summary"),
        debug=result.get("debug"),
        explanation=result.get("explanation"),
    )

