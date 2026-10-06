"""Stage 2: cluster icons globally, build faces (spans/icons/lines in mm), dedupe deck copies,
flag decor clusters, write raw/corebox/<category>.json."""
import json, hashlib, statistics
from collections import defaultdict, Counter
from . import config as K
from . import cluster as CL

MM = 25.4 / 72.0


def mm(v):
    return round(v * MM, 2)


def bbox_mm(b):
    return [mm(b[0]), mm(b[1]), mm(b[2]), mm(b[3])]


# ---------------------------------------------------------------- lines (reading order)
def _to_frame(b, rot, W, H):
    """Transform a bbox (trim pt) into the reading frame of text with the given rotation."""
    x0, y0, x1, y1 = b
    if rot == 0:
        return [x0, y0, x1, y1]
    if rot == 180:
        return [W - x1, H - y1, W - x0, H - y0]
    if rot == 90:      # text running downwards
        return [y0, W - x1, y1, W - x0]
    return [H - y1, x0, H - y0, x1]   # 270: text running upwards


def build_lines(spans, icons, W, H):
    """Merge spans and (non-decor) icons into reading-order line segments."""
    items = []
    for s in spans:
        items.append(dict(kind="t", rot=s["rot"], b=s["bbox"], tok=s["t"], size=s["size"],
                          spb=s.get("sp_before", False), spa=s.get("sp_after", False)))
    rots_present = sorted({s["rot"] for s in spans}) or [0]
    for ic in icons:
        if ic.get("decor") or ic.get("container"):
            continue
        b = ic["_core_pt"]
        rot = 0
        if len(rots_present) > 1:   # assign the rotation of the nearest span
            cx, cy = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            best = min(spans, key=lambda s: (((s["bbox"][0] + s["bbox"][2]) / 2 - cx) ** 2 + ((s["bbox"][1] + s["bbox"][3]) / 2 - cy) ** 2))
            rot = best["rot"]
        items.append(dict(kind="i", rot=rot, b=b, tok="{icon:%s}" % ic["iconId"], size=None, spb=False, spa=False))
    out = []
    for rot in (0, 90, 180, 270):
        its = [dict(it, f=_to_frame(it["b"], rot, W, H)) for it in items if it["rot"] == rot]
        if not its:
            continue
        its.sort(key=lambda it: ((it["f"][1] + it["f"][3]) / 2, it["f"][0]))
        lines = []
        for it in its:
            y0, y1 = it["f"][1], it["f"][3]
            h = max(y1 - y0, 0.5)
            placed = False
            for L in lines:
                ov = min(y1, L["y1"]) - max(y0, L["y0"])
                if ov >= 0.5 * min(h, L["y1"] - L["y0"]):
                    L["items"].append(it)
                    if it["kind"] == "t":
                        L["y0"], L["y1"] = min(L["y0"], y0), max(L["y1"], y1)
                    placed = True
                    break
            if not placed:
                lines.append(dict(y0=y0, y1=y1, items=[it]))
        for L in lines:
            L["items"].sort(key=lambda it: it["f"][0])
            # split into segments at large horizontal gaps (columns)
            segs, cur = [], []
            for it in L["items"]:
                if cur:
                    gap = it["f"][0] - max(c["f"][2] for c in cur)
                    ref = max([c["size"] for c in cur if c["size"]] + [it["size"] or 0, 7])
                    if gap > 2.2 * ref:
                        segs.append(cur)
                        cur = []
                cur.append(it)
            if cur:
                segs.append(cur)
            for sg in segs:
                txt = ""
                prev = None
                for it in sg:
                    if prev is not None:
                        gap = it["f"][0] - prev["f"][2]
                        ref = (prev["size"] or it["size"] or 7)
                        if gap > 0.2 * ref or it["kind"] == "i" or prev["kind"] == "i" or prev["spa"] or it["spb"]:
                            txt += " "
                    txt += it["tok"]
                    prev = it
                fx0 = min(it["f"][0] for it in sg); fy0 = min(it["f"][1] for it in sg)
                fx1 = max(it["f"][2] for it in sg); fy1 = max(it["f"][3] for it in sg)
                ob = [min(it["b"][0] for it in sg), min(it["b"][1] for it in sg),
                      max(it["b"][2] for it in sg), max(it["b"][3] for it in sg)]
                out.append(dict(rot=rot, _fy=(fy0 + fy1) / 2, _fx=fx0, text=txt, bbox=bbox_mm(ob)))
    out.sort(key=lambda l: (l["rot"], round(l["_fy"], 0), l["_fx"]))
    for l in out:
        del l["_fy"], l["_fx"]
    return out


# ---------------------------------------------------------------- decor detection
def detect_decor(occ, face_pages, face_area):
    """occ: iconId -> list of occurrence dicts (cat, face, page, core_pt, rect_pt, container, near_text).
    face_pages: (cat, face) -> number of pages.  Returns iconId -> reason (decor) ."""
    decor = {}
    for iid, lst in occ.items():
        n = len(lst)
        if sum(o["blank"] for o in lst) >= 0.8 * n:
            decor[iid] = "blank after removing art/text (text plate or art fragment)"
            continue
        if sum(o["container"] for o in lst) >= 0.8 * n:
            decor[iid] = "panel/container (holds other elements)"
            continue
        txt = Counter(o["inner_text"] for o in lst)
        top, topn = txt.most_common(1)[0]
        if top and topn >= 0.9 * n and sum(ch.isalpha() for ch in top) >= 3:
            decor[iid] = f"text plate: always holds the printed label '{top}' (meaning carried by the text)"
            continue
        thin = [o for o in lst if max(o["rect"][2] - o["rect"][0], o["rect"][3] - o["rect"][1]) >
                6 * max(0.1, min(o["rect"][2] - o["rect"][0], o["rect"][3] - o["rect"][1]))]
        if len(thin) >= 0.8 * n:
            decor[iid] = "thin rule/bar (aspect ratio > 6)"
            continue
        big = [o for o in lst if (o["rect"][2] - o["rect"][0]) * (o["rect"][3] - o["rect"][1]) > 0.12 * face_area[(o["cat"], o["face"])]]
        if len(big) >= 0.8 * n:
            decor[iid] = "large background element (>12% of face)"
            continue
        by_face = defaultdict(list)
        for o in lst:
            by_face[(o["cat"], o["face"])].append(o)
        template_faces = 0
        for cf, ol in by_face.items():
            pages = {o["page"] for o in ol}
            if face_pages[cf] >= 4 and len(pages) >= 0.9 * face_pages[cf]:
                cxs = [(o["core"][0] + o["core"][2]) / 2 for o in ol]
                cys = [(o["core"][1] + o["core"][3]) / 2 for o in ol]
                if len(ol) <= 1.15 * len(pages) and statistics.pstdev(cxs) * MM < 1.0 and statistics.pstdev(cys) * MM < 1.0 \
                        and sum(o["near_text"] for o in ol) <= 0.2 * len(ol):
                    template_faces += 1
        if template_faces and template_faces == len(by_face):
            decor[iid] = "fixed template element on >=90% of faces, no adjacent text"
    return decor


def _inner_text(rect, spans):
    """Text strings whose bbox lies >=60% inside the composite."""
    x0, y0, x1, y1 = rect
    out = []
    for s in spans:
        b = s["bbox"]
        a = max(0.01, (b[2] - b[0]) * (b[3] - b[1]))
        iw = min(x1, b[2]) - max(x0, b[0])
        ih = min(y1, b[3]) - max(y0, b[1])
        if iw > 0 and ih > 0 and iw * ih >= 0.6 * a:
            out.append(s["t"])
    return " ".join(out)


def _near_text(core, spans):
    """True if a text span overlaps the composite or sits next to it on the same line (within 2 mm)."""
    x0, y0, x1, y1 = core
    pad = 2.0 / MM
    for s in spans:
        b = s["bbox"]
        vo = min(y1, b[3]) - max(y0, b[1])
        if vo <= 0.3 * min(y1 - y0, b[3] - b[1]):
            continue
        if b[0] <= x1 + pad and b[2] >= x0 - pad:
            return True
    return False


# ---------------------------------------------------------------- main assembly
def assemble(stage1_results):
    """stage1_results: rel_path -> stage1 dict.  Returns dict category -> output JSON object, plus icon occurrence
    data for the catalog."""
    # 1. collect occurrences (one per composite) and cluster globally
    occ_refs, sigs = [], []
    for cat, f, b, kind, ss in K.SOURCES:
        for face, rel in (("front", f), ("back", b)):
            if not rel:
                continue
            for pg in stage1_results[rel]["pages"]:
                for ic in pg["icons"]:
                    occ_refs.append((cat, face, rel, pg["page"], ic, pg))
                    sigs.append(ic["sig"])
    ids, leaders = CL.cluster(sigs)
    occ = defaultdict(list)
    face_pages = Counter()
    face_area = {}
    seen_faces = set()
    for (cat, face, rel, page, ic, pg), iid in zip(occ_refs, ids):
        ic["iconId"] = iid
        occ[iid].append(dict(cat=cat, face=face, file=rel, page=page, core=ic["core"], rect=ic["rect"],
                             container=ic["container"], blank=ic["sig"].get("std", 99) < 4.0,
                             inner_text=_inner_text(ic["rect"], pg["spans"]), near_text=_near_text(ic["core"], pg["spans"])))
    for cat, f, b, kind, ss in K.SOURCES:
        for face, rel in (("front", f), ("back", b)):
            if rel and (cat, face, rel) not in seen_faces:
                seen_faces.add((cat, face, rel))
                face_pages[(cat, face)] += stage1_results[rel]["n_pages"]
                W, H = stage1_results[rel]["pages"][0]["trim_pt"]
                face_area[(cat, face)] = W * H
    decor = detect_decor(occ, face_pages, face_area)

    # 2. build faces and cards
    cats = defaultdict(lambda: dict(sources=[], cards=[]))
    for cat, f, b, kind, ss in K.SOURCES:
        F = stage1_results[f]
        B = stage1_results[b] if b else None
        src = dict(front=f, back=b, source_set=ss, kind=kind, front_pages=F["n_pages"],
                   back_pages=B["n_pages"] if B else None)
        if B and B["n_pages"] != F["n_pages"]:
            src["warning"] = "front/back page counts differ"
        cats[cat]["sources"].append(src)
        cats[cat]["kind"] = kind
        recs = []
        for i in range(F["n_pages"]):
            faces = [("front", F["pages"][i]), ("back", B["pages"][i] if B and i < B["n_pages"] else None)]
            card_faces, textparts, iconparts = {}, [], []
            for face, pg in faces:
                if pg is None:
                    continue
                card_faces[face] = build_face(pg, pg_file(f, b, face), decor)
                fc = card_faces[face]
                textparts.append(face + "|" + json.dumps([[x["t"], [round(v * 2) / 2 for v in x["bbox"]]] for x in fc["spans"]]))
                iconparts.extend((face, ic["iconId"], tuple(round(v * 2) / 2 for v in ic["bbox"])) for ic in fc["icons"])
            recs.append(dict(i=i, faces=card_faces, tsig="\n".join(textparts), icons=sorted(iconparts, key=lambda t: (t[0], t[2], t[1]))))
        for card in dedupe_copies(recs, cat, ss):
            cats[cat]["cards"].append(card)
    out = {}
    for cat, d in cats.items():
        n_pages = sum(s["front_pages"] for s in d["sources"])
        out[cat] = dict(
            schema="ddbg-raw-v1", extractor_version=K.EXTRACTOR_VERSION, category=cat, kind=d["kind"],
            units=dict(length="mm", origin="top-left corner of the PDF TrimBox (card face, bleed excluded)",
                       y_axis="down", font_size="pt"),
            sources=d["sources"], n_pages=n_pages, n_unique=len(d["cards"]),
            n_copies_total=sum(c["copies"] for c in d["cards"]), cards=d["cards"])
    return out, occ, decor, leaders


def pg_file(f, b, face):
    return f if face == "front" else b


def build_face(pg, file, decor):
    W, H = pg["trim_pt"]
    icons = []
    for ic in pg["icons"]:
        rec = dict(iconId=ic["iconId"], bbox=bbox_mm(ic["core"]))
        if ic["core"] != ic["rect"]:
            rec["bbox_full"] = bbox_mm(ic["rect"])
        if ic["iconId"] in decor:
            rec["decor"] = True
        if ic["container"]:
            rec["container"] = True
        rec["_core_pt"] = ic["core"]
        icons.append(rec)
    lines = build_lines(pg["spans"], icons, W, H)
    spans = []
    for s in pg["spans"]:
        r = dict(t=s["t"], bbox=bbox_mm(s["bbox"]), font=s["font"], size=s["size"], color=s["color"])
        if s["rot"]:
            r["rot"] = s["rot"]
        if s.get("ndup"):
            r["dup"] = s["ndup"]
        spans.append(r)
    for ic in icons:
        del ic["_core_pt"]
    return dict(file=file, page=pg["page"], trim_mm=[mm(W), mm(H)], face_phash=pg.get("face_phash"),
                spans=spans, icons=icons, lines=lines)


MARKER_MAX_MM = 6.0


def dedupe_copies(recs, cat, ss):
    """Deck copies: pages with identical text AND identical icons (ids+positions) are one card.
    Pages that are identical except for exactly one small icon at the same position (e.g. the coloured
    base-ring marker next to monster names: white/black/grey) are also merged; the differing icon is
    recorded per copy in copy_variants and flagged varies_between_copies on the canonical face."""
    groups = []
    for r in recs:
        hit = None
        for g in groups:
            if g["tsig"] != r["tsig"] or len(g["icons"]) != len(r["icons"]):
                continue
            diff = [k for k, (a, b) in enumerate(zip(g["icons"], r["icons"])) if a != b]
            if not diff:
                hit = (g, None)
                break
            if len(diff) == 1:
                a, b = g["icons"][diff[0]], r["icons"][diff[0]]
                bb = a[2]
                if a[0] == b[0] and a[2] == b[2] and max(bb[2] - bb[0], bb[3] - bb[1]) <= MARKER_MAX_MM \
                        and g.get("var_pos") in (None, diff[0]):
                    hit = (g, diff[0])
                    break
        if hit is None:
            groups.append(dict(tsig=r["tsig"], icons=r["icons"], recs=[r], var_pos=None))
        else:
            g, k = hit
            g["recs"].append(r)
            if k is not None:
                g["var_pos"] = k
    cards = []
    for g in groups:
        r0 = g["recs"][0]
        cid = f"{cat}:{'' if ss == 'base' else ss + ':'}p{r0['i'] + 1:03d}"
        card = dict(id=cid, source_set=ss, copies=len(g["recs"]), pages=[r["i"] + 1 for r in g["recs"]])
        if g["var_pos"] is not None:
            face, _, bb = g["icons"][g["var_pos"]]
            card["copy_variants"] = [dict(page=r["i"] + 1, face=face, iconId=r["icons"][g["var_pos"]][1]) for r in g["recs"]]
            for ic in r0["faces"][face]["icons"]:
                if tuple(round(v * 2) / 2 for v in ic["bbox"]) == bb:
                    ic["varies_between_copies"] = True
        card["faces"] = r0["faces"]
        cards.append(card)
    return cards
