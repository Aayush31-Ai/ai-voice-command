from __future__ import annotations

from enum import Enum
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class IntentType(str, Enum):
    GENERATE = "generate"
    DEBUG = "debug"
    EXPLAIN = "explain"
    RUN = "run"
    REFACTOR = "refactor"


class LanguageType(str, Enum):
    PYTHON = "python"
    HTML = "html"


class PlanStage(str, Enum):
    PLAN = "plan"
    GENERATE = "generate"


class AIProcessRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    stage: PlanStage = Field(default=PlanStage.PLAN)
    project_id: Optional[str] = None


class IntentResponse(BaseModel):
    intent: IntentType


class PlanResponse(BaseModel):
    language: LanguageType
    plan: List[str]
    approach: str


class CodeResponse(BaseModel):
    language: LanguageType
    code: str


class SummaryResponse(BaseModel):
    what_it_does: str
    key_components: str
    how_to_extend: str


class AssistantSummaryContent(BaseModel):
    what_it_does: str
    components: str
    flow: str


class AssistantResponseType(str, Enum):
    CODE = "code"
    SUMMARY = "summary"


class AssistantResponse(BaseModel):
    type: AssistantResponseType
    language: Optional[LanguageType] = None
    content: str | AssistantSummaryContent


class DebugResponse(BaseModel):
    issue_summary: str                      # Short description of what was wrong
    fixed_code: str                         # Corrected, runnable code
    language: Optional[LanguageType] = None  # Filled in by caller


class AIProcessResponse(BaseModel):
    intent: IntentType
    plan: Optional[PlanResponse] = None
    code: Optional[CodeResponse] = None
    summary: Optional[SummaryResponse] = None


class RunRequest(BaseModel):
    code: str = Field(..., min_length=1)


class RunResult(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    timed_out: bool


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1)
    language: LanguageType
    code: str = Field(default="")


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    language: Optional[LanguageType] = None
    code: Optional[str] = None


class ProjectRecord(BaseModel):
    id: str
    user_id: str
    name: str
    language: LanguageType
    code: str
    updated_at: Optional[str] = None


class ErrorResponse(BaseModel):
    detail: str


# ── Learn Books ───────────────────────────────────────────────────────────────

class LearnBookCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    language: LanguageType
    code: str = Field(default="")


class LearnBookUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[LanguageType] = None
    code: Optional[str] = None


class LearnBookRecord(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    language: LanguageType
    code: str
    has_pdf: bool = False
    pdf_collection_name: Optional[str] = None
    updated_at: Optional[str] = None


class PdfUploadResponse(BaseModel):
    collection_name: str
    chunks_indexed: int


# Educational response — much richer than standard CodeResponse
class LearnCodeResponse(BaseModel):
    language: LanguageType
    code: str
    detailed_explanation: str          # Full prose explanation of the code
    step_by_step: List[str]            # Numbered steps walking through the logic
    key_concepts: List[str]            # Concepts a beginner needs to know
    rag_sources: Optional[List[str]] = None  # Page/file references when PDF was used


class LearnAIProcessResponse(BaseModel):
    intent: IntentType
    plan: Optional[PlanResponse] = None
    learn_response: Optional[LearnCodeResponse] = None
    extra: Optional[Any] = None


# ── Roadmaps ──────────────────────────────────────────────────────────────────

class RoadmapPhase(BaseModel):
    title: str
    duration: str
    topics: List[str]
    projects: List[str]


class RoadmapRecord(BaseModel):
    id: str
    user_id: str
    goal: str
    estimated_duration: str
    phases: List[RoadmapPhase]
    milestones: List[str]
    next_actions: List[str]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
