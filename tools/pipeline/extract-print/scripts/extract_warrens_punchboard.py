#!/usr/bin/env python3
"""Extract Warrens punchboard (MG_DD_04_EN_WARRENS) — hero standee sheet only."""
import argparse
from pathlib import Path

from ddbg_extract import assemble, config as K, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS")
STEM = "DD_EN_WARRENS_PUNCHBOARD"


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    import json

    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument("--out", type=Path, default=ROOT / "packages/data/extract/extension/warrens")
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    front = (LOCATION / f"{STEM}_FRONT.pdf").as_posix()
    back = (LOCATION / f"{STEM}_BACK.pdf").as_posix()
    for rel in (front, back):
        if not (K.PRINT_ROOT / rel).is_file():
            raise FileNotFoundError(K.PRINT_ROOT / rel)
    K.SOURCES = [("punchboard", front, back, "sheet", "extension")]
    stage1.CACHE = ROOT / "node_modules/.cache/warrens-punchboard-extract"
    results = {}
    for rel in (front, back):
        print(f"Extracting {Path(rel).name}", flush=True)
        results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    for cat, obj in raw.items():
        for card in obj["cards"]:
            card["id"] = card["id"].replace(":extension:", ":warrens:", 1)
        dump(args.out / "raw" / f"{cat}.json", obj)
        print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)


if __name__ == "__main__":
    main()