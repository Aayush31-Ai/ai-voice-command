from __future__ import annotations

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import DebugResponse, LanguageType
from backend.services.llm_service import LLMConfig, build_llm

# Keep in sync with execution_service._BANNED_MODULES
_SANDBOX_BANNED = (
    "os", "sys", "pathlib", "shutil", "subprocess",
    "socket", "io", "tempfile", "glob", "fnmatch",
    "pty", "tty", "fcntl", "signal", "resource",
    "ctypes", "multiprocessing", "threading",
)


def debug_code(
    code: str,
    language: LanguageType,
    error_message: str,
    model: str,
) -> DebugResponse:
    """Analyse buggy code, then return a fixed version and a plain-English summary."""
    llm = build_llm(LLMConfig(model=model, temperature=0.1))
    parser = JsonOutputParser(pydantic_object=DebugResponse)

    banned_list = ", ".join(_SANDBOX_BANNED)
    system = f"""You are an expert debugger working inside a sandboxed Python runner.

RULES:
1. Identify all bugs and explain them briefly in `issue_summary`.
2. Return the fully FIXED code in `fixed_code`.
3. The fixed code MUST NOT import or use these banned modules: {banned_list}
4. Do NOT use `import sys`, `sys.argv`, `os.path`, `open()`, `Path()`, or any file/process operation.
5. Demonstrate any functions with a direct `print()` call \u2014 not via command-line arguments.
6. `fixed_code` must be raw runnable code with NO markdown fences.
7. Return JSON only.
"""
    user = (
        "Language: {language}\n"
        "Error/symptom: {error_message}\n\n"
        "Buggy code:\n{code}\n\n"
        "{format_instructions}"
    )

    prompt_tmpl = ChatPromptTemplate.from_messages(
        [("system", system), ("user", user)]
    )

    chain = prompt_tmpl | llm | parser
    raw = chain.invoke(
        {
            "language": language.value,
            "error_message": error_message or "No specific error \u2014 review for bugs.",
            "code": code,
            "format_instructions": parser.get_format_instructions(),
        }
    )
    result = DebugResponse(**raw) if isinstance(raw, dict) else raw
    # Back-fill the language field (it comes from outside LLM output)
    if not result.language:
        result = result.model_copy(update={"language": language})
    return result
