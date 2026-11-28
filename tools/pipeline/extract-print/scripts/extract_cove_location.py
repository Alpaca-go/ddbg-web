#!/usr/bin/env python3
"""Extract Cove or Warrens location card components with the core-box pipeline (no rules inferred)."""
import argparse
import json
from pathlib import Path

from ddbg_extract import assemble, config as K, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATIONS = {"cove": "MG_DD_05_EN_COVE", "warrens": "MG_DD_04_EN_WARRENS"}
BOSS_COMPONENTS = {
    "boss_ability": "70_120_Boss_Abilities",
    "monster_medium": "70_120_monsters_medium",
    "monster_large": "140x140_monster_large",
}
COMPONENTS = {
    "curio": "DD_EN_COVE_CARDS_63x88_CURIO",
    "room": "DD_EN_COVE_CARDS_63x88_rooms",
    "stygian_room": "DD_EN_COVE_CARDS_63x88_rooms_Stygian",
}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument("--pack", choices=LOCATIONS, default="cove")
    ap.add_argument("--out", type=Path)
    ap.add_argument("--categories", nargs="+")
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    location = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2") / LOCATIONS[args.pack]
    components = {
        kind: f"DD_EN_{args.pack.upper()}_CARDS_{suffix}"
        for kind, suffix in BOSS_COMPONENTS.items()
    }
    if args.pack == "cove":
        components.update(COMPONENTS)
    categories = args.categories or list(COMPONENTS if args.pack == "cove" else BOSS_COMPONENTS)
    if set(categories) - components.keys():
        ap.error("unknown category for this pack")
    selected = {kind: components[kind] for kind in categories}
    out = args.out or ROOT / "packages/data/extract/extension" / args.pack
    sources = []
    for cat, stem in selected.items():
        front = (location / f"{stem}_FRONT.pdf").as_posix()
        back_path = location / f"{stem}_BACK.pdf"
        back = back_path.as_posix() if back_path.is_file() else None
        sources.append((cat, front, back, "card", "extension"))
    K.SOURCES = sources
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            if rel and not (K.PRINT_ROOT / rel).is_file():
                raise FileNotFoundError(K.PRINT_ROOT / rel)
    stage1.CACHE = ROOT / f"node_modules/.cache/{args.pack}-extract"
    results = {}
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            print(f"Extracting {Path(rel).name}", flush=True)
            results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    for cat, obj in raw.items():
        for card in obj["cards"]:
            card["id"] = card["id"].replace(":extension:", f":{args.pack}:", 1)
        dump(out / "raw" / f"{cat}.json", obj)
        print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)


if __name__ == "__main__":
    main()