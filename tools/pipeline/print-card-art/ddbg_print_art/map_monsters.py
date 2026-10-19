"""Build monster print-art maps from normalized engine data + manifest rows."""

from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional


def _load_cards(repo_root: Path, category: str) -> list[dict[str, Any]]:
    path = repo_root / "packages/data/normalized/corebox" / f"{category}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("cards", [])


def _page_to_card(
    cards: list[dict[str, Any]], page: int, side: str
) -> Optional[dict[str, Any]]:
    for card in cards:
        pages = card.get("pages") or []
        if page not in pages:
            continue
        if side == "front":
            variants = card.get("copy_variants") or []
            if any(v.get("page") == page and v.get("face") == "front" for v in variants):
                return card
            # FRONT sheet: page listed in pages without variant row
            if variants:
                continue
            return card
        # BACK: same page index pairs with FRONT (plan.md); match by pages list
        return card
    return None


def build_monster_map(
    repo_root: Path,
    category: str,
    manifest_rows: list[dict[str, Any]],
    dpi: int,
) -> dict[str, Any]:
    cards = _load_cards(repo_root, category)
    entries: list[dict[str, Any]] = []
    pending: list[str] = []

    by_pdf: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for row in manifest_rows:
        if row.get("category") != category:
            continue
        by_pdf[row["pdf_rel"]].append(row)

    for pdf_rel, rows in sorted(by_pdf.items()):
        kind_side = None
        for row in rows:
            if row.get("side"):
                kind_side = row["side"]
                break
        if not kind_side:
            pending.append(f"{pdf_rel}: cannot determine front/back from filename")
            continue
        for row in sorted(rows, key=lambda r: r["page"]):
            page = int(row["page"])
            side = row.get("side") or kind_side
            card = _page_to_card(cards, page, side)
            snippet = (row.get("text_snippet") or "").lower()
            match_method = "page"
            engine_id: Optional[str] = None
            pending_reason: Optional[str] = None
            if card:
                engine_id = card["id"]
                name = card.get("name") or ""
                if name and name.lower() not in snippet and snippet:
                    pending_reason = f"text mismatch: expected '{name}' in snippet"
                    match_method = "page+text_mismatch"
                else:
                    match_method = "page+name" if name else "page"
            else:
                pending_reason = f"no engine card for {category} page {page} ({side})"
            entry = {
                "id": engine_id or f"{category}:p{page:03d}",
                "engineId": engine_id,
                "name": card.get("name") if card else None,
                "level": card.get("level") if card else None,
                "face": side,
                "printPage": page,
                "pdfRel": pdf_rel,
                "pngRel": row.get("png_rel"),
                "isOldPath": row.get("is_old_path"),
                "textSnippet": row.get("text_snippet"),
                "matchMethod": match_method,
                "pending": pending_reason,
            }
            entries.append(entry)
            if pending_reason:
                pending.append(f"{entry['id']} @ {pdf_rel} p{page}: {pending_reason}")

    schema = (
        "ddbg.print-monster-medium-art-map.v1"
        if category == "monster_medium"
        else "ddbg.print-monster-large-art-map.v1"
    )
    return {
        "schema": schema,
        "source": {
            "printCategory": category,
            "normalized": f"packages/data/normalized/corebox/{category}.json",
            "notes": [
                "Mapping uses print FRONT/BACK page index vs normalized `pages` (not TTS atlas).",
                "TTS maps in apps/web/src/card-art/* are auxiliary only; print wins when cached.",
                "docs/plan.md: TrimBox = card face, 3 mm bleed when only MediaBox (R-048: no invented geometry).",
            ],
        },
        "dpi": dpi,
        "entries": entries,
        "pending": pending,
    }


def write_maps(
    repo_root: Path,
    maps_dir: Path,
    manifest_rows: list[dict[str, Any]],
    dpi: int,
) -> list[Path]:
    maps_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for category, out_name in (
        ("monster_medium", "monster-medium-print-art-map.json"),
        ("monster_large", "monster-large-print-art-map.json"),
    ):
        m = build_monster_map(repo_root, category, manifest_rows, dpi)
        dest = maps_dir / out_name
        dest.write_text(json.dumps(m, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        written.append(dest)
    return written
