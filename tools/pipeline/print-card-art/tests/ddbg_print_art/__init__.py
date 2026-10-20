"""让 unittest discover（start 目录为 tests/）能解析到上级真正的 ddbg_print_art 包。"""

from pathlib import Path

__path__ = [str(Path(__file__).resolve().parents[1].parent / "ddbg_print_art")]
