"""Export corebox curio / trinket / quest PDFs (one TrimBox card per page)."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

import pymupdf

from .bleed import crop_rect
from .export_pdf import export_page_png, page_text_snippet
from .input_scan import assert_unique_png_outputs, is_en_print_pdf_rel
from .old_path import is_old_path
from .paths import png_basename

Face = Literal["front", "back"]

COREBOX_CARDS_PREFIX = "02_DD_CARDS_COREBOX"


@dataclass(frozen=True)
class TrimBoxSpec:
    width_pt: float
    height_pt: float
    x0_pt: float = 0.0
    y0_pt: float = 0.0
    tolerance_pt: float = 0.05


@dataclass(frozen=True)
class DeckPdfSpec:
    filename: str
    face: Face
    page_count: int


@dataclass(frozen=True)
class DeckSpec:
    key: str
    pdfs: tuple[DeckPdfSpec, ...]
    trim: TrimBoxSpec


DECK_SPECS: tuple[DeckSpec, ...] = (
    DeckSpec(
        key="curio",
        pdfs=(
            DeckPdfSpec("DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf", "front", 24),
            DeckPdfSpec("DD_EN_COREBOX_CARDS_63x88_CURIO_BACK.pdf", "back", 24),
        ),
        trim=TrimBoxSpec(178.58, 249.45, 21.0, 21.0),
    ),
    DeckSpec(
        key="trinket",
        pdfs=(
            DeckPdfSpec("DD_EN_COREBOX_CARDS_44x68_TRINKETS_FRONT.pdf", "front", 38),
            DeckPdfSpec("DD_EN_COREBOX_CARDS_44x68_TRINKETS_BACK.pdf", "back", 38),
        ),
        trim=TrimBoxSpec(192.76, 124.72),
    ),
    DeckSpec(
        key="quest",
        pdfs=(
            DeckPdfSpec("DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf", "front", 19),
            DeckPdfSpec("DD_EN_COREBOX_CARDS_70_120_quests_BACK.pdf", "back", 19),
        ),
        trim=TrimBoxSpec(198.43, 340.16),
    ),
)


@dataclass
class TrimPageExportRow:
    deck: str
    face: Face
    png_rel: str
    pdf_rel: str
    page: int
    crop_method: str
    trim_width_pt: float
    trim_height_pt: float
    text_snippet: str


def _prefer_corebox(paths: list[Path]) -> Path:
    corebox = [p for p in paths if COREBOX_CARDS_PREFIX in p.as_posix()]
    pool = corebox if corebox else paths
    v2 = [p for p in pool if "_V2" in p.name.upper()]
    if v2:
        pool = v2
    non_old = [
        p
        for p in pool
        if "Old_version" not in p.as_posix() and "/old/" not in p.as_posix().lower()
    ]
    if non_old:
        pool = non_old
    pool.sort(key=lambda p: p.as_posix())
    return pool[0]


def find_deck_pdf(input_root: Path, filename: str) -> Path:
    matches = [
        p
        for p in input_root.rglob(filename)
        if p.name == filename
        and is_en_print_pdf_rel(p.relative_to(input_root).as_posix())
    ]
    if not matches:
        raise FileNotFoundError(
            f"Missing print PDF {filename} under {input_root} "
            f"(expected under …/{COREBOX_CARDS_PREFIX}/)"
        )
    return _prefer_corebox(matches)


def assert_trim_matches(page: pymupdf.Page, spec: TrimBoxSpec) -> pymupdf.Rect:
    clip, method = crop_rect(page)
    if method != "trimbox":
        raise ValueError(
            f"Page {page.number + 1}: expected TrimBox crop (R-048), got {method}"
        )
    tol = spec.tolerance_pt
    if abs(clip.width - spec.width_pt) > tol or abs(clip.height - spec.height_pt) > tol:
        raise ValueError(
            f"Page {page.number + 1}: TrimBox {clip.width:.2f}×{clip.height:.2f}pt "
            f"≠ expected {spec.width_pt}×{spec.height_pt}pt"
        )
    if spec.x0_pt or spec.y0_pt:
        if abs(clip.x0 - spec.x0_pt) > tol or abs(clip.y0 - spec.y0_pt) > tol:
            raise ValueError(
                f"Page {page.number + 1}: TrimBox origin ({clip.x0:.2f},{clip.y0:.2f}) "
                f"≠ expected ({spec.x0_pt},{spec.y0_pt})"
            )
    return clip


def run_corebox_trim_export(
    input_root: Path,
    out_root: Path,
    *,
    dpi: int = 200,
    decks: tuple[str, ...] | None = None,
    dry_run: bool = False,
) -> list[TrimPageExportRow]:
    png_dir = out_root / "png"
    png_claims: dict[str, str] = {}
    rows: list[TrimPageExportRow] = []
    wanted = set(decks) if decks else {s.key for s in DECK_SPECS}

    for deck_spec in DECK_SPECS:
        if deck_spec.key not in wanted:
            continue
        for pdf_spec in deck_spec.pdfs:
            pdf_path = find_deck_pdf(input_root, pdf_spec.filename)
            pdf_rel = pdf_path.relative_to(input_root).as_posix()
            old = is_old_path(pdf_rel)
            doc = pymupdf.open(pdf_path)
            if doc.page_count != pdf_spec.page_count:
                doc.close()
                raise ValueError(
                    f"{pdf_spec.filename}: expected {pdf_spec.page_count} pages, "
                    f"got {doc.page_count}"
                )
            for page_index in range(doc.page_count):
                page_no = page_index + 1
                page = doc[page_index]
                clip = assert_trim_matches(page, deck_spec.trim)
                snippet = page_text_snippet(page, clip)
                png_name = png_basename(pdf_rel, page_no, old)
                png_rel = f"png/{png_name}"
                assert_unique_png_outputs(png_rel, f"{pdf_rel} p{page_no}", png_claims)
                png_abs = out_root / png_rel
                if dry_run:
                    method = "dry_run"
                else:
                    method, _ = export_page_png(page, png_abs, dpi)
                rows.append(
                    TrimPageExportRow(
                        deck=deck_spec.key,
                        face=pdf_spec.face,
                        png_rel=png_rel,
                        pdf_rel=pdf_rel,
                        page=page_no,
                        crop_method=method,
                        trim_width_pt=round(clip.width, 2),
                        trim_height_pt=round(clip.height, 2),
                        text_snippet=snippet,
                    )
                )
            doc.close()

    if not dry_run:
        export_path = out_root / "corebox-trim-deck-export.json"
        export_path.write_text(
            json.dumps(
                {
                    "dpi": dpi,
                    "rows": [asdict(r) for r in rows],
                },
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
    return rows


def back_level_for_trinket_page(page: int) -> int:
    if 1 <= page <= 14:
        return 1
    if 15 <= page <= 26:
        return 2
    if 27 <= page <= 38:
        return 3
    raise ValueError(f"Trinket back page {page} outside I–III tiers")
