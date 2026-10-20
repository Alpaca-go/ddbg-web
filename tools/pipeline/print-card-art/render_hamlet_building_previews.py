#!/usr/bin/env python3
"""Render Hamlet building-tile preview mosaics (local artifacts, not committed)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    raise SystemExit("pip install pillow") from None

REPO = Path(__file__).resolve().parents[3]
CACHE = REPO / ".cache" / "print-card-art"
PNG_DIR = CACHE / "png"
ARTIFACTS = Path("/opt/cursor/artifacts")
EXPORT_JSON = CACHE / "hamlet-building-tile-export.json"

LABELS = {
    ("abbey", 2): "Abbey II",
    ("abbey", 3): "Abbey III",
    ("tavern", 2): "Tavern II",
    ("tavern", 3): "Tavern III",
    ("sanitarium", 2): "Sanitarium II",
    ("sanitarium", 3): "Sanitarium III",
    ("survivalist", 2): "Survivalist II",
    ("survivalist", 3): "Survivalist III",
    ("stagecoach", 2): "Stagecoach II",
    ("stagecoach", 3): "Stagecoach III",
    ("blacksmith", 2): "Blacksmith II",
    ("blacksmith", 3): "Blacksmith III",
    ("nomadWagon", 2): "Nomad Wagon II",
    ("nomadWagon", 3): "Nomad Wagon III",
}


def _load_rows() -> list[dict]:
    data = json.loads(EXPORT_JSON.read_text(encoding="utf-8"))
    return sorted(data["tiles"], key=lambda r: (r["building_id"], r["level"]))


def _fit_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except OSError:
        return ImageFont.load_default()


def render_mosaic(out_path: Path, cell_w: int = 380, cell_h: int = 260) -> None:
    rows = _load_rows()
    cols = 2
    pad = 16
    header = 28
    sheet = Image.new("RGB", (cols * cell_w + pad, len(rows) // cols * (cell_h + header) + pad), (18, 18, 22))
    draw = ImageDraw.Draw(sheet)
    font = _fit_font(18)
    for index, row in enumerate(rows):
        col = index % cols
        block = index // cols
        x0 = pad // 2 + col * cell_w
        y0 = pad // 2 + block * (cell_h + header)
        label = LABELS.get((row["building_id"], row["level"]), row["building_id"])
        draw.text((x0 + 8, y0 + 4), label, fill=(230, 220, 180), font=font)
        src = PNG_DIR / Path(row["png_rel"]).name
        if not src.is_file():
            raise FileNotFoundError(src)
        tile = Image.open(src).convert("RGB")
        tile.thumbnail((cell_w - 24, cell_h - 36), Image.Resampling.LANCZOS)
        ox = x0 + (cell_w - tile.width) // 2
        oy = y0 + header + (cell_h - 36 - tile.height) // 2
        sheet.paste(tile, (ox, oy))
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def render_guild_redaction_compare(out_path: Path) -> None:
    """Side-by-side tavern II with / without Guild+Graveyard text redaction."""
    import pymupdf

    from ddbg_print_art.hamlet_building_tiles import (
        _export_clip_for_panel,
        _export_panel_clip,
        _load_bld_p1_hints,
    )
    from ddbg_print_art.diecut import BuildingTilePanel, punchboard_300x300_pdf_candidates

    hint = next(h for h in _load_bld_p1_hints() if h["buildingId"] == "tavern" and int(h["level"]) == 2)
    die = hint["diecutPt"]
    panel = BuildingTilePanel(0, "die", pymupdf.Rect(die), 0.0, 0.0)
    clip = _export_clip_for_panel(panel)
    _back, front = punchboard_300x300_pdf_candidates("/tmp")
    pdf_path = Path("/tmp") / front
    doc = pymupdf.open(pdf_path)
    compare_dir = CACHE / "guild-redaction-compare"
    compare_dir.mkdir(parents=True, exist_ok=True)
    with_path = compare_dir / "tavern_L2_redact.png"
    without_path = compare_dir / "tavern_L2_plain.png"
    _export_panel_clip(doc, 0, clip, with_path, 140, omit_rubine=True, omit_hidden_terms=True)
    _export_panel_clip(doc, 0, clip, without_path, 140, omit_rubine=True, omit_hidden_terms=False)
    doc.close()
    left = Image.open(with_path).convert("RGB")
    right = Image.open(without_path).convert("RGB")
    h = max(left.height, right.height)
    w = left.width + right.width + 48
    sheet = Image.new("RGB", (w, h + 40), (24, 24, 28))
    sheet.paste(left, (16, 32))
    sheet.paste(right, (left.width + 32, 32))
    draw = ImageDraw.Draw(sheet)
    font = _fit_font(16)
    draw.text((16, 8), "Guild/Graveyard redaction ON", fill=(200, 200, 200), font=font)
    draw.text((left.width + 32, 8), "redaction OFF", fill=(200, 200, 200), font=font)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mosaic-out", type=Path, default=ARTIFACTS / "hamlet-building-tiles-preview.png")
    parser.add_argument("--guild-out", type=Path, default=ARTIFACTS / "hamlet-building-guild-redaction-compare.png")
    args = parser.parse_args()
    render_mosaic(args.mosaic_out)
    render_guild_redaction_compare(args.guild_out)
    print(f"Wrote {args.mosaic_out}")
    print(f"Wrote {args.guild_out}")


if __name__ == "__main__":
    main()
