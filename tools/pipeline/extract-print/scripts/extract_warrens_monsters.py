#!/usr/bin/env python3
"""Extract Warrens medium/large monsters from MG_DD_04 print PDFs + first-pass parse."""
import argparse
import json
from pathlib import Path

from ddbg_extract import assemble, config as K, parse, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS")
COMPONENTS = {
    "monster_medium": "DD_EN_WARRENS_CARDS_70_120_monsters_medium",
    "monster_large": "DD_EN_WARRENS_CARDS_140x140_monster_large",
}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument(
        "--out",
        type=Path,
        default=ROOT / "packages/data/extract/extension/warrens",
    )
    ap.add_argument("--skip-extract", action="store_true", help="only re-parse existing raw/*.json")
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    out = args.out
    if not args.skip_extract:
        K.SOURCES = [
            (
                cat,
                (LOCATION / f"{stem}_FRONT.pdf").as_posix(),
                (LOCATION / f"{stem}_BACK.pdf").as_posix(),
                "card",
                "extension",
            )
            for cat, stem in COMPONENTS.items()
        ]
        for _, front, back, _, _ in K.SOURCES:
            for rel in (front, back):
                if not (K.PRINT_ROOT / rel).is_file():
                    raise FileNotFoundError(K.PRINT_ROOT / rel)
        stage1.CACHE = ROOT / "node_modules/.cache/warrens-monster-extract"
        results = {}
        for _, front, back, _, _ in K.SOURCES:
            for rel in (front, back):
                print(f"Extracting {Path(rel).name}", flush=True)
                results[rel] = stage1.extract_file(rel)
        raw, _, _, _ = assemble.assemble(results)
        for cat, obj in raw.items():
            for card in obj["cards"]:
                card["id"] = card["id"].replace(":extension:", ":warrens:", 1)
            dump(out / "raw" / f"{cat}.json", obj)
            print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)
    else:
        raw = {}
        for cat in COMPONENTS:
            path = out / "raw" / f"{cat}.json"
            raw[cat] = json.loads(path.read_text(encoding="utf-8"))
    for cat, obj in raw.items():
        if cat not in parse.PARSERS:
            continue
        rows = [
            parse.parse_monster(
                card,
                large=cat == "monster_large",
                skill_badge_min_size=14,
                life_max_y_ratio=0.4 if cat == "monster_medium" else 1,
            )
            for card in obj["cards"]
        ]
        for row in rows:
            if not row.get("type_position_raw"):
                row["issues"].append("no type/position line parsed")
        failures = [
            dict(id=r["id"], pages=r["pages"], issues=r["issues"]) for r in rows if r["issues"]
        ]
        dump(
            out / "parsed" / f"{cat}.json",
            dict(
                schema="ddbg-parsed-v0",
                extractor_version=K.EXTRACTOR_VERSION,
                category=cat,
                source=f"raw/extension/warrens/{cat}.json",
                field_notes=parse.NOTES[cat],
                icon_token="{icon:<iconId>} = unannotated icon cluster, see icons/catalog.json",
                stats=dict(
                    cards=len(rows),
                    ok=len(rows) - len(failures),
                    failed=len(failures),
                    success_rate=round(1 - len(failures) / max(1, len(rows)), 4),
                ),
                failures=failures,
                cards=rows,
            ),
        )
        print(f"parsed {cat}: {len(rows)} cards, {len(failures)} parse issues", flush=True)


if __name__ == "__main__":
    main()