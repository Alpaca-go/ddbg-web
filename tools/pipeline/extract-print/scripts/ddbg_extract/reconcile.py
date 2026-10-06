"""Component reconciliation: extracted page / unique / copy counts vs the core rulebook component list."""
import json
from collections import Counter, defaultdict
import pymupdf
from . import config as K

RB = K.RULEBOOK_COMPONENTS


def _ham(a, b):
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def back_groups(cards, src_set="base"):
    """Group cards by back design (whole-face perceptual hash of the back, threshold 8 bits)."""
    groups = []
    for c in cards:
        if c["source_set"] != src_set or "back" not in c["faces"]:
            continue
        h = c["faces"]["back"].get("face_phash")
        txt = " ".join(s["t"] for s in c["faces"]["back"]["spans"])
        for g in groups:
            if _ham(g["hash"], h) <= 8 and g["text"] == txt:
                g["pages"].extend(c["pages"])
                break
        else:
            groups.append(dict(hash=h, text=txt, pages=list(c["pages"])))
    return [dict(back_text=g["text"], n=len(g["pages"]), pages=_ranges(sorted(g["pages"]))) for g in groups]


def _ranges(ps):
    out, start, prev = [], None, None
    for p in ps:
        if start is None:
            start = prev = p
        elif p == prev + 1:
            prev = p
        else:
            out.append(f"{start}-{prev}" if start != prev else str(start))
            start = prev = p
    if start is not None:
        out.append(f"{start}-{prev}" if start != prev else str(start))
    return ",".join(out)


def _pages(d, ss="base"):
    return sum(s["front_pages"] for s in d["sources"] if s["source_set"] == ss)


def _uniq(d, ss="base"):
    return sum(1 for c in d["cards"] if c["source_set"] == ss)


def _ftext(c, face="front"):
    return " ".join(s["t"] for s in c["faces"].get(face, {}).get("spans", []))


def reconcile(raw, parsed):
    rows, notes = [], {}

    def row(item, rb, cats, pages, uniq, copies, explain):
        rows.append(dict(rulebook_item=item, rulebook_count=rb, extracted_from=cats, pages=pages, unique=uniq,
                         copies_total=copies, match=(pages == rb) if rb is not None else None, explanation=explain))

    d = raw["hero_skill"]
    heroes = Counter(p.get("hero") for p in parsed["hero_skill"])
    row("Hero Skill Cards", RB["Hero Skill Cards"], "hero_skill", _pages(d), _uniq(d), _pages(d),
        f"all pages unique; per-hero counts from card backs: {dict(heroes)} (None = Abomination double-faced transform cards, hero not printed)")
    d = raw["hero_stat"]
    row("Hero Cards", RB["Hero Cards"], "hero_stat", _pages(d), _uniq(d), _pages(d),
        "10 heroes x 2 double-sided cards (front I / back II, front III / blank back) + Abomination 3 cards (I, II, III) = 23")
    d = raw["hero_pvp"]
    add = [c for c in d["cards"] if c["source_set"] == "ADD_014"]
    base_by_text = {_ftext(c): c for c in d["cards"] if c["source_set"] == "base"}
    add_notes = []
    for c in add:
        b = base_by_text.get(_ftext(c))
        if b:
            bi = sorted((i["iconId"], tuple(round(v) for v in i["bbox"])) for i in b["faces"]["front"]["icons"])
            ai = sorted((i["iconId"], tuple(round(v) for v in i["bbox"])) for i in c["faces"]["front"]["icons"])
            nd = len(set(bi) ^ set(ai))
            add_notes.append(f"{c['id']} has the same front text as {b['id']} ({nd} icon placements differ)")
        else:
            add_notes.append(f"{c['id']} has no text-identical base card")
    row("Hero PvP Cards", RB["Hero PvP Cards"], "hero_pvp (base)", _pages(d), _uniq(d), _pages(d),
        "11 heroes x 2 cards (Abomination included); the ADD_014 folder holds 2 extra pages: " + "; ".join(add_notes))
    mm, ml, ba = raw["monster_medium"], raw["monster_large"], raw["boss_ability"]
    pm = {p["id"]: p for p in parsed["monster_medium"]}
    proxies = [p for p in parsed["monster_medium"] if p.get("card_kind") == "large_monster_reference" and p["id"].count(":") == 1]
    boss_like = [c for c in mm["cards"] if c["source_set"] == "base" and _ftext(c, "back").strip()]
    kinds = Counter("boss_abilities" if "ACTIONS / Round" in _ftext(c) else "boss_description" for c in ba["cards"])
    add_m = [c for c in mm["cards"] if c["source_set"] == "ADD_014"]
    add_names = Counter(pm[c["id"]].get("name") for c in add_m)
    base_names = {pm[c["id"]].get("name") for c in mm["cards"] if c["source_set"] == "base"}
    tot = _pages(mm) + _pages(ml) + _pages(ba)
    row("Monster & Boss Cards", RB["Monster & Boss Cards"], "monster_medium (base) + monster_large + boss_ability", tot,
        _uniq(mm) + _uniq(ml) + _uniq(ba), tot,
        f"medium {_pages(mm)} pages = {_uniq(mm)} unique cards (deck copies differ only by the monster-token colour marker; "
        f"{len(proxies)} are medium-size reference cards for large monsters; {len(boss_like)} pages carry a level numeral on the back, the rest do not) "
        f"+ large {_pages(ml)} + boss_ability {_pages(ba)} ({dict(kinds)}). ADD_014 adds {sum(c['copies'] for c in add_m)} medium pages = {len(add_m)} unique x copies {[c['copies'] for c in add_m]} "
        f"({sorted(add_names)}; same names already in base file: {sorted(n for n in add_names if n in base_names)}; front text identical to the base cards, "
        f"only the small token-colour marker icon differs) – not counted in the 168.")
    for cat, item in (("trinket", "Trinkets"), ("curio", "Curio Cards"), ("hamlet_event", "Hamlet Events"),
                      ("quest", "Quest Cards"), ("disease", "Diseases"), ("stygian_room", "Stygian Room Cards")):
        d = raw[cat]
        extra = ""
        if cat == "quest":
            extra = "back labels: " + json.dumps(dict(Counter(_ftext(c, "back") for c in d["cards"])))
        if cat == "trinket":
            extra = "back level numerals: " + json.dumps(dict(Counter(_ftext(c, "back") for c in d["cards"])))
        if cat == "curio":
            extra = "back designs: " + json.dumps(back_groups(d["cards"]))
        row(item, RB[item], cat, _pages(d), _uniq(d), sum(c["copies"] for c in d["cards"]), extra or "all pages unique")
    d = raw["quirk"]
    bg = back_groups(d["cards"])
    row("Positive + Negative Quirks", RB["Positive Quirks"] + RB["Negative Quirks"], "quirk", _pages(d), _uniq(d), _pages(d),
        f"17 + 18 = 35 matches the page count. 'Positive/Negative' is not printed as text on the cards; back designs: {json.dumps(bg)}")
    d = raw["virtue_affliction"]
    bg = back_groups(d["cards"])
    row("Virtues + Afflictions", RB["Virtues"] + RB["Afflictions"], "virtue_affliction", _pages(d), _uniq(d), _pages(d),
        f"5 + 5 = 10. The words 'Virtue'/'Affliction' are only in the back artwork (not text); back designs: {json.dumps(bg)}")
    d = raw["room"]
    boss = [c for c in d["cards"] if any(s["t"] == "BOSS" for s in c["faces"]["front"]["spans"])]
    nonboss = [c for c in d["cards"] if c not in boss]
    titles = [next((s["t"] for s in c["faces"]["front"]["spans"] if "\u2014" in s["t"]), "?") for c in d["cards"]]
    row("Room Cards + Boss Room Cards", RB["Room Cards"] + RB["Boss Room Cards"], "room", _pages(d), _uniq(d), _pages(d),
        f"RESOLVED from text: {len(nonboss)} cards without the printed word 'BOSS' (pages {_ranges(sorted(p for c in nonboss for p in c['pages']))}) "
        f"+ {len(boss)} cards with 'BOSS' (pages {_ranges(sorted(p for c in boss for p in c['pages']))}). Two numbering sequences: "
        f"{titles[:13]} and {titles[13:]}")
    d = raw["player_aid"]
    row("Player Aid Cards", RB["Player Aid Cards"], "player_aid", _pages(d), _uniq(d), sum(c["copies"] for c in d["cards"]),
        "8 pages = 2 distinct designs x 4 copies: " + ", ".join(f"{c['id']} x{c['copies']}" for c in d["cards"]))
    ini = [t for t in K.TEXT_FREE if t[1] == "initiative" and "FRONT" in t[0]][0]
    n_ini = pymupdf.open(K.PRINT_ROOT / ini[0]).page_count
    row("Initiative Cards", RB["Initiative Cards"], "initiative (text-free, manual entry)", n_ini, None, n_ini, "no text in PDF; page count only")
    return rows


def markdown(rows):
    h = ["| 规则书部件 | 规则书数量 | 提取来源 | 页数 | 不重复 | 副本合计 | 一致 | 说明 |", "|---|---|---|---|---|---|---|---|"]
    for r in rows:
        ok = "✅" if r["match"] else ("❌" if r["match"] is False else "–")
        h.append(f"| {r['rulebook_item']} | {r['rulebook_count']} | {r['extracted_from']} | {r['pages']} | {r['unique'] if r['unique'] is not None else '–'} | "
                 f"{r['copies_total']} | {ok} | {r['explanation'].replace('|', '/')} |")
    return "\n".join(h)
