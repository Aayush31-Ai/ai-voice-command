# VoiceForge Backend

FastAPI + LangGraph backend for the VoiceForge intelligent voice coding workspace.

## Structure

```
backend/
├── main.py               # FastAPI app bootstrap + router registration
├── agent.py              # LiveKit voice agent (input-only transcription)
├── routers/
│   ├── ai.py             # POST /ai/process, POST /ai/run
│   └── projects.py       # GET|POST|PUT /projects
├── services/
│   ├── llm_service.py    # ChatGroq factory
│   ├── intent_service.py # Classify intent (generate/debug/explain/run/refactor)
│   ├── planning_service.py  # Build a step-by-step plan + language detection
│   ├── codegen_service.py   # Generate raw code
│   ├── summary_service.py   # Summarize generated code
│   ├── execution_service.py # Execute Python in a sandboxed subprocess
│   └── auth_service.py      # JWT auth via Supabase JWKS
├── graph/
│   └── workflow.py       # LangGraph workflow (intent→plan→code→summary)
├── models/
│   └── schemas.py        # Pydantic request/response models
├── db/
│   ├── supabase_client.py    # Supabase service client + JWT verification
│   └── migrations/
│       └── 001_create_projects.sql   # Run in Supabase SQL Editor
```

## Setup

1. Copy `.env.local` and fill in your keys:
   - `GROQ_API_KEY` (from console.groq.com)
   - `GROQ_MODEL` (default: `llama-3.1-70b-versatile`)
   - `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
   - `LIVEKIT_*` keys (already present)

2. Run the Supabase migration `db/migrations/001_create_projects.sql` in your project's SQL Editor.

3. Start the server:

```bash
# From workspace root (d:/ai-voice-command)
backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload --port 8000
```

4. Start the LiveKit agent separately:
```bash
cd backend && .venv/Scripts/python.exe agent.py dev
```

## API Summary

| Endpoint              | Method | Description                              |
|-----------------------|--------|------------------------------------------|
| `/health`             | GET    | Health check                             |
| `/ai/process`         | POST   | Plan (stage=plan) or generate (stage=generate) |
| `/ai/run`             | POST   | Run Python code in sandbox               |
| `/projects`           | GET    | List user projects                       |
| `/projects`           | POST   | Create project                           |
| `/projects/{id}`      | GET    | Get project                              |
| `/projects/{id}`      | PUT    | Update project                           |

All endpoints require `Authorization: Bearer <supabase-access-token>`.
