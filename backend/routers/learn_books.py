"""
learn_books.py — REST router for Learn Books (CRUD + PDF upload + AI generation).

All routes are protected by Supabase JWT authentication.
"""
from __future__ import annotations

import io
import logging
import os
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.db.supabase_client import get_supabase_client
from backend.models.schemas import (
    LearnAIProcessResponse,
    LearnBookCreate,
    LearnBookRecord,
    LearnBookUpdate,
    PdfUploadResponse,
    PlanStage,
)
from backend.services.auth_service import get_current_user_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/learn-books", tags=["learn-books"])


def _get_supabase():
    return get_supabase_client()


def _handle_db_error(error: Exception) -> None:
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error)
    )


def _get_model() -> str:
    return os.environ.get("GROQ_MODEL", "llama-3.1-70b-versatile")


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=List[LearnBookRecord])
async def list_books(user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        return []
    try:
        response = (
            client.table("learn_books")
            .select("*")
            .eq("user_id", user_id)
            .order("updated_at", desc=True)
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    return response.data or []


@router.get("/{book_id}", response_model=LearnBookRecord)
async def get_book(book_id: str, user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    try:
        response = (
            client.table("learn_books")
            .select("*")
            .eq("id", book_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return response.data


@router.post("", response_model=LearnBookRecord, status_code=status.HTTP_201_CREATED)
async def create_book(
    payload: LearnBookCreate, user_id: str = Depends(get_current_user_id)
):
    client = _get_supabase()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )
    record = payload.model_dump()
    record["user_id"] = user_id
    try:
        response = client.table("learn_books").insert(record).execute()
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Insert failed"
        )
    return response.data[0]


@router.put("/{book_id}", response_model=LearnBookRecord)
async def update_book(
    book_id: str,
    payload: LearnBookUpdate,
    user_id: str = Depends(get_current_user_id),
):
    client = _get_supabase()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No updates provided"
        )
    try:
        response = (
            client.table("learn_books")
            .update(changes)
            .eq("id", book_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")
    return response.data[0]


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str, user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )
    # Fetch the book first so we can clean up the Qdrant collection
    try:
        resp = (
            client.table("learn_books")
            .select("has_pdf,pdf_collection_name")
            .eq("id", book_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)

    if resp.data and resp.data.get("has_pdf") and resp.data.get("pdf_collection_name"):
        try:
            from backend.services.rag_service import delete_collection
            delete_collection(resp.data["pdf_collection_name"])
        except Exception as exc:
            logger.warning("Could not delete Qdrant collection: %s", exc)

    try:
        client.table("learn_books").delete().eq("id", book_id).eq("user_id", user_id).execute()
    except Exception as exc:
        _handle_db_error(exc)


# ── PDF Upload ────────────────────────────────────────────────────────────────

@router.post("/{book_id}/upload-pdf", response_model=PdfUploadResponse)
async def upload_pdf(
    book_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Accept a PDF upload, chunk it, and index it into Qdrant cloud."""
    if not file.content_type or "pdf" not in file.content_type.lower():
        # Also allow octet-stream uploads from some browsers
        if file.filename and not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF files are accepted.",
            )

    client = _get_supabase()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Ensure the book belongs to this user
    try:
        resp = (
            client.table("learn_books")
            .select("id")
            .eq("id", book_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    if not resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    pdf_bytes = await file.read()
    collection_name = f"learn-book-{book_id}"

    try:
        from backend.services.rag_service import index_pdf
        chunks_indexed = index_pdf(pdf_bytes, collection_name)
    except Exception as exc:
        logger.error("PDF indexing failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF indexing failed: {exc}",
        )

    # Update the book record to mark it has a PDF
    try:
        client.table("learn_books").update(
            {"has_pdf": True, "pdf_collection_name": collection_name}
        ).eq("id", book_id).eq("user_id", user_id).execute()
    except Exception as exc:
        _handle_db_error(exc)

    return PdfUploadResponse(collection_name=collection_name, chunks_indexed=chunks_indexed)


# ── AI Generation ─────────────────────────────────────────────────────────────

@router.post("/{book_id}/ai/process", response_model=LearnAIProcessResponse)
async def ai_process(
    book_id: str,
    payload: dict,
    user_id: str = Depends(get_current_user_id),
):
    """
    Two-stage educational AI endpoint.

    stage=plan  → intent classification + plan (same as /ai/process)
    stage=generate → educational code + deep explanation (optionally RAG-grounded)
    """
    prompt: str = payload.get("prompt", "").strip()
    stage: str = payload.get("stage", "generate")

    if not prompt:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="prompt is required")

    model_name = _get_model()

    if stage == "plan":
        from backend.graph.workflow import run_plan_only
        intent, plan = run_plan_only(prompt, model_name)
        return LearnAIProcessResponse(intent=intent.intent, plan=plan)

    # ── Generate stage ────────────────────────────────────────────────────────
    client = _get_supabase()
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured",
        )

    # Load the book to check for PDF
    try:
        book_resp = (
            client.table("learn_books")
            .select("has_pdf,pdf_collection_name")
            .eq("id", book_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)

    if not book_resp.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found")

    book = book_resp.data
    rag_context: Optional[str] = None
    rag_sources: Optional[list] = None

    if book.get("has_pdf") and book.get("pdf_collection_name"):
        try:
            from backend.services.rag_service import search_context
            rag_context, rag_sources = search_context(
                prompt, book["pdf_collection_name"], k=3
            )
        except Exception as exc:
            logger.warning("RAG search failed, continuing without context: %s", exc)
            rag_context = None
            rag_sources = None

    from backend.services.llm_service import LLMConfig, build_llm
    from backend.services.learn_codegen_service import generate_educational_code

    llm = build_llm(LLMConfig(model=model_name, temperature=0.3, max_tokens=4096))

    try:
        learn_response = generate_educational_code(
            prompt=prompt,
            model=llm,
            rag_context=rag_context,
            rag_sources=rag_sources,
        )
    except Exception as exc:
        logger.error("Educational codegen error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Code generation failed: {exc}",
        )

    return LearnAIProcessResponse(intent="generate", learn_response=learn_response)
