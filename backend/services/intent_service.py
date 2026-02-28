from __future__ import annotations

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import IntentResponse
from backend.services.llm_service import LLMConfig, build_llm


def classify_intent(prompt: str, model: str) -> IntentResponse:
    llm = build_llm(LLMConfig(model=model, temperature=0))
    parser = JsonOutputParser(pydantic_object=IntentResponse)

    system = """You are an intent classifier for a coding assistant.
Return JSON only matching this schema:
{{\"intent\": \"generate|debug|explain|run|refactor\"}}
"""
    user = "Classify the intent for this request:\n{prompt}\n{format_instructions}"
    prompt_tmpl = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user", user),
        ]
    )

    chain = prompt_tmpl | llm | parser
    raw = chain.invoke({"prompt": prompt, "format_instructions": parser.get_format_instructions()})
    return IntentResponse(**raw) if isinstance(raw, dict) else raw
