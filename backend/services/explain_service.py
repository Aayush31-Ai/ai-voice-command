from __future__ import annotations

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import AssistantSummaryContent
from backend.services.llm_service import LLMConfig, build_llm


def explain_code_as_summary(code: str, language: str, model: str) -> AssistantSummaryContent:
    llm = build_llm(LLMConfig(model=model, temperature=0.2))
    parser = JsonOutputParser(pydantic_object=AssistantSummaryContent)

    system = """You are a senior software engineer explaining code.
Return JSON only in this schema:
{"what_it_does":"...", "components":"...", "flow":"..."}

Rules:
- Keep each field concise and practical.
- Do not include markdown, code fences, or extra keys.
"""
    user = (
        "Language: {language}\n"
        "Code:\n{code}\n\n"
        "{format_instructions}"
    )
    prompt_tmpl = ChatPromptTemplate.from_messages(
        [("system", system), ("user", user)]
    )

    chain = prompt_tmpl | llm | parser
    raw = chain.invoke(
        {
            "language": language,
            "code": code,
            "format_instructions": parser.get_format_instructions(),
        }
    )
    return AssistantSummaryContent(**raw) if isinstance(raw, dict) else raw
