#!/usr/bin/env python3
"""Export geometry-approved room tile faces → manual/room-tile-faces/*.png (TrimBox)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from ddbg_print_art.room_tile_faces import run_room_tile_face_export


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export battle room tile faces from COREBOX TILES PDFs (geometry manifest)",
    )
    parser.add_argument("--input", required=True, help="EN_FILES root (DARKEST DUNGEON EN_FILES)")
    parser.add_argument(
        "--out",
        default=".cache/print-card-art",
        help="Output directory (manual/room-tile-faces/ under cache)",
    )
    parser.add_argument("--dpi", type=int, default=200, help="Raster DPI (200 matches deck export)")
    parser.add_argument("--repo", default="", help="Repo root (default: auto from script location)")
    parser.add_argument("--dry-run", action="store_true", help="Validate geometry + PDF pages only")
    args = parser.parse_args()

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    repo_root = Path(args.repo).resolve() if args.repo else repo_root_from_here()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        rows = run_room_tile_face_export(
            input_root,
            out_root,
            repo_root,
            dpi=int(args.dpi),
            dry_run=bool(args.dry_run),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    manifest = out_root / "room-tile-face-export.json"
    if not args.dry_run:
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text(
            json.dumps([row.__dict__ for row in rows], indent=2) + "\n",
            encoding="utf-8",
        )

    if args.dry_run:
        print(f"Dry-run OK: {len(rows)} geometry-verified tile face(s)")
        sys.exit(0)

    print(f"Exported {len(rows)} room tile face PNG(s) → {out_root}")
    for row in rows:
        print(f"  {row.tile_id} ({row.name}) p{row.page} → {row.png_rel}")


if __name__ == "__main__":
    main()
