#!/usr/bin/env python3
"""Extract Warrens location quest cards (MG_DD_04_EN_WARRENS) → packages/data/extract/extension/warrens/raw/quest.json."""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ddbg_extract import assemble, config as K, stage1  # noqa: E402

LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS")
QUEST_STEM = "DD_EN_WARRENS_CARDS_70_120_quests"


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
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    front = (LOCATION / f"{QUEST_STEM}_FRONT.pdf").as_posix()
    back = (LOCATION / f"{QUEST_STEM}_BACK.pdf").as_posix()
    for rel in (front, back):
        if not (K.PRINT_ROOT / rel).is_file():
            raise FileNotFoundError(K.PRINT_ROOT / rel)
    K.SOURCES = [("quest", front, back, "card", "extension")]
    stage1.CACHE = ROOT / "node_modules/.cache/warrens-quest-extract"
    results = {}
    for rel in (front, back):
        print(f"Extracting {Path(rel).name}", flush=True)
        results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    obj = raw["quest"]
    for card in obj["cards"]:
        card["id"] = card["id"].replace(":extension:", ":warrens:", 1)
    dump(args.out / "raw" / "quest.json", obj)
    print(f"quest: {obj['n_pages']} pages / {obj['n_unique']} unique → {args.out / 'raw' / 'quest.json'}", flush=True)


if __name__ == "__main__":
    main()