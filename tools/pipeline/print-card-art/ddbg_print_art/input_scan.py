"""Filter EN print PDFs under Kyries EN_FILES layout (skip 中文版 / tmp / zip)."""

from __future__ import annotations

import re
from pathlib import Path

_EXCLUDED_SEGMENTS = frozenset({"中文版", "tmp"})

# Top-level wave folders: DARKEST_DUNGEON_PRINT_EN_WAVE 1, MASTER_WEBBER_EN, etc.
_EN_ROOT_RE = re.compile(
    r"(?:^|/)(?:MASTER_WEBBER_EN|DARKEST[_ ]DUNGEON[_ ]PRINT[_ ]EN|.*[_ ]PRINT[_ ]EN[_ ].*)",
    re.IGNORECASE,
)


def _normalize_segments(rel_posix: str) -> list[str]:
    return [p for p in rel_posix.replace("\\", "/").split("/") if p]


def path_has_excluded_segment(rel_posix: str) -> bool:
    for part in _normalize_segments(rel_posix):
        if part.lower() in {s.lower() for s in _EXCLUDED_SEGMENTS}:
            return True
        if part.lower().endswith(".zip"):
            return True
    return False


def is_en_print_pdf_rel(rel_posix: str) -> bool:
    """True when a PDF under EN_FILES should be scanned for export."""
    rel = rel_posix.replace("\\", "/")
    if path_has_excluded_segment(rel):
        return False
    if _EN_ROOT_RE.search(rel):
        return True
    upper = rel.upper()
    if "MASTER_WEBBER_EN" in upper:
        return True
    if "PRINT_EN" in upper and ("DARKEST" in upper or "DD_" in upper or "MG_DD" in upper):
        return True
    return False


def iter_input_pdfs(input_root: Path) -> list[Path]:
    root = input_root.resolve()
    pdfs: list[Path] = []
    for path in sorted(root.rglob("*.pdf")):
        rel = path.relative_to(root).as_posix()
        if not is_en_print_pdf_rel(rel):
            continue
        pdfs.append(path)
    return pdfs


def assert_unique_png_outputs(png_rel: str, source: str, claims: dict[str, str]) -> None:
    prior = claims.get(png_rel)
    if prior is not None and prior != source:
        raise ValueError(
            f"Duplicate PNG output {png_rel}: already claimed by {prior}, also produced by {source}"
        )
    claims[png_rel] = source
