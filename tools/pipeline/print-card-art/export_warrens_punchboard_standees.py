#!/usr/bin/env python3
"""Export Warrens punchboard LEPER / ANTIQUARIAN hero standee PNGs (Rubine bbox)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pymupdf

from ddbg_print_art.diecut import inset_diecut_clip, stroke_looks_like_rubine_diecut, page_mentions_rubine_separation
from ddbg_print_art.separation_omit import omit_rubine_separation_stroke

WARRENS_REL = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS")
STEM = "DD_EN_WARRENS_PUNCHBOARD"
HEROES = ("LEPER", "ANTIQUARIAN")

# Measured bbox (pt); geometryVerified=false in normalized data.
DIE_BY_HERO_FACE: dict[tuple[str, str], tuple[float, float, float, float]] = {
    ("LEPER", "front"): (38.94, 36.65, 217.65, 274.64),
    ("ANTIQUARIAN", "front"): (235.37, 36.65, 414.08, 274.64),
    ("LEPER", "back"): (235.37, 36.65, 414.08, 274.64),
    ("ANTIQUARIAN", "back"): (38.94, 36.65, 217.65, 274.64),
}


def slug(hero: str, face: str) -> str:
    return f"warrens-{hero.lower().replace(' ', '-')}-{face}.png"


def export_face(input_root: Path, face: str, out_root: Path, dpi: int, omit_sep: bool) -> list[dict]:
    pdf_name = f"{STEM}_{face.upper()}.pdf"
    pdf_rel = (WARRENS_REL / pdf_name).as_posix()
    pdf_path = input_root / pdf_rel
    if not pdf_path.is_file():
        raise FileNotFoundError(pdf_path)
    doc = pymupdf.open(pdf_path)
    page = doc[0]
    if omit_sep:
        omit_rubine_separation_stroke(doc, page)
    rub = page_mentions_rubine_separation(page)
    rows: list[dict] = []
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    for hero in HEROES:
        key = (hero, face)
        if key not in DIE_BY_HERO_FACE:
            continue
        x0, y0, x1, y1 = DIE_BY_HERO_FACE[key]
        die = pymupdf.Rect(x0, y0, x1, y1)
        # Soft validation: a Rubine stroke should exist near this panel when separation is present.
        if rub:
            ok = any(
                stroke_looks_like_rubine_diecut(d, rub)
                and abs(pymupdf.Rect(d["rect"]).width - die.width) < 2
                and abs(pymupdf.Rect(d["rect"]).x0 - die.x0) < 2
                for d in page.get_drawings()
            )
            if not ok:
                raise ValueError(f"Rubine panel not found for {hero} {face} on {pdf_name}")
        clip = inset_diecut_clip(die)
        png_rel = f"png/{slug(hero, face)}"
        dest = out_root / png_rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        page.get_pixmap(matrix=mat, clip=clip, alpha=False).save(dest)
        rows.append(
            {
                "hero": hero,
                "face": face,
                "png_rel": png_rel,
                "pdf_rel": pdf_rel,
                "page": 1,
                "diecut_pt": [round(x0, 2), round(y0, 2), round(x1, 2), round(y1, 2)],
                "diecut_wh_pt": [round(die.width, 2), round(die.height, 2)],
                "crop_method": "rubine_diecut_bbox_inset",
            }
        )
    doc.close()
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="EN_FILES root")
    parser.add_argument("--out", default=".cache/print-card-art")
    parser.add_argument("--dpi", type=int, default=300)
    parser.add_argument("--faces", default="front,back")
    parser.add_argument("--keep-separation", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    faces = [f.strip().lower() for f in args.faces.split(",") if f.strip() in ("front", "back")]
    if not faces:
        print("No valid --faces", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        for face in faces:
            export_face(input_root, face, out_root, args.dpi, not args.keep_separation)
        print("Dry-run OK: Warrens punchboard geometry")
        return

    rows: list[dict] = []
    for face in faces:
        rows.extend(export_face(input_root, face, out_root, args.dpi, not args.keep_separation))
    manifest = out_root / "warrens-punchboard-export.json"
    manifest.write_text(json.dumps({"standees": rows}, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(rows)} PNG(s) → {out_root}")


if __name__ == "__main__":
    main()