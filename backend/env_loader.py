from __future__ import annotations

import os
from pathlib import Path

from dotenv import dotenv_values

_LOADED = False


def _set_if_missing_or_blank(key: str, value: str | None) -> None:
    if value is None:
        return
    current = os.environ.get(key)
    if current is None or not current.strip():
        os.environ[key] = value


def load_backend_env() -> None:
    """Load backend env files once, regardless of current working directory."""
    global _LOADED
    if _LOADED:
        return

    backend_dir = Path(__file__).resolve().parent
    candidates = [
        backend_dir / ".env.local",
        backend_dir / ".env",
        backend_dir.parent / ".env.local",
        backend_dir.parent / ".env",
    ]

    for env_path in candidates:
        if env_path.exists():
            values = dotenv_values(env_path)
            for key, value in values.items():
                _set_if_missing_or_blank(key, value)

    # Backward-compatible alias for plugins that expect GOOGLE_API_KEY.
    if not os.environ.get("GOOGLE_API_KEY") and os.environ.get("GEMINI_API_KEY"):
        os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

    _LOADED = True
