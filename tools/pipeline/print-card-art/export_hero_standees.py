#!/usr/bin/env python3
"""Export formal eight hero standee PNGs from The Darkest Heroes punchboard."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from ddbg_print_art.hero_standees import run_hero_standee_export


def repo_root_from_here() -> Path:
    return Path(__file__).resolve().parents[3]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export hero standee PNGs (DH punchboard Rubine die-cut bbox)"
    )
    parser.add_argument("--input", required=True, help="EN_FILES root (DARKEST DUNGEON EN_FILES)")
    parser.add_argument(
        "--out",
        default=".cache/print-card-art",
        help="Output directory (png/ + hero-standee-export.json)",
    )
    parser.add_argument("--dpi", type=int, default=300, help="Raster DPI")
    parser.add_argument(
        "--faces",
        default="front",
        help="Comma-separated faces to export: front, back, or front,back",
    )
    parser.add_argument(
        "--keep-separation",
        action="store_true",
        help="Do not patch content streams to hide Rubine die-cut stroke",
    )
    parser.add_argument(
        "--allow-fixture-geometry",
        action="store_true",
        help="Do not require Rubine separation in page stream (unit tests only)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Validate die-cut geometry only")
    args = parser.parse_args()

    face_tokens = [f.strip().lower() for f in args.faces.split(",") if f.strip()]
    faces: tuple[str, ...] = tuple(f for f in face_tokens if f in ("front", "back"))
    if not faces:
        print("No valid --faces (use front and/or back)", file=sys.stderr)
        sys.exit(1)

    input_root = Path(args.input).resolve()
    out_root = Path(args.out).resolve()
    if not input_root.is_dir():
        print(f"Input not a directory: {input_root}", file=sys.stderr)
        sys.exit(1)

    try:
        rows = run_hero_standee_export(
            input_root,
            out_root,
            dpi=int(args.dpi),
            faces=faces,
            require_rubine_stroke=not args.allow_fixture_geometry,
            omit_separation=not args.keep_separation,
            dry_run=bool(args.dry_run),
        )
    except (FileNotFoundError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("Dry-run OK: hero standee Rubine geometry validated on DH punchboard")
        sys.exit(0)

    print(f"Exported {len(rows)} hero standee PNG(s) → {out_root}")
    for row in rows:
        print(f"  {row.hero} ({row.face}) p{row.page} → {row.png_rel}")


if __name__ == "__main__":
    main()
