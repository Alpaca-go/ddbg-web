"""Export corebox room token faces from punchboard p3 (Rubine die-cut)."""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal

import pymupdf

from .diecut import (
    EXPECTED_DIE_CUT_COUNT,
    FRONT_DOOR_IMAGE_XREF,
    REVEALED_IMAGE_XREF_TO_KIND,
    DieCutRect,
    bleed_disc_rect,
    dominant_image_xref_in_rect,
    image_placements,
    inset_diecut_clip,
    iter_diecut_candidates,
    kind_for_revealed_xref,
    png_slug_for_token,
    punchboard_pdf_candidates,
)


CropMode = Literal["diecut", "bleed"]


@dataclass
class RoomTokenExportRow:
    kind: str
    face: str
    png_rel: str
    pdf_rel: str
    page: int
    image_xref: int
    crop_method: str
    diecut_side_pt: float


def _export_clip(page: pymupdf.Page, clip: pymupdf.Rect, dest: Path, dpi: int) -> None:
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(dest))


def export_tokens_from_page(
    page: pymupdf.Page,
    *,
    pdf_rel: str,
    page_no: int,
    face: Literal["revealed", "unrevealed"],
    png_dir: Path,
    dpi: int,
    crop_mode: CropMode,
    require_rubine_stroke: bool = True,
) -> list[RoomTokenExportRow]:
    diecuts = iter_diecut_candidates(page, require_rubine_stroke=require_rubine_stroke)
    if len(diecuts) != EXPECTED_DIE_CUT_COUNT:
        raise ValueError(
            f"{pdf_rel} p{page_no}: expected {EXPECTED_DIE_CUT_COUNT} Rubine die-cuts, got {len(diecuts)}"
        )
    placements = image_placements(page)
    by_kind: dict[str, DieCutBundle] = {}

    for cut in diecuts:
        xref = dominant_image_xref_in_rect(cut.rect, placements)
        if xref is None:
            continue
        if face == "revealed":
            kind = kind_for_revealed_xref(xref)
            if not kind:
                continue
        else:
            if xref != FRONT_DOOR_IMAGE_XREF:
                continue
            kind = "door"
        if kind not in by_kind:
            by_kind[kind] = DieCutBundle(kind=kind, xref=xref, diecut=cut)

    if face == "revealed":
        missing = set(REVEALED_IMAGE_XREF_TO_KIND.values()) - set(by_kind)
        if missing:
            raise ValueError(f"{pdf_rel} p{page_no}: missing kinds {sorted(missing)}")
    elif "door" not in by_kind:
        raise ValueError(f"{pdf_rel} p{page_no}: door face not found (xref {FRONT_DOOR_IMAGE_XREF})")

    rows: list[RoomTokenExportRow] = []
    for kind in sorted(by_kind, key=lambda k: (k != "door", k)):
        bundle = by_kind[kind]
        die = bundle.diecut.rect
        if crop_mode == "bleed":
            clip = bleed_disc_rect(die)
            method = "rubine_diecut_bleed_disc"
        else:
            clip = inset_diecut_clip(die)
            method = "rubine_diecut_bbox_inset"
        png_name = png_slug_for_token(kind, face)
        png_rel = f"png/{png_name}"
        dest = png_dir / png_name
        _export_clip(page, clip, dest, dpi)
        rows.append(
            RoomTokenExportRow(
                kind=kind,
                face=face,
                png_rel=png_rel,
                pdf_rel=pdf_rel,
                page=page_no,
                image_xref=bundle.xref,
                crop_method=method,
                diecut_side_pt=bundle.diecut.side_pt,
            )
        )
    return rows


@dataclass
class DieCutBundle:
    kind: str
    xref: int
    diecut: DieCutRect


def run_room_token_export(
    input_root: Path,
    out_root: Path,
    *,
    dpi: int = 300,
    page_no: int = 3,
    crop_mode: CropMode = "diecut",
    require_rubine_stroke: bool = True,
    dry_run: bool = False,
) -> list[RoomTokenExportRow]:
    back_rel, front_rel = punchboard_pdf_candidates(str(input_root))
    if not back_rel or not front_rel:
        raise FileNotFoundError(
            "Could not find DD_EN_COREBOX_PUNCHBOARD_200x300 BACK/FRONT PDFs under input root"
        )
    png_dir = out_root / "png"
    all_rows: list[RoomTokenExportRow] = []

    for rel, face in ((back_rel, "revealed"), (front_rel, "unrevealed")):
        pdf_path = input_root / rel
        doc = pymupdf.open(pdf_path)
        if page_no < 1 or page_no > doc.page_count:
            doc.close()
            raise ValueError(f"{rel}: page {page_no} out of range (1..{doc.page_count})")
        page = doc[page_no - 1]
        if dry_run:
            diecuts = iter_diecut_candidates(page, require_rubine_stroke=require_rubine_stroke)
            doc.close()
            if len(diecuts) != EXPECTED_DIE_CUT_COUNT:
                raise ValueError(f"dry-run: {rel} p{page_no} die-cut count {len(diecuts)}")
            continue
        rows = export_tokens_from_page(
            page,
            pdf_rel=rel,
            page_no=page_no,
            face=face,
            png_dir=png_dir,
            dpi=dpi,
            crop_mode=crop_mode,
            require_rubine_stroke=require_rubine_stroke,
        )
        doc.close()
        all_rows.extend(rows)

    if not dry_run:
        manifest = {
            "schema": "ddbg.print-room-token-export.v1",
            "dpi": dpi,
            "page": page_no,
            "crop_mode": crop_mode,
            "geometry": "PANTONE Rubine Red C die-cut roundrect 61.37pt (R-048)",
            "tokens": [asdict(r) for r in all_rows],
        }
        (out_root / "room-token-export.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
    return all_rows
