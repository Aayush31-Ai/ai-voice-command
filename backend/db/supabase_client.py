from __future__ import annotations

import os
from typing import Any, Dict

import httpx
from supabase import Client, create_client
from jose import jwt


class SupabaseAuthError(Exception):
    pass


def _jwks_url() -> str:
    project_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    if not project_url:
        raise SupabaseAuthError("SUPABASE_URL is not configured")
    return f"{project_url}/auth/v1/.well-known/jwks.json"


def _audience() -> str:
    return os.environ.get("SUPABASE_JWT_AUD", "authenticated")


def fetch_jwks() -> Dict[str, Any]:
    with httpx.Client(timeout=5) as client:
        response = client.get(_jwks_url())
        response.raise_for_status()
        return response.json()


def verify_jwt(token: str) -> Dict[str, Any]:
    jwks = fetch_jwks()
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.JWTError as exc:
        raise SupabaseAuthError("Invalid token header") from exc

    key_id = unverified_header.get("kid")
    if not key_id:
        raise SupabaseAuthError("Token missing key id")

    keys = jwks.get("keys", [])
    public_keys = {k.get("kid"): k for k in keys if k.get("kid")}
    if key_id not in public_keys:
        raise SupabaseAuthError("Token key id not found")

    try:
        return jwt.decode(
            token,
            public_keys[key_id],
            algorithms=[unverified_header.get("alg", "RS256")],
            audience=_audience(),
            options={"verify_at_hash": False},
        )
    except jwt.JWTError as exc:
        raise SupabaseAuthError("Token verification failed") from exc


def get_supabase_client(access_token: str | None = None) -> Client:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    # Prefer service role key (bypasses RLS); fall back to anon key for local dev.
    key = (
        os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.environ.get("SUPABASE_ANON_KEY")
        or ""
    )
    if not url or not key:
        raise SupabaseAuthError("Supabase URL or service role key not configured")
    client = create_client(url, key)
    # If we have a user access token and are not using the service role key,
    # authenticate the PostgREST client so RLS is applied correctly.
    if access_token and not os.environ.get("SUPABASE_SERVICE_ROLE_KEY"):
        client.postgrest.auth(access_token)
    return client
