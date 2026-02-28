from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from backend.db.supabase_client import get_supabase_client
from backend.models.schemas import ProjectCreate, ProjectRecord, ProjectUpdate
from backend.services.auth_service import get_current_user_id


def _get_supabase():
    """Returns supabase client."""
    return get_supabase_client()

router = APIRouter(prefix="/projects", tags=["projects"])


def _handle_db_error(error: Exception) -> None:
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(error))


@router.get("", response_model=List[ProjectRecord])
async def list_projects(user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        return []
    try:
        response = client.table("projects").select("*").eq("user_id", user_id).execute()
    except Exception as exc:
        _handle_db_error(exc)
    return response.data or []


@router.get("/{project_id}", response_model=ProjectRecord)
async def get_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    try:
        response = (
            client.table("projects")
            .select("*")
            .eq("id", project_id)
            .eq("user_id", user_id)
            .single()
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return response.data


@router.post("", response_model=ProjectRecord, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectCreate, user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured")
    record = payload.model_dump()
    record["user_id"] = user_id
    try:
        response = client.table("projects").insert(record).execute()
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Insert failed")
    return response.data[0]


@router.put("/{project_id}", response_model=ProjectRecord)
async def update_project(
    project_id: str, payload: ProjectUpdate, user_id: str = Depends(get_current_user_id)
):
    client = _get_supabase()
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured")
    changes = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not changes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No updates provided")
    try:
        response = (
            client.table("projects")
            .update(changes)
            .eq("id", project_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        _handle_db_error(exc)
    if not response.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return response.data[0]


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(project_id: str, user_id: str = Depends(get_current_user_id)):
    client = _get_supabase()
    if client is None:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Database not configured")
    try:
        client.table("projects").delete().eq("id", project_id).eq("user_id", user_id).execute()
    except Exception as exc:
        _handle_db_error(exc)
