#!/usr/bin/env python3
"""Batch export print PDFs → PNG + manifest + art maps (local only)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pymupdf

from ddbg_print_art.bleed import crop_rect
from ddbg_print_art.classify import classify_pdf
from ddbg_print_art.export_pdf import export_page_png, page_text_snippet
from ddbg_print_art.manifest import write_manifest
from ddbg_print_art.map_monsters import (
    _load_cards,
    _page_to_card,
    write_maps as write_monster_maps,
)
from ddbg_print_art.map_scaffold import write_scaffolds
from ddbg_print_art.old_path import is_old_path
from ddbg_print_art.paths import png_basename


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def scan_pdfs(input_root: Path) -> list[Path]:
    return sorted(input_root.rglob("*.pdf"))


def resolve_engine_id(
    repo_root: Path,
    category: str | None,
    side: str | None,
    page: int,
) -> tuple[str | None, str]:
    if not category or category not in ("monster_medium", "monster_large"):
        return None, "skipped"
    try:
        cards = _load_cards(repo_root, category)
    except OSError:
        return None, "no_data"
    card = _page_to_card(cards, page, side or "front")
    if card:
        return card["id"], "matched"
    return None, "unmatched"


def run(args: argparse.Namespace) -> int:
    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        return 1

    repo_root = Path(args.repo).resolve() if args.repo else repo_root_from_here()
    png_dir = out_root / "png"
    maps_dir = out_root / "maps"
    manifest_path = out_root / "manifest.csv"

    pdfs = scan_pdfs(input_root)
    if not pdfs:
        print(f"No PDFs under {input_root}", file=sys.stderr)
        return 1

    manifest_rows: list[dict] = []
    dpi = int(args.dpi)
    limit = int(args.limit) if args.limit else None
    processed_pages = 0

    for pdf_path in pdfs:
        rel = pdf_path.relative_to(input_root).as_posix()
        old = is_old_path(rel)
        kind = classify_pdf(rel)
        doc = pymupdf.open(pdf_path)
        for page_index in range(doc.page_count):
            if limit is not None and processed_pages >= limit:
                break
            page_no = page_index + 1
            page = doc[page_index]
            clip, _ = crop_rect(page)
            snippet = page_text_snippet(page, clip)
            png_name = png_basename(rel, page_no, old)
            png_rel = f"png/{png_name}"
            png_abs = out_root / png_rel
            if not args.dry_run:
                method, _ = export_page_png(page, png_abs, dpi)
            else:
                method = "dry_run"
            engine_id, match_status = resolve_engine_id(
                repo_root, kind.category, kind.side, page_no
            )
            manifest_rows.append(
                {
                    "pdf_rel": rel,
                    "page": page_no,
                    "is_old_path": old,
                    "side": kind.side,
                    "category": kind.category,
                    "crop_method": method,
                    "png_rel": png_rel,
                    "text_snippet": snippet,
                    "engine_id": engine_id,
                    "match_status": match_status,
                }
            )
            processed_pages += 1
        doc.close()
        if limit is not None and processed_pages >= limit:
            break

    if not args.dry_run:
        write_manifest(manifest_path, manifest_rows)
        write_monster_maps(repo_root, maps_dir, manifest_rows, dpi)
        write_scaffolds(maps_dir, manifest_rows, dpi)
        meta = {
            "input": str(input_root),
            "out": str(out_root),
            "dpi": dpi,
            "pdf_count": len(pdfs),
            "page_exports": len(manifest_rows),
        }
        (out_root / "run-meta.json").write_text(
            json.dumps(meta, indent=2) + "\n", encoding="utf-8"
        )

    print(f"Exported {len(manifest_rows)} page(s) from {len(pdfs)} PDF(s) → {out_root}")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Export print PDF card art to PNG + maps")
    parser.add_argument("--input", required=True, help="Root folder (e.g. DARKEST DUNGEON EN_FILES)")
    parser.add_argument(
        "--out",
        default=".cache/print-card-art",
        help="Output directory (manifest, png/, maps/)",
    )
    parser.add_argument("--dpi", type=int, default=200, help="Render DPI (150–300 typical)")
    parser.add_argument("--repo", help="ddbg-web repo root (default: auto)")
    parser.add_argument("--limit", type=int, help="Max pages to export (smoke / debug)")
    parser.add_argument("--dry-run", action="store_true", help="Classify only, no PNG write")
    sys.exit(run(parser.parse_args()))


if __name__ == "__main__":
    main()
