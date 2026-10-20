#!/usr/bin/env python3
"""Export curio / trinket / quest print PDFs (full-page TrimBox per card)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ddbg_print_art.corebox_trim_decks import DECK_SPECS, run_corebox_trim_export


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export corebox curio/trinket/quest card faces (TrimBox, one card per page)"
    )
    parser.add_argument("--input", required=True, help="EN_FILES root (DARKEST DUNGEON EN_FILES)")
    parser.add_argument(
        "--out",
        default=".cache/print-card-art",
        help="Output directory (png/ + corebox-trim-deck-export.json)",
    )
    parser.add_argument("--dpi", type=int, default=200, help="Raster DPI (150–300 typical)")
    parser.add_argument(
        "--deck",
        action="append",
        choices=[s.key for s in DECK_SPECS],
        help="Limit to one deck (repeatable); default all three",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate TrimBox only, no PNG write")
    args = parser.parse_args()

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        rows = run_corebox_trim_export(
            input_root,
            out_root,
            dpi=int(args.dpi),
            decks=tuple(args.deck) if args.deck else None,
            dry_run=bool(args.dry_run),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print(f"Dry-run OK: validated {len(rows)} TrimBox page(s)")
        sys.exit(0)

    print(f"Exported {len(rows)} page PNG(s) → {out_root}")


if __name__ == "__main__":
    main()
