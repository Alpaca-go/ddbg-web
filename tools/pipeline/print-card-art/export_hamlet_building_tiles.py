#!/usr/bin/env python3
"""Export Hamlet building upgrade tiles (BLD punchboard p1) → PNG."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ddbg_print_art.hamlet_building_tiles import run_hamlet_building_tile_export


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export Hamlet building II/III tiles from 300×300 punchboard FRONT p1"
    )
    parser.add_argument("--input", required=True, help="EN_FILES root")
    parser.add_argument("--out", default=".cache/print-card-art", help="Output directory")
    parser.add_argument("--dpi", type=int, default=200, help="Raster DPI")
    parser.add_argument("--page", type=int, default=1, help="Punchboard page (BLD = 1)")
    parser.add_argument(
        "--no-omit-hidden-terms",
        action="store_true",
        help="Do not redact Guild/Graveyard overprint text in each tile clip",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate geometry/labels only")
    args = parser.parse_args()

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        rows = run_hamlet_building_tile_export(
            input_root,
            out_root,
            dpi=int(args.dpi),
            page_no=int(args.page),
            dry_run=bool(args.dry_run),
            omit_hidden_terms=not args.no_omit_hidden_terms,
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print(f"Dry-run OK: validated {len(rows)} BLD upgrade tile panel(s)")
        sys.exit(0)

    print(f"Exported {len(rows)} building tile PNG(s) → {out_root}")
    for row in rows:
        print(f"  {row.building_id} L{row.level} ({row.print_name} {row.print_level}) → {row.png_rel}")


if __name__ == "__main__":
    main()
