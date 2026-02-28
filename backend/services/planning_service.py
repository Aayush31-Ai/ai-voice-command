from __future__ import annotations

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import PlanResponse
from backend.services.llm_service import LLMConfig, build_llm


def build_plan(prompt: str, model: str) -> PlanResponse:
    llm = build_llm(LLMConfig(model=model, temperature=0.1))
    parser = JsonOutputParser(pydantic_object=PlanResponse)

    system = """You are a planning assistant for a voice-driven coding workspace.
Return JSON only in this schema:
{{\"language\": \"python|html\", \"plan\": [\"Step 1\", \"Step 2\"], \"approach\": \"short approach\"}}
Identify the best language for the task. Keep plan steps concise.
"""
    user = "Create a short plan for this request:\n{prompt}\n{format_instructions}"
    prompt_tmpl = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user", user),
        ]
    )

    chain = prompt_tmpl | llm | parser
    raw = chain.invoke({"prompt": prompt, "format_instructions": parser.get_format_instructions()})
    # JsonOutputParser returns a dict; coerce to PlanResponse
    return PlanResponse(**raw) if isinstance(raw, dict) else raw
