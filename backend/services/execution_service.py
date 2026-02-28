from __future__ import annotations

import ast
import os
import subprocess
import sys
import tempfile
from typing import Dict

from backend.models.schemas import RunResult

_BANNED_MODULES: frozenset[str] = frozenset({
    "os", "pathlib", "shutil", "subprocess", "sys", "socket",
    "io", "tempfile", "glob", "fnmatch", "stat", "fcntl",
    "pty", "tty", "termios", "signal", "resource", "ctypes",
    "multiprocessing", "threading",
})

_BANNED_BUILTINS: frozenset[str] = frozenset({"open", "__import__", "eval", "exec", "compile"})


def _safe_env() -> Dict[str, str]:
    return {
        "PYTHONIOENCODING": "utf-8",
        "PYTHONUNBUFFERED": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
    }


def _contains_disallowed_tokens(code: str) -> bool:
    """Use AST parsing to detect disallowed imports and built-in calls."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        # Unparseable code — block it to be safe
        return True

    for node in ast.walk(tree):
        # import os / import sys / import subprocess …
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] in _BANNED_MODULES:
                    return True

        # from os import path / from subprocess import run …
        elif isinstance(node, ast.ImportFrom):
            if node.module and node.module.split(".")[0] in _BANNED_MODULES:
                return True

        # open(...) / __import__(...) / eval(...) / exec(...) …
        elif isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in _BANNED_BUILTINS:
                return True

    return False


def run_python(code: str, timeout_seconds: int = 5) -> RunResult:
    if _contains_disallowed_tokens(code):
        return RunResult(
            stdout="",
            stderr="File system or process access is not allowed in this sandbox.",
            exit_code=1,
            timed_out=False,
        )
    with tempfile.TemporaryDirectory(prefix="voiceforge_") as temp_dir:
        file_path = os.path.join(temp_dir, "main.py")
        with open(file_path, "w", encoding="utf-8") as handle:
            handle.write(code)

        try:
            completed = subprocess.run(
                [sys.executable, file_path],
                cwd=temp_dir,
                env=_safe_env(),
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
            )
            return RunResult(
                stdout=completed.stdout,
                stderr=completed.stderr,
                exit_code=completed.returncode,
                timed_out=False,
            )
        except subprocess.TimeoutExpired as exc:
            return RunResult(
                stdout=exc.stdout or "",
                stderr=exc.stderr or "Execution timed out.",
                exit_code=124,
                timed_out=True,
            )
