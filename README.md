# VoiceForge

VoiceForge is an AI-powered voice coding workspace with three major product surfaces:

1. `Projects` for fast voice-to-code generation and iteration.
2. `Learn Books` for educational code generation with detailed explanations and optional PDF-grounded learning (RAG).
3. `Roadmap Generator` for personalized, persisted learning roadmaps.

It combines:

- Live voice sessions via LiveKit
- LLM workflows (intent -> plan -> code -> summary/debug)
- Supabase auth + per-user data storage
- FastAPI backend APIs
- Next.js frontend workspace UI

## Table of Contents

- [What Makes This Project Different (USPs)](#what-makes-this-project-different-usps)
- [Core Features](#core-features)
- [Monorepo Structure](#monorepo-structure)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Run Locally (Step-by-Step)](#run-locally-step-by-step)
- [How To Use the App](#how-to-use-the-app)
- [API Reference](#api-reference)
- [AI Pipeline Details](#ai-pipeline-details)
- [Voice Agent Details](#voice-agent-details)
- [Security Model](#security-model)
- [Legacy/Standalone Roadmap Generator Folder](#legacystandalone-roadmap-generator-folder)
- [Troubleshooting](#troubleshooting)
- [Production Deployment Notes](#production-deployment-notes)
- [Current Limitations](#current-limitations)
- [Contributing](#contributing)

## What Makes This Project Different (USPs)

- Voice-first coding workflow: You can speak requests, receive code back in-editor, and iterate conversationally.
- Two-mode AI system:
  - Build mode (`Projects`): generate/debug/explain/run coding flow.
  - Learn mode (`Learn Books`): educational code plus deep explanation + concepts.
- Real persistence: projects, learn books, and roadmaps are stored per authenticated user in Supabase.
- PDF-grounded learning in Learn mode: attach a PDF, index it in Qdrant, and generate responses grounded in that source context.
- Practical guardrails for execution: Python code runs in a restricted subprocess sandbox with banned imports and risky builtins blocked.
- Visual roadmap planner included: generate structured learning roadmaps and ask contextual follow-up questions.

## Core Features

- Authentication (signup/login/logout) using Supabase.
- Dashboard with:
  - Project management
  - Learn Book management
  - Quick entry to Roadmap Generator
- Voice coding workspace:
  - Monaco editor
  - LiveKit audio session
  - Agent-driven code generation/debug/explain
  - Auto-save project code
  - Run Python code (sandboxed)
  - HTML live preview path
  - ZIP export
- Learn workspace:
  - Agent-driven educational code generation
  - Detailed explanation, step-by-step flow, key concepts
  - Optional PDF upload for RAG grounding
  - Auto-save learn book code
  - ZIP export
- Roadmap module:
  - Generate roadmap from a goal
  - Save/list/load/delete roadmaps
  - Ask follow-up questions on an existing roadmap

## Monorepo Structure

```text
ai-voice-command/
├─ backend/                         # FastAPI APIs + LangGraph workflow + LiveKit agent
│  ├─ main.py                       # FastAPI app entry
│  ├─ agent.py                      # LiveKit voice agent process
│  ├─ routers/                      # API endpoints (ai/projects/learn-books/roadmap)
│  ├─ services/                     # LLM, execution sandbox, RAG, auth helpers
│  ├─ graph/workflow.py             # Intent/plan/code/summary/debug workflow helpers
│  ├─ models/schemas.py             # Pydantic request/response schemas
│  └─ db/migrations/                # Supabase SQL migrations
├─ frontend/agent-starter-react/    # Next.js 15 frontend
│  ├─ app/                          # Routes (home/login/signup/dashboard/workspace/roadmap)
│  ├─ components/                   # Workspace and UI components
│  ├─ hooks/                        # Session/debug/download hooks
│  └─ lib/                          # API clients + Supabase + LiveKit helpers
└─ roadmap-generator/               # Legacy standalone roadmap prototype (optional)
```

## Architecture Overview

1. User authenticates in frontend via Supabase.
2. Frontend gets a Supabase access token (JWT).
3. Frontend calls backend endpoints with `Authorization: Bearer <token>`.
4. Backend verifies JWT using Supabase JWKS and derives `user_id`.
5. Backend executes AI workflow and/or DB operations scoped to that user.
6. Voice sessions are handled by LiveKit:
   - Frontend connects to LiveKit room using `/api/connection-details`.
   - `backend/agent.py` joins as an agent and handles voice tool actions.
7. Agent sends generated results back via LiveKit data channels:
   - `code_result` for standard workspace
   - `learn_code_result` for learn workspace

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind, Monaco, LiveKit UI components
- Backend: FastAPI, LangGraph/LangChain, Groq-compatible Chat API, Pydantic
- Voice Transport: LiveKit
- Auth + DB: Supabase
- Vector DB (Learn PDF RAG): Qdrant
- Embeddings for RAG: Ollama embeddings (`langchain-ollama`)

## Prerequisites

- Node.js 20+ (recommended for Next.js 15)
- pnpm (project uses `pnpm@9.15.9`)
- Python 3.14+ is declared in backend `pyproject.toml`
- Supabase project
- LiveKit credentials (`LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL`)
- Groq API key (`GROQ_API_KEY`)
- Optional for Learn PDF RAG:
  - Qdrant cloud URL + key
  - Ollama embedding model available locally/remotely

## Environment Variables

Create these files:

- `backend/.env.local`
- `frontend/agent-starter-react/.env.local` (copy from `.env.example`)

### Backend `.env.local`

```env
# LLM
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
# Optional fallback if not using service role
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_AUD=authenticated

# CORS
CORS_ORIGINS=http://localhost:3000

# LiveKit (used by backend agent process)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project-subdomain.livekit.cloud

# Learn PDF RAG (optional but required for PDF indexing)
QDRANT_URL=https://your-qdrant-endpoint
QDRANT_API_KEY=your-qdrant-api-key
OLLAMA_EMBED_MODEL=nomic-embed-text-v2-moe:latest
```

### Frontend `.env.local`

```env
# LiveKit (required by app/api/connection-details route)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project-subdomain.livekit.cloud

# Optional explicit dispatch (matches backend agent_name)
AGENT_NAME=my-agent

# Supabase (public values)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API base URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Optional sandbox-mode variables used by starter template
NEXT_PUBLIC_APP_CONFIG_ENDPOINT=
SANDBOX_ID=
NEXT_PUBLIC_CONN_DETAILS_ENDPOINT=
```

## Database Setup (Supabase)

Run these SQL files in Supabase SQL Editor in order:

1. `backend/db/migrations/001_create_projects.sql`
2. `backend/db/migrations/002_create_learn_books.sql`
3. `backend/db/migrations/003_create_roadmaps.sql`

These migrations create:

- `projects`
- `learn_books`
- `roadmaps`

Each table has:

- `user_id` foreign key to `auth.users(id)`
- Row Level Security policies for per-user isolation
- indexes for user-scoped lookups
- update timestamp triggers

## Run Locally (Step-by-Step)

### 1. Install frontend dependencies

```bash
cd frontend/agent-starter-react
pnpm install
```

### 2. Install backend dependencies

From repo root you can use pip:

```bash
python -m venv backend/.venv
backend/.venv/Scripts/activate    # Windows PowerShell
pip install -r backend/requirements.txt
```

Or use your preferred Python environment manager.

### 3. Start backend API (terminal A)

From repo root:

```bash
backend/.venv/Scripts/python.exe -m uvicorn backend.main:app --reload --port 8000
```

Health check:

```bash
curl http://localhost:8000/health
```

### 4. Start LiveKit voice agent (terminal B)

```bash
cd backend
../backend/.venv/Scripts/python.exe agent.py dev
```

If you use a different Python environment, adjust the executable path accordingly.

### 5. Start frontend (terminal C)

```bash
cd frontend/agent-starter-react
pnpm dev
```

Open:

- `http://localhost:3000`

### 6. Verify end-to-end

1. Sign up or log in.
2. Create a project from Dashboard.
3. Open workspace and connect/start audio.
4. Ask voice prompt like: "Build a Python todo list script."
5. Confirm generated code appears in editor and run output is shown.

## How To Use the App

### Home + Auth

- `/` landing page
- `/signup` creates account via Supabase auth
- `/login` signs in with email/password

### Dashboard

- `/dashboard`
- Tabs:
  - `Projects`
  - `Learn Books`
- Create Project:
  - Name + language
  - Opens voice coding workspace
- Create Learn Book:
  - Name/description/language
  - Optional PDF upload and indexing
  - Opens educational workspace

### Project Workspace

- Route: `/workspace/[projectId]`
- Main behaviors:
  - loads project code/language
  - auto-saves edits
  - pushes editor context to agent
  - handles `code_result` responses from agent
  - auto-runs Python code on generation
  - shows summaries and outputs

### Learn Workspace

- Route: `/learn-books/[bookId]`
- Main behaviors:
  - loads learn book code/language
  - auto-saves edits
  - pushes `learn_book_context` + `editor_context`
  - handles `learn_code_result` payload
  - shows explanation, steps, key concepts
  - optional PDF upload for RAG

### Roadmap Generator

- Route: `/roadmap`
- Supports:
  - roadmap generation from goal
  - saved roadmap sidebar
  - deletion
  - follow-up Q&A grounded in current roadmap JSON

## API Reference

All backend routes require:

- `Authorization: Bearer <supabase_access_token>`

### Health

- `GET /health`

### AI Routes

- `POST /ai/process`
  - body: `{ "prompt": "...", "stage": "plan" | "generate" }`
- `POST /ai/run`
  - body: `{ "code": "..." }`

### Projects

- `GET /projects`
- `GET /projects/{project_id}`
- `POST /projects`
- `PUT /projects/{project_id}`

### Learn Books

- `GET /learn-books`
- `GET /learn-books/{book_id}`
- `POST /learn-books`
- `PUT /learn-books/{book_id}`
- `DELETE /learn-books/{book_id}`
- `POST /learn-books/{book_id}/upload-pdf` (multipart form with `file`)
- `POST /learn-books/{book_id}/ai/process`

### Roadmap

- `POST /roadmap/generate`
- `GET /roadmap/list`
- `GET /roadmap/{roadmap_id}`
- `DELETE /roadmap/{roadmap_id}`
- `POST /roadmap/follow-up`

## AI Pipeline Details

Core backend pipeline is in `backend/graph/workflow.py`.

### Plan stage

1. Classify intent (`generate|debug|explain|run|refactor`)
2. Build short implementation plan + language (`python|html`)

### Generate stage

1. Detect language (heuristic if no pre-plan provided)
2. Generate raw code
3. Generate concise summary:
   - what it does
   - key components
   - extension ideas

### Debug stage

- Uses existing code + optional error message
- Returns:
  - issue summary
  - fixed code

### Learn mode stage

- Generates:
  - code
  - detailed explanation
  - step-by-step logic
  - key concepts list
- If PDF collection exists, fetches top context chunks from Qdrant and injects as RAG context.

## Voice Agent Details

File: `backend/agent.py`

Agent instructions enforce one action per user turn. Tool mapping:

- Generate request -> `generate_code`
- Explain request -> `get_editor_code`
- Debug request -> `debug_code`
- Learn request -> `generate_learn_code`

Data channel topics:

- Frontend -> agent:
  - `editor_context`
  - `learn_book_context`
- Agent -> frontend:
  - `code_result`
  - `learn_code_result`

LiveKit session currently configures:

- STT: `deepgram/nova-3:multi`
- LLM: `gemini-2.5-flash` (for conversational tool orchestration)
- TTS: `cartesia/sonic-3:...`
- VAD + turn detection enabled

## Security Model

- API authentication:
  - backend verifies Supabase JWT with JWKS
- Data isolation:
  - row-level security policies in Supabase migrations
- Python execution hardening (`backend/services/execution_service.py`):
  - AST checks for banned modules/imports
  - blocks risky builtins (`open`, `eval`, `exec`, `compile`, `__import__`)
  - executes code in temp directory subprocess with timeout
- CORS:
  - controlled by `CORS_ORIGINS`

## Legacy/Standalone Roadmap Generator Folder

`roadmap-generator/` is a separate older prototype (FastAPI + Vite) for roadmap generation only.

Use the integrated roadmap feature in the main app (`/roadmap`) for primary workflows.

Run standalone prototype only if needed:

```bash
# backend
cd roadmap-generator/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8001

# frontend
cd roadmap-generator/frontend
npm install
npm run dev
```

## Troubleshooting

### 1) `401 Missing token` or `Token verification failed`

- Ensure frontend is logged in.
- Ensure backend gets `Authorization: Bearer <token>`.
- Verify `SUPABASE_URL` and JWT audience (`SUPABASE_JWT_AUD`) are correct.

### 2) Frontend loads but voice session fails

- Check `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` in frontend `.env.local`.
- Ensure `backend/agent.py` is running.
- If using explicit dispatch, set `AGENT_NAME=my-agent` and confirm agent uses same name.

### 3) PDF upload/indexing fails

- Verify `QDRANT_URL` and `QDRANT_API_KEY`.
- Ensure embedding model is available for Ollama (`OLLAMA_EMBED_MODEL`).
- Check backend logs for RAG service exceptions.

### 4) Python code execution blocked

- Sandbox blocks filesystem/process/network/system-level operations.
- Ask the assistant to regenerate code without restricted imports/usages.

### 5) CORS errors

- Set backend `CORS_ORIGINS` to include frontend origin (default `http://localhost:3000`).

### 6) Supabase warnings in browser console

- Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.

## Production Deployment Notes

- Deploy frontend and backend separately.
- Use HTTPS endpoints and secure environment variable management.
- Lock down CORS to real domain(s).
- Rotate API keys and avoid exposing service-role credentials in frontend.
- Scale agent process and backend independently.
- Add centralized logging/metrics for API and agent reliability.

## Current Limitations

- Backend `projects` router currently does not expose a delete endpoint (frontend API helper includes one but dashboard flow does not rely on it).
- Language support in core generate/debug pipeline is focused on `python` and `html`.
- Python version requirement in backend config is declared as `>=3.14`; align this with your runtime strategy before production rollout.
- Roadmap generation quality depends on LLM output consistency and JSON adherence.

## Contributing

1. Fork and create a feature branch.
2. Keep changes scoped and test both frontend/backend paths.
3. Update docs/migrations when behavior changes.
4. Open a PR with:
   - problem statement
   - implementation summary
   - screenshots or API examples when applicable

