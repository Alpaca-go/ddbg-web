#!/usr/bin/env python3
"""Export corebox room tokens (punchboard p3, Rubine die-cut) → per-kind PNG."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ddbg_print_art.room_tokens import run_room_token_export


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser(description="Export room token PNGs from punchboard PDFs")
    parser.add_argument("--input", required=True, help="EN_FILES root (DARKEST DUNGEON EN_FILES)")
    parser.add_argument(
        "--out",
        default=".cache/print-card-art",
        help="Output directory (png/ + room-token-export.json)",
    )
    parser.add_argument("--dpi", type=int, default=300, help="Raster DPI (300 typical for tokens)")
    parser.add_argument("--page", type=int, default=3, help="Punchboard page (corebox room tokens: 3)")
    parser.add_argument(
        "--crop",
        choices=("diecut", "bleed"),
        default="diecut",
        help="diecut = inset Rubine bbox; bleed = ~82.2pt fill disc",
    )
    parser.add_argument(
        "--allow-fixture-geometry",
        action="store_true",
        help="Do not require Rubine separation in page stream (unit tests / synthetic PDFs only)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate die-cut counts only")
    args = parser.parse_args()

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        rows = run_room_token_export(
            input_root,
            out_root,
            dpi=int(args.dpi),
            page_no=int(args.page),
            crop_mode=args.crop,
            require_rubine_stroke=not args.allow_fixture_geometry,
            dry_run=bool(args.dry_run),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("Dry-run OK: die-cut geometry validated on BACK/FRONT punchboard p3")
        sys.exit(0)

    print(f"Exported {len(rows)} room token PNG(s) → {out_root}")
    for row in rows:
        print(f"  {row.kind} ({row.face}) → {row.png_rel}")


if __name__ == "__main__":
    main()
