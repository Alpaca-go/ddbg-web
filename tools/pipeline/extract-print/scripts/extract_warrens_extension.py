#!/usr/bin/env python3
"""Extract Warrens Antiquarian / Leper from TDH print PDFs → packages/data/extract/extension/warrens."""
import json
import shutil
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ddbg_extract import assemble, cluster, config as K, pageextract as P  # noqa: E402

TDH = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_10_EN_The Darkest Heroes"
SKILL_F = f"{TDH}/DD_EN_THE_DARKEST_HEROES_CARDS_44x68_SKILLS_FRONT.pdf"
SKILL_B = f"{TDH}/DD_EN_THE_DARKEST_HEROES_CARDS_44x68_SKILLS_BACK.pdf"
STAT_F = f"{TDH}/DD_EN_THE_DARKEST_HEROES_CARDS_100x180_Hero_STAT_FRONT.pdf"
STAT_B = f"{TDH}/DD_EN_THE_DARKEST_HEROES_CARDS_100x180_Hero_STAT_BACK.pdf"

K.PRINT_ROOT = ROOT / "ddbg-print"
OUT = ROOT / "packages/data/extract/extension/warrens"

# TDH SKILLS FRONT：Leper p274–294、Antiquarian p295–315（与 #286 登记页 253–273 / 232–252 版次不同，见 Q-103）。
SKILL_PAGES = list(range(274, 316))
STAT_FRONT = {
    28: "hero_stat:warrens:leper:p001",
    29: "hero_stat:warrens:leper:p002",
    30: "hero_stat:warrens:antiquarian:p001",
    31: "hero_stat:warrens:antiquarian:p002",
}
STAT_BACK = {28: "hero_stat:warrens:leper:p001", 30: "hero_stat:warrens:antiquarian:p001"}


def _r(rect):
    return [round(rect.x0, 2), round(rect.y0, 2), round(rect.x1, 2), round(rect.y1, 2)]


def stage1_pages(rel: str, page_nums: list[int]) -> dict:
    import imagehash
    import pymupdf
    from PIL import Image

    path = str(K.PRINT_ROOT / rel)
    doc = pymupdf.open(path)
    clean = P.make_clean_doc(path)
    pages = []
    for num in page_nums:
        p = doc[num - 1]
        tb = p.trimbox
        spans = P.extract_spans(p)
        for s in spans:
            s["bbox"] = [round(v, 2) for v in s["bbox"]]
            s["origin"] = [round(v, 2) for v in s["origin"]]
        comps = P.group_elements(P.extract_elements(p))
        icons = []
        cp = clean[num - 1]
        for c in comps:
            sig = P.signature(cp, c["rect"])
            icons.append(
                dict(
                    rect=_r(c["rect"]),
                    core=_r(c["core"]),
                    n_layers=c["n_layers"],
                    n_img=c["n_img"],
                    n_vec=c["n_vec"],
                    container=c["container"],
                    sig=sig,
                )
            )
        pix = p.get_pixmap(matrix=pymupdf.Matrix(0.3, 0.3), clip=tb, alpha=False)
        face_hash = str(imagehash.phash(Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")))
        pages.append(
            dict(page=num, trim_pt=[round(tb.width, 2), round(tb.height, 2)], face_phash=face_hash, spans=spans, icons=icons)
        )
    return dict(file=rel, n_pages=doc.page_count, pages=pages)


def cluster_assign(*stage1_docs: dict) -> None:
    sigs = []
    order = []
    for doc in stage1_docs:
        for pg in doc["pages"]:
            for ic in pg["icons"]:
                sigs.append(ic["sig"])
                order.append(ic)
    ids, _ = cluster.cluster(sigs)
    for ic, iid in zip(order, ids):
        ic["iconId"] = iid


def build_skill_cards(front_doc, back_doc) -> list[dict]:
    by_page_f = {p["page"]: p for p in front_doc["pages"]}
    by_page_b = {p["page"]: p for p in back_doc["pages"]}
    decor = {}
    cards = []
    for page in SKILL_PAGES:
        pg_f = by_page_f[page]
        pg_b = by_page_b[page]
        faces = {
            "front": assemble.build_face(pg_f, SKILL_F, decor),
            "back": assemble.build_face(pg_b, SKILL_B, decor),
        }
        cards.append(
            dict(
                id=f"hero_skill:p{page:03d}",
                source_set="extension",
                copies=1,
                pages=[page],
                faces=faces,
            )
        )
    return cards


def build_stat_cards(front_doc, back_doc) -> list[dict]:
    by_page_f = {p["page"]: p for p in front_doc["pages"]}
    by_page_b = {p["page"]: p for p in back_doc["pages"]}
    decor = {}
    cards = []
    for page, cid in STAT_FRONT.items():
        faces = {"front": assemble.build_face(by_page_f[page], STAT_F, decor)}
        if page in by_page_b:
            faces["back"] = assemble.build_face(by_page_b[page], STAT_B, decor)
        cards.append(dict(id=cid, source_set="extension", copies=1, pages=[page], faces=faces))
    return cards


def _center(bbox):
    return ((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)


def load_corebox_icon_map() -> list[tuple[tuple[float, float], str]]:
    core_path = ROOT / "packages/data/extract/corebox/raw"
    out: list[tuple[tuple[float, float], str]] = []
    for name in ("hero_stat.json", "hero_skill.json"):
        data = json.loads((core_path / name).read_text(encoding="utf-8"))
        for card in data["cards"]:
            for face in card["faces"].values():
                if not face:
                    continue
                for ic in face.get("icons", []):
                    if ic.get("decor"):
                        continue
                    out.append((_center(ic["bbox"]), ic["iconId"]))
    return out


def remap_icon_ids(raw_obj: dict, ref: list[tuple[tuple[float, float], str]]) -> None:
    import re

    token_re = re.compile(r"\{icon:([0-9a-f]{10})\}")

    def nearest_id(bbox):
        cx, cy = _center(bbox)
        best_id, best_d = None, 999.0
        for (rx, ry), iid in ref:
            d = ((cx - rx) ** 2 + (cy - ry) ** 2) ** 0.5
            if d < best_d:
                best_d, best_id = d, iid
        return best_id if best_d <= 3.0 else None

    for card in raw_obj["cards"]:
        for face in card["faces"].values():
            if not face:
                continue
            old_to_new: dict[str, str] = {}
            for ic in face.get("icons", []):
                if ic.get("decor"):
                    continue
                old = ic["iconId"]
                new = nearest_id(ic["bbox"]) or old
                if new != old:
                    old_to_new[old] = new
                ic["iconId"] = new
            for line in face.get("lines", []):
                text = line["text"]
                for old, new in old_to_new.items():
                    text = text.replace(f"{{icon:{old}}}", f"{{icon:{new}}}")
                line["text"] = text


def main():
    skill_f = stage1_pages(SKILL_F, SKILL_PAGES)
    skill_b = stage1_pages(SKILL_B, SKILL_PAGES)
    cluster_assign(skill_f, skill_b)

    stat_f = stage1_pages(STAT_F, sorted(STAT_FRONT))
    stat_b = stage1_pages(STAT_B, sorted(STAT_FRONT))
    cluster_assign(stat_f, stat_b)

    skill_cards = build_skill_cards(skill_f, skill_b)
    stat_cards = build_stat_cards(stat_f, stat_b)

    ref_icons = load_corebox_icon_map()

    skill_raw = dict(
        schema="ddbg-raw-v1",
        extractor_version=K.EXTRACTOR_VERSION,
        category="hero_skill",
        kind="card",
        units=dict(
            length="mm",
            origin="top-left corner of the PDF TrimBox (card face, bleed excluded)",
            y_axis="down",
            font_size="pt",
        ),
        sources=[
            dict(
                front=SKILL_F,
                back=SKILL_B,
                source_set="extension",
                kind="card",
                front_pages=357,
                back_pages=357,
            )
        ],
        n_pages=len(SKILL_PAGES),
        n_unique=len(skill_cards),
        n_copies_total=len(skill_cards),
        cards=skill_cards,
    )
    remap_icon_ids(skill_raw, ref_icons)
    stat_raw = dict(
        schema="ddbg-raw-v1",
        extractor_version=K.EXTRACTOR_VERSION,
        category="hero_stat",
        kind="card",
        units=skill_raw["units"],
        sources=[
            dict(front=STAT_F, back=STAT_B, source_set="extension", kind="card", front_pages=35, back_pages=35)
        ],
        n_pages=len(STAT_FRONT),
        n_unique=len(stat_cards),
        n_copies_total=len(stat_cards),
        cards=stat_cards,
    )
    remap_icon_ids(stat_raw, ref_icons)

    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "raw").mkdir(parents=True)
    (OUT / "parsed").mkdir(parents=True)
    (OUT / "raw" / "hero_skill.json").write_text(json.dumps(skill_raw, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (OUT / "raw" / "hero_stat.json").write_text(json.dumps(stat_raw, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    from ddbg_extract import parse as parse_mod

    parsed = []
    failures = []
    for card in skill_cards:
        row = parse_mod.parse_hero_skill(card)
        if row.get("issues"):
            failures.append(dict(id=card["id"], pages=card["pages"], issues=row["issues"]))
        parsed.append(row)
    skill_parsed = dict(
        schema="ddbg-parsed-v0",
        extractor_version=K.EXTRACTOR_VERSION,
        category="hero_skill",
        source="raw/extension/warrens/hero_skill.json",  # noqa: schema literal
        field_notes="TDH skills p232–273 (Antiquarian + Leper).",
        icon_token="{icon:<iconId>} = unannotated icon cluster, see icons/catalog.json",
        stats=dict(
            cards=len(parsed),
            ok=len([c for c in parsed if not c.get("issues")]),
            failed=len(failures),
            success_rate=1 - len(failures) / max(len(parsed), 1),
        ),
        failures=failures,
        cards=parsed,
    )
    (OUT / "parsed" / "hero_skill.json").write_text(json.dumps(skill_parsed, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"skills={len(skill_cards)} stat={len(stat_cards)} parse_failures={len(failures)} → {OUT}")
    if failures:
        for f in failures[:5]:
            print(" ", f)


if __name__ == "__main__":
    main()
