"""First-pass structured parse of the highest-value categories, reading ONLY raw/corebox/<cat>.json.

Rules: only clearly labelled/printed fields are named. Numbers or icons whose meaning is not printed on
the card stay as `unlabeled_numbers` / icon-id lists with coordinates. Every parsed record keeps the raw
lines it was built from, plus `issues` (empty list == parse OK).
"""
import re

ROMAN = {"I": 1, "II": 2, "III": 3}
NUM = re.compile(r"^[+-]?\d+(-\d+)?t?,?$")


def cx(b):
    return (b[0] + b[2]) / 2


def cy(b):
    return (b[1] + b[3]) / 2


def vov(a, b):
    """vertical overlap ratio relative to the smaller height"""
    ov = min(a[3], b[3]) - max(a[1], b[1])
    return ov / max(0.01, min(a[3] - a[1], b[3] - b[1]))


def inside(b, box, frac=0.6):
    iw = min(b[2], box[2]) - max(b[0], box[0])
    ih = min(b[3], box[3]) - max(b[1], box[1])
    if iw <= 0 or ih <= 0:
        return False
    return iw * ih >= frac * max(0.01, (b[2] - b[0]) * (b[3] - b[1]))


def is_dwarf(s):
    return "Dwarven" in s["font"]


def join_tokens(spans, icons):
    """Join spans + non-decor icons (mm coords) into reading-order lines (upright text only)."""
    items = [dict(b=s["bbox"], tok=s["t"]) for s in spans] + \
            [dict(b=i["bbox"], tok="{icon:%s}" % i["iconId"]) for i in icons if not i.get("decor") and not i.get("container")]
    items.sort(key=lambda it: (cy(it["b"]), it["b"][0]))
    lines = []
    for it in items:
        for L in lines:
            if vov(it["b"], L["b"]) >= 0.5:
                L["items"].append(it)
                L["b"] = [min(L["b"][0], it["b"][0]), min(L["b"][1], it["b"][1]), max(L["b"][2], it["b"][2]), max(L["b"][3], it["b"][3])]
                break
        else:
            lines.append(dict(b=list(it["b"]), items=[it]))
    out = []
    for L in sorted(lines, key=lambda L: (round(cy(L["b"]), 0), L["b"][0])):
        L["items"].sort(key=lambda it: it["b"][0])
        out.append(" ".join(it["tok"] for it in L["items"]))
    return out


def crit_acc(spans):
    """Find printed 'Crit N' / 'Acc N' labels and the number printed right after each on the same row."""
    res = {}
    for key, rx in (("crit", r"^Crit\s+(\d+)$"), ("acc", r"^Acc\s+(\d+)$")):
        lab = [s for s in spans if re.match(rx, s["t"])]
        if not lab:
            continue
        s = sorted(lab, key=lambda s: (s["bbox"][1], s["bbox"][0]))[0]
        res[key] = int(re.match(rx, s["t"]).group(1))
        right = [o for o in spans if o is not s and re.match(r"^[+-]?\d+$", o["t"]) and vov(o["bbox"], s["bbox"]) >= 0.4
                 and 0 <= o["bbox"][0] - s["bbox"][2] <= 8]
        if right:
            v = min(right, key=lambda o: o["bbox"][0])
            res[key + "_value"] = int(v["t"])
            res["_used"] = res.get("_used", []) + [id(s), id(v)]
        else:
            res[key + "_value"] = None
            res["_used"] = res.get("_used", []) + [id(s)]
    # Label printed but its number is not purely numeric (e.g. a print typo like 'Acc 1O'):
    # keep the raw text, never auto-correct.
    for key, lab in (("crit", "Crit"), ("acc", "Acc")):
        if key not in res:
            odd = [s for s in spans if re.match(rf"^{lab}\s+\S+$", s["t"])]
            if odd:
                res["_issues"] = res.get("_issues", []) + [f"{lab} label with non-numeric value {odd[0]['t']!r} (kept raw, not corrected)"]
                res[key + "_raw"] = odd[0]["t"]
    return res


def left_icon(span, icons):
    cands = [i for i in icons if vov(i["bbox"], span["bbox"]) >= 0.3 and 0 <= span["bbox"][0] - i["bbox"][2] <= 3 and not i.get("decor")]
    return min(cands, key=lambda i: span["bbox"][0] - i["bbox"][2])["iconId"] if cands else None


def unlabeled(spans, icons, used):
    out = []
    for s in spans:
        if id(s) in used or not NUM.match(s["t"]):
            continue
        rec = dict(text=s["t"], bbox=s["bbox"])
        li = left_icon(s, icons)
        if li:
            rec["left_icon"] = li
        host = [i for i in icons if inside(s["bbox"], i["bbox"]) and not i.get("decor")]
        if host:
            rec["inside_icon"] = host[0]["iconId"]
        out.append(rec)
    return out


# ------------------------------------------------------------------ hero skill
def parse_hero_skill(card):
    F, B = card["faces"]["front"], card["faces"].get("back")
    fs, fi = F["spans"], F["icons"]
    issues = []
    r = dict(id=card["id"], copies=card["copies"], pages=card["pages"])
    nm = [s for s in fs if is_dwarf(s) and re.match(r"^(.+?)\s+(I{1,3})$", s["t"])]
    name_span = None
    if nm:
        name_span = max(nm, key=lambda s: s["size"])
        m = re.match(r"^(.+?)\s+(I{1,3})$", name_span["t"])
        r["name"], r["level"] = m.group(1), ROMAN[m.group(2)]
    else:
        issues.append("front: no 'Name <roman>' span")
    back_skill = [s for s in (B["spans"] if B else []) if is_dwarf(s) and re.match(r"^(.+?)\s+(I{1,3})$", s["t"])]
    if B and back_skill:
        # double-faced skill card (e.g. Abomination transform): the back is a second skill face, no hero name printed
        bsn = max(back_skill, key=lambda s: s["size"])
        m = re.match(r"^(.+?)\s+(I{1,3})$", bsn["t"])
        r["card_kind"] = "double_faced_skill"
        r["hero"] = None
        r["back_face_skill"] = dict(name=m.group(1), level=ROMAN[m.group(2)], lines_raw=[l["text"] for l in B["lines"]])
        if r.get("level") and ROMAN[m.group(2)] != r["level"]:
            issues.append("double-faced: front/back level differ")
    elif B:
        bs = B["spans"]
        heroes = [s for s in bs if re.match(r"^[A-Z][A-Z \-]{3,}$", s["t"])]
        if heroes:
            r["hero"] = max(heroes, key=lambda s: s["size"])["t"]
        else:
            issues.append("back: no hero name")
        lv = [s for s in bs if s["t"] in ROMAN]
        r["back_level"] = ROMAN[lv[0]["t"]] if lv else None
        others = [s["t"] for s in bs if s["t"] not in ROMAN and s["t"] != r.get("hero")]
        r["back_name"] = others[0] if others else None
        if r.get("name") and r["back_name"] != r["name"]:
            issues.append(f"front name {r.get('name')!r} != back name {r['back_name']!r}")
        if r.get("level") and r["back_level"] != r["level"]:
            issues.append("front/back level mismatch")
    ca = crit_acc(fs)
    used = set(ca.pop("_used", []))
    issues.extend(ca.pop("_issues", []))
    r.update(ca)
    if name_span:
        used.add(id(name_span))
        ny0 = name_span["bbox"][1]
        r["top_row_icons"] = [dict(iconId=i["iconId"], bbox=i["bbox"]) for i in sorted(fi, key=lambda i: i["bbox"][0])
                              if i["bbox"][3] <= ny0 + 1 and not i.get("decor") and (i["bbox"][2] - i["bbox"][0]) > 5]
        r["name_row_icons"] = [dict(iconId=i["iconId"], bbox=i["bbox"]) for i in fi
                               if i["bbox"][0] > name_span["bbox"][2] and i["bbox"][1] < name_span["bbox"][3] and i["bbox"][3] > ny0 - 2
                               and i not in [] and not i.get("decor") and (i["bbox"][2] - i["bbox"][0]) > 5
                               and dict(iconId=i["iconId"], bbox=i["bbox"]) not in r["top_row_icons"]]
    stat = [s for s in fs if re.match(r"^(Crit|Acc)\s+\d+$", s["t"])]
    lines = F["lines"]
    if stat:
        y1 = max(s["bbox"][3] for s in stat)
        y0 = min(s["bbox"][1] for s in stat)
        r["stats_line_raw"] = next((l["text"] for l in lines if re.search(r"\b(?:Crit|Acc)\s+\d+\b", l["text"])), None)
        r["effect_lines_raw"] = [l["text"] for l in lines if l["bbox"][1] >= y1 - 1 and not l.get("rot")]
    else:
        # no Crit/Acc printed: effect lines are everything below the name banner row
        y0 = name_span["bbox"][3] if name_span else 0
        r["stats_line_raw"] = None
        r["effect_lines_raw"] = [l["text"] for l in lines if l["bbox"][1] >= y0 + 1]
    r["unlabeled_numbers"] = unlabeled(fs, fi, used)
    for need in ("name", "level") + (("hero",) if r.get("card_kind") != "double_faced_skill" else ()):
        if not r.get(need):
            issues.append(f"missing {need}")
    r["issues"] = issues
    return r


# ------------------------------------------------------------------ monsters
def parse_monster(card, large=False):
    F = card["faces"]["front"]
    fs, fi = F["spans"], F["icons"]
    W, H = F["trim_mm"]
    issues = []
    r = dict(id=card["id"], copies=card["copies"], pages=card["pages"])
    if card.get("copy_variants"):
        r["copy_variants"] = card["copy_variants"]
    top = [s for s in fs if is_dwarf(s) and s["bbox"][1] < 12 and re.search(r"[A-Za-z]{2}", s["t"])]
    used = set()
    if top:
        ns = max(top, key=lambda s: s["size"])
        r["name"] = ns["t"]
        used.add(id(ns))
        sub = [s for s in fs if not is_dwarf(s) and 0 <= s["bbox"][1] - ns["bbox"][3] + 1.5 <= 4 and abs(s["bbox"][0] - ns["bbox"][0]) < 3]
        if sub:
            r["type_position_raw"] = sub[0]["t"]
            r["type_position_tags"] = [t.strip() for t in sub[0]["t"].split(" - ")]
            used.add(id(sub[0]))
    else:
        issues.append("no name")
    lv = [s for s in fs if s["t"] in ROMAN and is_dwarf(s) and s["bbox"][0] < 0.3 * W and s["bbox"][1] < 0.25 * H]
    if lv:
        r["level"] = ROMAN[lv[0]["t"]]
        used.add(id(lv[0]))
    else:
        issues.append("no level")
    if not large and "Large" in r.get("type_position_tags", []):
        # medium-size deck card standing in for a large monster (shows a miniature of the large card; its own
        # text is the embedded mini-card). Only header fields are parsed; full data is in monster_large.
        r["card_kind"] = "large_monster_reference"
        r["lines_raw"] = [l["text"] for l in F["lines"]]
        r["issues"] = issues
        return r
    # Life (HP): number printed inside the heart icon at the right edge (rulebook p.24 anatomy: 'Life').
    hp = [s for s in fs if re.match(r"^\d+$", s["t"]) and is_dwarf(s) and s["bbox"][0] > 0.78 * W and s["size"] >= 12
          and any(inside(s["bbox"], i["bbox"]) for i in fi)]
    if hp:
        h = max(hp, key=lambda s: s["size"])
        r["hp"] = int(h["t"])
        r["hp_icon"] = next(i["iconId"] for i in fi if inside(h["bbox"], i["bbox"]))
        used.add(id(h))
    else:
        issues.append("no hp")
    # Resistances / Immunities panel: icon ids under each printed label (meaning of icons not named)
    lab = next((s for s in fs if s["t"].startswith("Resistances")), None)
    if lab:
        used.add(id(lab))
        mid = cx(lab["bbox"])
        under = [i for i in fi if not i.get("decor") and not i.get("container") and i["bbox"][1] >= lab["bbox"][3] - 0.3 and cy(i["bbox"]) <= lab["bbox"][3] + 11
                 and lab["bbox"][0] - 3 <= cx(i["bbox"]) <= lab["bbox"][2] + 3 and (i["bbox"][2] - i["bbox"][0]) < 9]
        r["resistances_icons"] = [i["iconId"] for i in sorted(under, key=lambda i: i["bbox"][0]) if cx(i["bbox"]) < mid]
        r["immunities_icons"] = [i["iconId"] for i in sorted(under, key=lambda i: i["bbox"][0]) if cx(i["bbox"]) >= mid]
    # the Life cell (icon + number) sits beside skill 1 on large cards; keep it out of skill blocks
    hp_box = next((i["bbox"] for i in fi if r.get("hp_icon") and i["iconId"] == r["hp_icon"] and hp and inside(h["bbox"], i["bbox"])), None)

    def in_life_cell(b):
        return hp_box is not None and cx(b) >= hp_box[0] - 0.5 and b[1] < hp_box[3] + 0.5 and b[3] > hp_box[1] - 0.5

    # skills: header = digit inside a badge + Dwarven name to its right on the same row
    heads = []
    for s in fs:
        if s["t"] in ("1", "2", "3") and is_dwarf(s) and s["size"] >= 10:
            nm = [o for o in fs if is_dwarf(o) and re.search(r"[A-Za-z]{3}", o["t"]) and vov(o["bbox"], s["bbox"]) >= 0.3
                  and 0 < o["bbox"][0] - s["bbox"][2] < 8 and not re.match(r"^(Crit|Acc)(?:\s+\d+)?$", o["t"])]
            if nm:
                heads.append((s, min(nm, key=lambda o: o["bbox"][0])))
    footer_y = 0.86 * H if not large else 0.875 * H
    heads.sort(key=lambda h: (h[0]["bbox"][1], h[0]["bbox"][0]))
    skills = []
    for k, (num, nm) in enumerate(heads):
        x0 = num["bbox"][0] - 2
        right = [h for h in heads if h[0]["bbox"][0] > num["bbox"][0] + 10 and vov(h[0]["bbox"], num["bbox"]) >= -50
                 and abs(h[0]["bbox"][1] - num["bbox"][1]) < 14]
        x1 = min([h[0]["bbox"][0] - 2 for h in right] + [W])
        below = [h for h in heads if h[0]["bbox"][1] > num["bbox"][1] + 3 and abs(h[0]["bbox"][0] - num["bbox"][0]) < 10]
        y_next = min([h[0]["bbox"][1] for h in below] + [footer_y])
        y0 = num["bbox"][1] - 3.5
        y1 = y_next - 3.5 if below else footer_y
        box = [x0, y0, x1, y1]
        bsp = [s for s in fs if x0 <= cx(s["bbox"]) <= x1 and y0 <= cy(s["bbox"]) <= y1 and not in_life_cell(s["bbox"])]
        bic = [i for i in fi if x0 <= cx(i["bbox"]) <= x1 and y0 <= cy(i["bbox"]) <= y1 and not in_life_cell(i["bbox"])]
        sk = dict(slot=int(num["t"]), name=nm["t"], block_bbox=[round(v, 2) for v in box])
        used.update({id(num), id(nm)})
        tg = [s for s in bsp if "Italic" in s["font"] and s["bbox"][1] < num["bbox"][3] + 1]
        if tg:
            sk["target"] = " ".join(s["t"] for s in sorted(tg, key=lambda s: s["bbox"][0]))
            used.update(id(s) for s in tg)
        ca = crit_acc(bsp)
        used.update(ca.pop("_used", []))
        issues.extend(f"skill {sk['slot']}: {m}" for m in ca.pop("_issues", []))
        sk.update(ca)
        stat_y1 = max([s["bbox"][3] for s in bsp if re.match(r"^(Crit|Acc)\s+\d+$", s["t"])] + [num["bbox"][3]])
        eff_sp = [s for s in bsp if s["bbox"][1] >= stat_y1 - 0.5 and id(s) not in used]
        eff_ic = [i for i in bic if i["bbox"][1] >= stat_y1 - 0.5]
        sk["effect_lines_raw"] = join_tokens(eff_sp, eff_ic)
        sk["lines_raw"] = join_tokens(bsp, bic)
        sk["unlabeled_numbers"] = unlabeled([s for s in bsp if s["bbox"][1] < stat_y1 - 0.5], bic, used)
        skills.append(sk)
    if not skills:
        issues.append("no skills found")
    r["skills"] = sorted(skills, key=lambda s: s["slot"])
    slots = [s["slot"] for s in r["skills"]]
    if slots != list(range(1, len(slots) + 1)):
        issues.append(f"skill slots not consecutive: {slots}")
    first_head = min([h[0]["bbox"][1] for h in heads] + [footer_y])
    r["header_unlabeled_numbers"] = unlabeled([s for s in fs if s["bbox"][3] < first_head - 3], fi, used)
    r["footer_lines_raw"] = join_tokens([s for s in fs if cy(s["bbox"]) >= footer_y], [i for i in fi if cy(i["bbox"]) >= footer_y])
    B = card["faces"].get("back")
    if B:
        r["back_texts"] = [s["t"] for s in B["spans"]]
    r["issues"] = issues
    return r


# ------------------------------------------------------------------ trinket
def parse_trinket(card):
    F = card["faces"]["front"]
    fs, fi = F["spans"], F["icons"]
    W, H = F["trim_mm"]
    issues = []
    r = dict(id=card["id"], copies=card["copies"], pages=card["pages"])
    halves = {}
    for half, rot, cond in (("upright_half", 0, lambda b: cy(b) < H / 2), ("inverted_half", 180, lambda b: cy(b) >= H / 2)):
        sp = [s for s in fs if cond(s["bbox"])]
        names = [s for s in sp if is_dwarf(s) and s["size"] >= 11.5 and re.search(r"[A-Za-z]{3}", s["t"]) and s.get("rot", 0) == rot]
        lv = [s for s in sp if s["t"] in ROMAN]
        h = dict()
        if names:
            h["name"] = max(names, key=lambda s: s["size"])["t"]
        if lv:
            h["level"] = ROMAN[lv[0]["t"]]
        rest = [s for s in sp if s not in names and s not in lv]
        ic = [i for i in fi if cond(i["bbox"]) and (i["bbox"][2] - i["bbox"][0]) < 12]
        lines = [l["text"] for l in F["lines"] if cond(l["bbox"])]
        name = h.get("name")
        h["effect_lines_raw"] = [l for l in lines if l.replace("{icon:", "").strip() and not (name and l.endswith(name)) and not re.match(r"^(\{icon:\w+\} )*I{1,3}$", l) and not re.match(r"^\{icon:\w+\}$", l)]
        h["printed_rotation"] = rot
        halves[half] = h
    r.update(halves)
    r["name"] = halves["upright_half"].get("name")
    r["level"] = halves["upright_half"].get("level")
    if not r["name"]:
        issues.append("no name")
    if not r["level"]:
        issues.append("no level")
    if halves["inverted_half"].get("name") != r["name"]:
        issues.append("inverted-half name differs / missing")
    if not halves["upright_half"]["effect_lines_raw"]:
        issues.append("no upright effect text")
    if not halves["inverted_half"]["effect_lines_raw"]:
        issues.append("no inverted effect text")
    B = card["faces"].get("back")
    if B:
        lv = [s["t"] for s in B["spans"] if s["t"] in ROMAN]
        r["back_level"] = ROMAN[lv[0]] if lv else None
        if r["level"] and r["back_level"] != r["level"]:
            issues.append("front/back level mismatch")
    r["issues"] = issues
    return r


PARSERS = {
    "hero_skill": parse_hero_skill,
    "monster_medium": lambda c: parse_monster(c, large=False),
    "monster_large": lambda c: parse_monster(c, large=True),
    "trinket": parse_trinket,
}

NOTES = {
    "hero_skill": "name/level from the front 'Name <roman>' title; hero from the back; crit/acc = number printed in the label "
                  "('Crit 0', 'Acc 9'); *_value = number printed immediately right of the label (inside the burst icon). "
                  "unlabeled_numbers: every other printed number, with the icon just left of it - NOT named until the icon dictionary is confirmed.",
    "monster_medium": "name/type_position/level/skills as printed. hp = number inside the heart icon at the right edge; the rulebook "
                      "(Core rules p.24 'Anatomy of a Monster Card') labels that element 'Life'. Other header numbers are kept unlabeled. "
                      "resistances_icons/immunities_icons = icon ids under the printed labels (icon meaning not named). "
                      "copy_variants = per-copy differing marker icon (Core rules p.17: 'note the color of the Monster Token displayed on each Monster Card').",
    "trinket": "Two-headed card: upright_half (upper half) and inverted_half (lower half, printed upside down). The rulebook says every "
               "trinket has a positive and a negative side; which half is which is NOT asserted here.",
}
NOTES["monster_large"] = NOTES["monster_medium"]
