#!/usr/bin/env python3
"""Extract Weald location components with the core-box pipeline (no rules inferred)."""
import argparse
import html
import json
from pathlib import Path

from ddbg_extract import assemble, config as K, parse, stage1

ROOT = Path(__file__).resolve().parents[4]
LOCATION = Path("DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD")
COMPONENTS = {
    "monster_medium": "DD_EN_WEALD_CARDS_70_120_monsters_medium",
    "monster_large": "DD_EN_WEALD_CARDS_140x140_monster_large",
    "boss_ability": "DD_EN_WEALD_CARDS_70_120_Boss_Abilities",
    "curio": "DD_EN_WEALD_CARDS_63x88_CURIO",
    "room": "DD_EN_WEALD_CARDS_63x88_rooms",
    "stygian_room": "DD_EN_WEALD_CARDS_63x88_rooms_Stygian",
    "quest": "DD_EN_WEALD_CARDS_70_120_quests",
    "dungeon_tile": "DD_WEALD_TILES",
    "punchboard": "DD_EN_WEALD_PUNCHBOARD",
}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as stream:
        stream.write(json.dumps(value, ensure_ascii=False, indent=1) + "\n")


def review(raw, print_root, output):
    """Private image-backed review, never stored in the source tree."""
    import pymupdf

    output.mkdir(parents=True, exist_ok=True)
    sections = []
    docs = {}
    icons = {}
    try:
        for cat, obj in raw.items():
            sections.append(f"<h2 id='{cat}'>{cat}</h2>")
            for card in obj["cards"]:
                body = []
                for face_name, face in card["faces"].items():
                    rel = face["file"]
                    if rel not in docs:
                        docs[rel] = pymupdf.open(print_root / rel)
                    filename = f"{card['id'].replace(':', '-')}-{face_name}.png"
                    docs[rel][face["page"]-1].get_pixmap(
                        matrix=pymupdf.Matrix(1.5, 1.5), alpha=False
                    ).save(output / filename)
                    lines = "\n".join(line["text"] for line in face["lines"])
                    page = docs[rel][face["page"]-1]
                    for icon in face["icons"]:
                        iid = icon["iconId"]
                        if icon.get("decor") or iid in icons:
                            continue
                        x0, y0, x1, y1 = icon["bbox"]
                        trim = page.trimbox
                        clip = pymupdf.Rect(x0*72/25.4+trim.x0, y0*72/25.4+trim.y0,
                                            x1*72/25.4+trim.x0, y1*72/25.4+trim.y0)
                        image_name = f"icon-{iid}.png"
                        page.get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=clip,
                                        alpha=False).save(output / image_name)
                        icons[iid] = (image_name, card["id"], face_name, face["page"])
                    body.append(
                        f"<div><p>{face_name} · PDF p{face['page']}</p>"
                        f"<a href='{filename}'><img loading='lazy' src='{filename}'></a>"
                        f"<pre>{html.escape(lines)}</pre></div>"
                    )
                sections.append(
                    f"<article><h3>{card['id']} · pages {card['pages']}</h3>"
                    "<p>待审：文字、图标含义、布局；提取结果不代表核准。点击图像查看原尺寸。</p>"
                    f"<section>{''.join(body)}</section></article>"
                )
    finally:
        for doc in docs.values():
            doc.close()
    nav = " · ".join(f"<a href='#{cat}'>{cat}</a>" for cat in raw)
    dictionary = json.loads((ROOT / "packages/data/dictionary/icon-dictionary-v1.8.json")
                            .read_text(encoding="utf-8"))
    entries = {entry["iconId"]: entry for entry in dictionary["icons"]}
    icon_sections = ["<h2 id='icons'>图标待核对</h2><p>仅显示非 decor 聚类。"
                     "同 ID 的词典条目也须对照图像核实，不自动批准；未列出的 decor 仍须逐卡检查。</p>"]
    for iid, (filename, card_id, face_name, page_no) in sorted(icons.items()):
        entry = entries.get(iid)
        candidate = (f"词典同 ID（待核对）：{entry.get('status')} / {entry.get('key')} / "
                     f"{entry.get('meaning_zh')}" if entry else "词典无同 ID 条目，待命名")
        icon_sections.append(
            f"<article><h3>{iid}</h3><img src='{filename}' style='max-height:128px'>"
            f"<p>{html.escape(candidate)}</p><p>{card_id} · {face_name} · PDF p{page_no}</p></article>"
        )
    (output / "index.html").write_text(
        "<!doctype html><html lang='zh-CN'><meta charset='utf-8'>"
        "<title>Weald 卡面审阅</title><style>"
        "body{font:16px system-ui;margin:32px;background:#eee;color:#222}"
        "article{background:white;margin:24px 0;padding:20px}"
        "section{display:grid;grid-template-columns:1fr 1fr;gap:24px}"
        "img{max-width:100%;max-height:650px}pre{white-space:pre-wrap;overflow-wrap:anywhere}"
        "</style><h1>Weald 地点卡面审阅 · Q-186</h1>"
        "<p>私有本地审阅图，不提交仓库。图标 token 仅是本批聚类标识，不表示其含义。"
        "按印刷页核对文字、图标与几何；副本页码保留在标题中，此处展示首份副本。</p>"
        + "<a href='#icons'>图标待核对</a> · " + nav + "".join(sections + icon_sections)
        + "</html>", encoding="utf-8"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", type=Path, required=True, help="EN_FILES root")
    ap.add_argument("--out", type=Path, default=ROOT / "packages/data/extract/extension/weald")
    ap.add_argument("--review", action="store_true", help="render a private local review gallery")
    args = ap.parse_args()
    K.PRINT_ROOT = args.input.resolve()
    K.SOURCES = [
        (cat, (LOCATION / f"{stem}_FRONT.pdf").as_posix(),
         (LOCATION / f"{stem}_BACK.pdf").as_posix(),
         "sheet" if cat in ("dungeon_tile", "punchboard") else "card", "extension")
        for cat, stem in COMPONENTS.items()
    ]
    # Check every input before touching outputs. Cache and images stay private.
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            if not (K.PRINT_ROOT / rel).is_file():
                raise FileNotFoundError(K.PRINT_ROOT / rel)
    stage1.CACHE = ROOT / "node_modules/.cache/weald-extract"
    results = {}
    for _, front, back, _, _ in K.SOURCES:
        for rel in (front, back):
            print(f"Extracting {Path(rel).name}", flush=True)
            results[rel] = stage1.extract_file(rel)
    raw, _, _, _ = assemble.assemble(results)
    for cat, obj in raw.items():
        for card in obj["cards"]:
            card["id"] = card["id"].replace(":extension:", ":weald:", 1)
        # Never clear the directory: approved hero extractions live alongside these files.
        dump(args.out / "raw" / f"{cat}.json", obj)
        if cat in parse.PARSERS:
            # Weald skill badges are 17.46pt; summon quantities are 11pt.
            # Scope this layout threshold to Weald; retain the core default.
            rows = [parse.parse_monster(card, large=cat == "monster_large",
                                        skill_badge_min_size=14)
                    for card in obj["cards"]]
            # A missing printed identity line is a parser stop, never a guessed tag.
            for row in rows:
                if not row.get("type_position_raw"):
                    row["issues"].append("no type/position line parsed")
            failures = [dict(id=r["id"], pages=r["pages"], issues=r["issues"])
                        for r in rows if r["issues"]]
            dump(args.out / "parsed" / f"{cat}.json", dict(
                schema="ddbg-parsed-v0", extractor_version=K.EXTRACTOR_VERSION,
                category=cat, source=f"raw/extension/weald/{cat}.json",
                field_notes=parse.NOTES[cat],
                icon_token="{icon:<iconId>} = unannotated icon cluster, see icons/catalog.json",
                stats=dict(cards=len(rows), ok=len(rows)-len(failures), failed=len(failures),
                           success_rate=round(1-len(failures)/max(1, len(rows)), 4)),
                failures=failures, cards=rows))
        print(f"{cat}: {obj['n_pages']} pages / {obj['n_unique']} unique", flush=True)
    if args.review:
        review(raw, K.PRINT_ROOT, ROOT / "node_modules/.cache/weald-review/cards")


if __name__ == "__main__":
    main()
