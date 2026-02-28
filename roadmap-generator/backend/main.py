from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from pathlib import Path
import os
import json

# .env is at d:\gen-ai\.env
# main.py is at d:\gen-ai\roadmap-generator\backend\main.py
# Go 3 levels up: backend -> roadmap-generator -> gen-ai
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
)

MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are an expert technical mentor and career architect. Given a user's learning goal, generate a structured JSON roadmap.

Return ONLY a valid JSON object matching this exact schema. Do not include markdown, code fences, or any text outside the JSON:

{
  "goal": "the user's learning goal as a clean short title",
  "estimated_duration": "e.g. 6 months",
  "phases": [
    {
      "title": "Phase name",
      "duration": "e.g. 4 weeks",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "projects": ["Project 1", "Project 2"]
    }
  ],
  "milestones": ["Milestone 1", "Milestone 2", "Milestone 3"],
  "next_actions": ["Action 1", "Action 2", "Action 3"]
}

Rules:
- Include 3-5 phases maximum.
- Each phase must have 3-6 topics and 1-3 projects.
- Include 3-5 milestones total.
- Include 3-5 next_actions.
- All values must be strings, never nested objects or arrays of objects.
- Be industry-aligned and realistic. Prioritize depth over breadth.
- Return valid JSON only, nothing else.
"""


app = FastAPI(title="Roadmap Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GoalRequest(BaseModel):
    goal: str


class FollowUpRequest(BaseModel):
    question: str
    roadmap: dict


def validate_roadmap_schema(data: dict) -> None:
    """Raise HTTPException if the roadmap JSON is missing required fields."""
    required_keys = {"goal", "estimated_duration", "phases", "milestones", "next_actions"}
    missing = required_keys - set(data.keys())
    if missing:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned JSON missing required fields: {missing}"
        )
    if not isinstance(data["phases"], list) or len(data["phases"]) == 0:
        raise HTTPException(status_code=500, detail="'phases' must be a non-empty list")
    for i, phase in enumerate(data["phases"]):
        for field in ("title", "duration", "topics", "projects"):
            if field not in phase:
                raise HTTPException(
                    status_code=500,
                    detail=f"Phase {i} is missing field '{field}'"
                )
    if not isinstance(data["milestones"], list):
        raise HTTPException(status_code=500, detail="'milestones' must be a list")
    if not isinstance(data["next_actions"], list):
        raise HTTPException(status_code=500, detail="'next_actions' must be a list")


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL}


@app.post("/generate-roadmap")
def generate_roadmap(body: GoalRequest):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set. Add it to d:\\gen-ai\\.env"
        )

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Generate a detailed learning roadmap for: {body.goal}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=2048,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    raw = response.choices[0].message.content

    try:
        roadmap = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Model returned invalid JSON: {str(e)}. Raw: {raw[:300]}"
        )

    validate_roadmap_schema(roadmap)
    return roadmap


@app.post("/follow-up")
def follow_up(body: FollowUpRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set")

    roadmap_str = json.dumps(body.roadmap, indent=2)

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a helpful learning assistant. The user has a learning roadmap. "
                        "Answer their question about it clearly and concisely. "
                        "Stay focused and practical. Avoid generic advice."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Here is my learning roadmap:\n\n{roadmap_str}\n\n"
                        f"Question: {body.question}"
                    )
                }
            ],
            temperature=0.7,
            max_tokens=512,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    return {"answer": response.choices[0].message.content}
