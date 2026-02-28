from __future__ import annotations

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.env_loader import load_backend_env
from backend.routers.ai import router as ai_router
from backend.routers.projects import router as projects_router
from backend.routers.learn_books import router as learn_books_router
from backend.routers.roadmap import router as roadmap_router


load_backend_env()

app = FastAPI(title="VoiceForge API")

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)
app.include_router(projects_router)
app.include_router(learn_books_router)
app.include_router(roadmap_router)


@app.get("/health")
async def health_check() -> dict:
    return {"status": "ok"}
