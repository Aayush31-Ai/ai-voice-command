from __future__ import annotations

import json
import os
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAI
from pydantic import BaseModel

from backend.db.supabase_client import get_supabase_client
from backend.env_loader import load_backend_env
from backend.models.schemas import RoadmapRecord
from backend.services.auth_service import get_current_user_id

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

SYSTEM_PROMPT = """You are a highly qualified technical mentor and career architect with 15+ years of industry experience.

You must design structured, realistic, and actionable learning roadmaps tailored to user goals.
Your output must be structured, logical, and visual-ready.

Do NOT output markdown formatting.
Do NOT output generic advice.
Return structured JSON only.

Return ONLY a valid JSON object matching this exact schema. Do not include markdown, code fences, or any text outside the JSON:

{
  "goal": "the user's learning goal as a clean short title",
  "estimated_duration": "e.g. 6-9 months",
  "phases": [
    {
      "title": "Phase name",
      "duration": "e.g. 1-2 months",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "projects": ["Project 1", "Project 2"]
    }
  ],
  "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
  "next_actions": ["Action 1", "Action 2", "Action 3"]
}

STRUCTURE RULES:
- Maximum 5 phases.
- Each phase must include: duration, topics (3-6 items), practical projects (1-3 items).
- Include 3-5 milestones total.
- Include 3-5 next_actions.
- Avoid overwhelming lists. Prioritize depth over breadth.
- Keep roadmap industry-aligned.
- All values must be strings, never nested objects or arrays of objects.
- Be industry-aligned and realistic.
- Return valid JSON only, nothing else.
"""


def _get_client() -> OpenAI:
    load_backend_env()
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set in environment")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")


def _get_model() -> str:
    # Groq model for roadmap generation — fall back to a known Groq model if
    # the configured GROQ_MODEL is an OpenAI model name.
    configured = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
    # The Groq API does not accept "openai/gpt-oss-20b" style names; use a safe default.
    if configured.startswith("openai/"):
        return "llama-3.3-70b-versatile"
    return configured


def _validate_roadmap_schema(data: dict) -> None:
    required_keys = {"goal", "estimated_duration", "phases", "milestones", "next_actions"}
    missing = required_keys - set(data.keys())
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned JSON missing required fields: {missing}",
        )
    if not isinstance(data["phases"], list) or len(data["phases"]) == 0:
        raise HTTPException(status_code=500, detail="'phases' must be a non-empty list")
    for i, phase in enumerate(data["phases"]):
        for field in ("title", "duration", "topics", "projects"):
            if field not in phase:
                raise HTTPException(
                    status_code=500,
                    detail=f"Phase {i} is missing field '{field}'",
                )
    if not isinstance(data["milestones"], list):
        raise HTTPException(status_code=500, detail="'milestones' must be a list")
    if not isinstance(data["next_actions"], list):
        raise HTTPException(status_code=500, detail="'next_actions' must be a list")


class GoalRequest(BaseModel):
    goal: str


class FollowUpRequest(BaseModel):
    question: str
    roadmap: dict


@router.post("/generate", response_model=RoadmapRecord, status_code=status.HTTP_201_CREATED)
async def generate_roadmap(
    body: GoalRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Generate a structured learning roadmap and save it to the database."""
    llm = _get_client()
    model = _get_model()

    try:
        response = llm.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Generate a detailed learning roadmap for: {body.goal}",
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=2048,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    raw = response.choices[0].message.content

    try:
        roadmap = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned invalid JSON: {exc}. Raw: {raw[:300]}",
        ) from exc

    _validate_roadmap_schema(roadmap)

    # Persist to Supabase
    db = get_supabase_client()
    record = {
        "user_id": user_id,
        "goal": roadmap["goal"],
        "estimated_duration": roadmap.get("estimated_duration", ""),
        "phases": roadmap["phases"],
        "milestones": roadmap["milestones"],
        "next_actions": roadmap["next_actions"],
    }
    try:
        db_response = db.table("roadmaps").insert(record).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save roadmap: {exc}") from exc

    if not db_response.data:
        raise HTTPException(status_code=500, detail="Roadmap insert returned no data")

    return db_response.data[0]


# ── List saved roadmaps ───────────────────────────────────────────────────────

@router.get("/list", response_model=List[RoadmapRecord])
async def list_roadmaps(user_id: str = Depends(get_current_user_id)) -> list:
    """Return all roadmaps for the authenticated user, newest first."""
    db = get_supabase_client()
    try:
        db_response = (
            db.table("roadmaps")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return db_response.data or []


# ── Get single roadmap ────────────────────────────────────────────────────────

@router.get("/{roadmap_id}", response_model=RoadmapRecord)
async def get_roadmap(
    roadmap_id: str,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Return a single roadmap by ID (must belong to the authenticated user)."""
    db = get_supabase_client()
    try:
        db_response = (
            db.table("roadmaps")
            .select("*")
            .eq("id", roadmap_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if not db_response.data:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    return db_response.data


# ── Delete roadmap ────────────────────────────────────────────────────────────

@router.delete("/{roadmap_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap(
    roadmap_id: str,
    user_id: str = Depends(get_current_user_id),
) -> None:
    """Delete a roadmap owned by the authenticated user."""
    db = get_supabase_client()
    try:
        db.table("roadmaps").delete().eq("id", roadmap_id).eq("user_id", user_id).execute()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ── Follow-up Q&A ─────────────────────────────────────────────────────────────

@router.post("/follow-up")
async def follow_up(
    body: FollowUpRequest,
    user_id: str = Depends(get_current_user_id),
) -> dict:
    """Answer a follow-up question in the context of an existing roadmap."""
    _ = user_id
    llm = _get_client()
    model = _get_model()

    roadmap_str = json.dumps(body.roadmap, indent=2)

    try:
        response = llm.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful learning assistant. The user has a learning roadmap. "
                        "Answer their question about it clearly and concisely. "
                        "Stay focused and practical. Avoid generic advice."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Here is my learning roadmap:\n\n{roadmap_str}\n\n"
                        f"Question: {body.question}"
                    ),
                },
            ],
            temperature=0.7,
            max_tokens=512,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Groq API error: {exc}") from exc

    return {"answer": response.choices[0].message.content}
