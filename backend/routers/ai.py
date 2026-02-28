from __future__ import annotations

import os

from fastapi import APIRouter, Depends

from backend.graph.workflow import run_generate_only, run_plan_only, run_workflow
from backend.models.schemas import AIProcessRequest, AIProcessResponse, RunRequest, RunResult
from backend.services.execution_service import run_python
from backend.services.auth_service import get_current_user_id

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_model() -> str:
    model = os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")
    return model


@router.post("/process", response_model=AIProcessResponse)
async def process_request(payload: AIProcessRequest, user_id: str = Depends(get_current_user_id)):
    _ = user_id
    model = _get_model()
    if payload.stage.value == "plan":
        # Plan stage: classify intent + build ordered plan (2 LLM calls)
        intent, plan = run_plan_only(payload.prompt, model)
        return AIProcessResponse(intent=intent.intent, plan=plan)

    # Generate stage: language detected by heuristic, then generate + summarise (2 LLM calls).
    # Intent is inferred from the presence of a generate request — no separate classify call.
    code, summary = run_generate_only(payload.prompt, model)
    return AIProcessResponse(intent="generate", plan=None, code=code, summary=summary)


@router.post("/run", response_model=RunResult)
async def run_code(payload: RunRequest, user_id: str = Depends(get_current_user_id)):
    _ = user_id
    result = run_python(payload.code)
    return result
