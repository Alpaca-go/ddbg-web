#!/usr/bin/env python3
"""Export Hamlet board front (full-sheet TrimBox) → PNG."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ddbg_print_art.hamlet_board import run_hamlet_board_export


def main() -> None:
    parser = argparse.ArgumentParser(description="Export Hamlet board FRONT (TrimBox PNG)")
    parser.add_argument("--input", required=True, help="EN_FILES root")
    parser.add_argument("--out", default=".cache/print-card-art", help="Output directory")
    parser.add_argument("--dpi", type=int, default=200, help="Raster DPI")
    parser.add_argument("--dry-run", action="store_true", help="Validate TrimBox only")
    args = parser.parse_args()

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        row = run_hamlet_board_export(
            input_root,
            out_root,
            dpi=int(args.dpi),
            dry_run=bool(args.dry_run),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("Dry-run OK: Hamlet board TrimBox validated")
        sys.exit(0)

    print(f"Exported Hamlet board → {row.png_rel}")


if __name__ == "__main__":
    main()
