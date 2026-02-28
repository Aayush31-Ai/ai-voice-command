from __future__ import annotations

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import SummaryResponse
from backend.services.llm_service import LLMConfig, build_llm


def summarize_code(prompt: str, code: str, model: str) -> SummaryResponse:
    llm = build_llm(LLMConfig(model=model, temperature=0.2))
    parser = JsonOutputParser(pydantic_object=SummaryResponse)

    system = """You are a code summarizer for a coding workspace.
Return JSON only in this schema:
{{\"what_it_does\": "...", \"key_components\": "...", \"how_to_extend\": "..."}}
Keep each field concise.
"""
    user = "Request: {prompt}\nCode:\n{code}\n{format_instructions}"
    prompt_tmpl = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user", user),
        ]
    )

    chain = prompt_tmpl | llm | parser
    raw = chain.invoke(
        {
            "prompt": prompt,
            "code": code,
            "format_instructions": parser.get_format_instructions(),
        }
    )
    return SummaryResponse(**raw) if isinstance(raw, dict) else raw
