#!/usr/bin/env python3
"""Extract Warrens location card components (room / curio / dungeon_tile); BACK PDF optional."""
import argparse
import json
from pathlib import Path

from ddbg_extract import assemble, config as K, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS")
COMPONENTS = {
    "curio": "DD_EN_WARRENS_CARDS_63x88_CURIO",
    "room": "DD_EN_WARRENS_CARDS_63x88_rooms",
    "dungeon_tile": "DD_WARRENS_TILES",
}


def resolve_back(print_root: Path, stem: str) -> str | None:
    back = (LOCATION / f"{stem}_BACK.pdf").as_posix()
    return back if (print_root / back).is_file() else None


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument("--out", type=Path, default=ROOT / "packages/data/extract/extension/warrens")
    ap.add_argument("--categories", nargs="+", default=list(COMPONENTS))
    args = ap.parse_args()
    print_root = args.input.resolve()
    K.PRINT_ROOT = print_root
    selected = {k: COMPONENTS[k] for k in args.categories if k in COMPONENTS}
    if set(args.categories) - selected.keys():
        ap.error("unknown category for Warrens location extract")
    K.SOURCES = []
    for cat, stem in selected.items():
        front = (LOCATION / f"{stem}_FRONT.pdf").as_posix()
        if not (print_root / front).is_file():
            raise FileNotFoundError(print_root / front)
        back = resolve_back(print_root, stem)
        kind = "sheet" if cat == "dungeon_tile" else "card"
        K.SOURCES.append((cat, front, back, kind, "extension"))
    stage1.CACHE = ROOT / "node_modules/.cache/warrens-location-extract"
    results = {}
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            if not rel:
                continue
            print(f"Extracting {Path(rel).name}", flush=True)
            results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    for cat, obj in raw.items():
        for card in obj["cards"]:
            card["id"] = card["id"].replace(":extension:", ":warrens:", 1)
        if cat == "room":
            # Boss rooms p10–p12: keep in raw for print audit, flagged in sources warning.
            src = obj["sources"][0]
            if src.get("back") is None:
                src["pending_back_pdf"] = "待确认：本机缺 Warrens rooms BACK PDF"
        dump(args.out / "raw" / f"{cat}.json", obj)
        print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)


if __name__ == "__main__":
    main()