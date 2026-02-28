from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from langchain_groq import ChatGroq

from backend.env_loader import load_backend_env


@dataclass(frozen=True)
class LLMConfig:
    model: str
    temperature: float = 0.2
    max_tokens: Optional[int] = None


def build_llm(config: LLMConfig) -> ChatGroq:
    load_backend_env()
    return ChatGroq(
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
    )
