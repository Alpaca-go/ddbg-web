"""Export Hamlet board front (full-sheet TrimBox)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

import pymupdf

from .bleed import crop_rect
from .diecut import hamlet_board_pdf_candidate
from .export_pdf import export_page_png, page_text_snippet
from .input_scan import assert_unique_png_outputs
from .paths import png_basename


@dataclass
class HamletBoardExportRow:
    png_rel: str
    pdf_rel: str
    page: int
    crop_method: str
    trim_width_pt: float
    trim_height_pt: float
    trim_x0_pt: float
    trim_y0_pt: float
    text_snippet: str


def run_hamlet_board_export(
    input_root: Path,
    out_root: Path,
    *,
    dpi: int = 200,
    dry_run: bool = False,
) -> HamletBoardExportRow:
    rel = hamlet_board_pdf_candidate(str(input_root))
    if not rel:
        raise FileNotFoundError(
            "Could not find DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf under input root"
        )
    pdf_path = input_root / rel
    doc = pymupdf.open(pdf_path)
    if doc.page_count < 1:
        doc.close()
        raise ValueError(f"{rel}: expected at least one page")
    page = doc[0]
    clip, expected_method = crop_rect(page)
    if expected_method != "trimbox":
        doc.close()
        raise ValueError(f"{rel} p1: expected TrimBox crop (R-048), got {expected_method}")
    snippet = page_text_snippet(page, clip)
    png_rel = "png/hamlet-board-front.png"
    png_claims: dict[str, str] = {}
    assert_unique_png_outputs(png_rel, f"{rel} p1", png_claims)
    png_abs = out_root / png_rel
    if dry_run:
        method = "dry_run"
    else:
        method, _ = export_page_png(page, png_abs, dpi)
    doc.close()
    row = HamletBoardExportRow(
        png_rel=png_rel,
        pdf_rel=rel,
        page=1,
        crop_method=method,
        trim_width_pt=round(clip.width, 2),
        trim_height_pt=round(clip.height, 2),
        trim_x0_pt=round(clip.x0, 2),
        trim_y0_pt=round(clip.y0, 2),
        text_snippet=snippet,
    )
    if not dry_run:
        manifest = {
            "schema": "ddbg.print-hamlet-board-export.v1",
            "dpi": dpi,
            "board": asdict(row),
        }
        (out_root / "hamlet-board-export.json").write_text(
            json.dumps(manifest, indent=2) + "\n",
            encoding="utf-8",
        )
    return row
