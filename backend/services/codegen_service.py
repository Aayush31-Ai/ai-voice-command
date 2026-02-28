from __future__ import annotations

from typing import Optional

from langchain_core.prompts import ChatPromptTemplate

from backend.models.schemas import CodeResponse, LanguageType
from backend.services.llm_service import LLMConfig, build_llm


_HTML_KEYWORDS = {
    "html", "webpage", "web page", "website", "css",
    "frontend", "browser", "landing page", "button", "form",
    "navbar", "nav bar", "sidebar", "modal", "dropdown",
}


def detect_language(prompt: str) -> LanguageType:
    """Heuristic language detection — no LLM call needed."""
    lower = prompt.lower()
    if any(kw in lower for kw in _HTML_KEYWORDS):
        return LanguageType.HTML
    return LanguageType.PYTHON


# Modules that are blocked by the execution sandbox.
_SANDBOX_BANNED = (
    "os", "sys", "pathlib", "shutil", "subprocess",
    "socket", "io", "tempfile", "glob", "fnmatch",
    "pty", "tty", "fcntl", "signal", "resource",
    "ctypes", "multiprocessing", "threading",
)


def generate_code(prompt: str, model: str, language: Optional[LanguageType] = None) -> CodeResponse:
    if language is None:
        language = detect_language(prompt)
    llm = build_llm(LLMConfig(model=model, temperature=0.2))

    banned_list = ", ".join(_SANDBOX_BANNED)
    system = f"""You are a senior software engineer writing code for a sandboxed Python runner.

STRICT RULES — violating any rule causes a sandbox error:
1. Return ONLY raw code. No markdown fences (``` or ~~~), no prose, no explanations.
2. Python code MUST NOT import or reference these banned modules: {banned_list}
3. Do NOT use `import sys`, `sys.argv`, `os.path`, `open()`, `Path()`, or any file/process operation.
4. Do NOT add an `if __name__ == "__main__":` block that imports or calls banned modules.
5. Demonstrate the function with a direct call and `print()` — not via command-line arguments.
6. HTML must be a complete, self-contained document.
7. Add concise inline comments only where genuinely helpful.
"""
    user = f"Language: {{language}}\nRequest: {{prompt}}\nReturn raw {language.value} code only."
    prompt_tmpl = ChatPromptTemplate.from_messages(
        [
            ("system", system),
            ("user", user),
        ]
    )

    chain = prompt_tmpl | llm
    code = chain.invoke({"prompt": prompt, "language": language.value}).content
    return CodeResponse(language=language, code=code)
