"""CSV manifest helpers."""

from __future__ import annotations

import csv
from pathlib import Path

MANIFEST_FIELDS = [
    "pdf_rel",
    "page",
    "is_old_path",
    "side",
    "category",
    "crop_method",
    "png_rel",
    "text_snippet",
    "engine_id",
    "match_status",
]


def write_manifest(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=MANIFEST_FIELDS, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
