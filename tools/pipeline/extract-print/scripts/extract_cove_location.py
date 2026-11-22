#!/usr/bin/env python3
"""Extract Cove location card components with the core-box pipeline (no rules inferred)."""
import argparse
import json
from pathlib import Path

from ddbg_extract import assemble, config as K, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE")
COMPONENTS = {
    "curio": "DD_EN_COVE_CARDS_63x88_CURIO",
    "room": "DD_EN_COVE_CARDS_63x88_rooms",
}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument("--out", type=Path, default=ROOT / "packages/data/extract/extension/cove")
    ap.add_argument("--categories", nargs="*", default=list(COMPONENTS))
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    selected = {k: COMPONENTS[k] for k in args.categories if k in COMPONENTS}
    if not selected:
        raise SystemExit("no known categories selected")
    K.SOURCES = [
        (cat, (LOCATION / f"{stem}_FRONT.pdf").as_posix(),
         (LOCATION / f"{stem}_BACK.pdf").as_posix(), "card", "extension")
        for cat, stem in selected.items()
    ]
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            if not (K.PRINT_ROOT / rel).is_file():
                raise FileNotFoundError(K.PRINT_ROOT / rel)
    stage1.CACHE = ROOT / "node_modules/.cache/cove-extract"
    results = {}
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            print(f"Extracting {Path(rel).name}", flush=True)
            results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    for cat, obj in raw.items():
        for card in obj["cards"]:
            card["id"] = card["id"].replace(":extension:", ":cove:", 1)
        dump(args.out / "raw" / f"{cat}.json", obj)
        print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)


if __name__ == "__main__":
    main()