"""Export formal eight hero standees from The Darkest Heroes punchboard (Rubine bbox)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

import pymupdf

from .diecut import (
    FORMAL_HERO_PRINT_NAMES,
    DieCutRect,
    darkest_heroes_pdf_candidates,
    inset_diecut_clip,
    iter_hero_standee_diecut_candidates,
    png_slug_for_hero_standee,
)
from .input_scan import assert_unique_png_outputs
from .separation_omit import omit_rubine_separation_stroke

Face = Literal["front", "back"]
DH_FRONT_PAGES = (1, 2)


@dataclass
class HeroStandeeExportRow:
    hero: str
    face: str
    png_rel: str
    pdf_rel: str
    page: int
    diecut_pt: list[float]
    crop_method: str
    diecut_wh_pt: list[float]


def _export_clip(page: pymupdf.Page, clip: pymupdf.Rect, dest: Path, dpi: int) -> None:
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(dest))


def _hero_labels_on_page(page: pymupdf.Page) -> list[tuple[str, float, float]]:
    formal = set(FORMAL_HERO_PRINT_NAMES)
    labels: list[tuple[str, float, float]] = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            for span in line.get("spans", []):
                text = " ".join(span.get("text", "").split()).upper()
                if text not in formal:
                    continue
                bbox = span["bbox"]
                cx = (bbox[0] + bbox[2]) / 2.0
                cy = (bbox[1] + bbox[3]) / 2.0
                labels.append((text, cx, cy))
    return labels


def _diecut_for_label(
    cuts: list[DieCutRect], cx: float, cy: float
) -> DieCutRect | None:
    for cut in cuts:
        if cut.rect.contains((cx, cy)):
            return cut
    best: tuple[float, DieCutRect] | None = None
    for cut in cuts:
        dist = abs((cut.rect.x0 + cut.rect.x1) / 2 - cx) + abs((cut.rect.y0 + cut.rect.y1) / 2 - cy)
        if best is None or dist < best[0]:
            best = (dist, cut)
    return best[1] if best else None


def export_heroes_from_page(
    doc: pymupdf.Document,
    page: pymupdf.Page,
    *,
    pdf_rel: str,
    page_no: int,
    face: Face,
    png_dir: Path,
    dpi: int,
    require_rubine_stroke: bool = True,
    omit_separation: bool = True,
    png_claims: dict[str, str] | None = None,
) -> list[HeroStandeeExportRow]:
    if omit_separation:
        omit_rubine_separation_stroke(doc, page)
    cuts = iter_hero_standee_diecut_candidates(page, require_rubine_stroke=require_rubine_stroke)
    labels = _hero_labels_on_page(page)
    rows: list[HeroStandeeExportRow] = []
    used_rects: set[tuple[float, float, float, float]] = set()

    for hero_name, cx, cy in labels:
        cut = _diecut_for_label(cuts, cx, cy)
        if cut is None:
            continue
        key = (round(cut.rect.x0, 2), round(cut.rect.y0, 2), round(cut.rect.x1, 2), round(cut.rect.y1, 2))
        if key in used_rects:
            continue
        used_rects.add(key)
        clip = inset_diecut_clip(cut.rect)
        png_name = png_slug_for_hero_standee(hero_name, face)
        png_rel = f"png/{png_name}"
        if png_claims is not None:
            assert_unique_png_outputs(
                png_rel, f"{pdf_rel} p{page_no} {hero_name}", png_claims
            )
        dest = png_dir / png_name
        _export_clip(page, clip, dest, dpi)
        rows.append(
            HeroStandeeExportRow(
                hero=hero_name,
                face=face,
                png_rel=png_rel,
                pdf_rel=pdf_rel,
                page=page_no,
                diecut_pt=[cut.rect.x0, cut.rect.y0, cut.rect.x1, cut.rect.y1],
                crop_method="rubine_diecut_bbox_inset",
                diecut_wh_pt=[cut.rect.width, cut.rect.height],
            )
        )
    return rows


def run_hero_standee_export(
    input_root: Path,
    out_root: Path,
    *,
    dpi: int = 300,
    faces: tuple[Face, ...] = ("front",),
    require_rubine_stroke: bool = True,
    omit_separation: bool = True,
    dry_run: bool = False,
) -> list[HeroStandeeExportRow]:
    back_rel, front_rel = darkest_heroes_pdf_candidates(str(input_root))
    if not front_rel:
        raise FileNotFoundError(
            "Could not find DD_EN_THE_DARKEST_HEROES_PUNCHBOARD_FRONT.pdf under input root"
        )
    png_dir = out_root / "png"
    png_claims: dict[str, str] = {}
    all_rows: list[HeroStandeeExportRow] = []

    jobs: list[tuple[str, Face, tuple[int, ...]]] = []
    if "front" in faces and front_rel:
        jobs.append((front_rel, "front", DH_FRONT_PAGES))
    if "back" in faces and back_rel:
        jobs.append((back_rel, "back", DH_FRONT_PAGES))

    for rel, face, pages in jobs:
        pdf_path = input_root / rel
        doc = pymupdf.open(pdf_path)
        for page_no in pages:
            if page_no < 1 or page_no > doc.page_count:
                doc.close()
                raise ValueError(f"{rel}: page {page_no} out of range (1..{doc.page_count})")
            page = doc[page_no - 1]
            if dry_run:
                cuts = iter_hero_standee_diecut_candidates(
                    page, require_rubine_stroke=require_rubine_stroke
                )
                if not cuts:
                    doc.close()
                    raise ValueError(f"dry-run: {rel} p{page_no} has no hero standee die-cuts")
                continue
            rows = export_heroes_from_page(
                doc,
                page,
                pdf_rel=rel,
                page_no=page_no,
                face=face,
                png_dir=png_dir,
                dpi=dpi,
                require_rubine_stroke=require_rubine_stroke,
                omit_separation=omit_separation,
                png_claims=png_claims,
            )
            all_rows.extend(rows)
        doc.close()

    if dry_run:
        return all_rows

    front_heroes = {r.hero for r in all_rows if r.face == "front"}
    missing = set(FORMAL_HERO_PRINT_NAMES) - front_heroes
    if missing:
        raise ValueError(f"Export missing formal heroes on FRONT: {sorted(missing)}")

    manifest = {
        "schema": "ddbg.print-hero-standee-export.v1",
        "dpi": dpi,
        "geometry": "PANTONE Rubine Red C die-cut bbox 177.83×237.09pt (R-048); DH punchboard",
        "omit_separation": omit_separation,
        "standees": [asdict(r) for r in all_rows],
    }
    (out_root / "hero-standee-export.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    return all_rows
