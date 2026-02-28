from __future__ import annotations

from typing import Optional

from fastapi import Header, HTTPException, status

from backend.db.supabase_client import SupabaseAuthError, verify_jwt


def get_current_user_id(authorization: Optional[str] = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    
    token = authorization.replace("Bearer ", "", 1)
    try:
        payload = verify_jwt(token)
    except SupabaseAuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    return user_id
