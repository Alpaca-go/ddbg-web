"""Scaffold print-art map JSON for categories not fully matched yet."""

from __future__ import annotations

import json
from pathlib import Path

SCAFFOLD_CATEGORIES = [
    ("hero_skill", "hero-skill-print-art-map.json", "ddbg.print-hero-skill-art-map.v1"),
    ("hero_stat", "hero-stat-print-art-map.json", "ddbg.print-hero-stat-art-map.v1"),
    ("room", "room-print-art-map.json", "ddbg.print-room-art-map.v1"),
    ("quest", "quest-print-art-map.json", "ddbg.print-quest-art-map.v1"),
    ("curio", "curio-print-art-map.json", "ddbg.print-curio-art-map.v1"),
    ("trinket", "trinket-print-art-map.json", "ddbg.print-trinket-art-map.v1"),
]


def write_scaffolds(maps_dir: Path, manifest_rows: list[dict], dpi: int) -> list[Path]:
    maps_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for category, filename, schema in SCAFFOLD_CATEGORIES:
        pages = [r for r in manifest_rows if r.get("category") == category]
        dest = maps_dir / filename
        payload = {
            "schema": schema,
            "source": {
                "printCategory": category,
                "status": "scaffold",
                "notes": [
                    "Pages exported to pngRel; engine id matching pending separate pass.",
                    "Cross-check TTS: apps/web/src/card-art/hero-skill-face-map.json (auxiliary).",
                ],
            },
            "dpi": dpi,
            "entries": [
                {
                    "engineId": None,
                    "face": r.get("side"),
                    "printPage": r.get("page"),
                    "pdfRel": r.get("pdf_rel"),
                    "pngRel": r.get("png_rel"),
                    "textSnippet": r.get("text_snippet"),
                    "pending": "engine id match not implemented in v0.1",
                }
                for r in pages
            ],
            "pending": [f"{category}: full id reconciliation pending"],
        }
        dest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(dest)
    return written
