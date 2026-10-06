"""Icon catalog for human annotation: crops (box-only, never committed), contact sheet HTML, CSV template."""
import csv, html, json, shutil
from collections import Counter, defaultdict
import pymupdf
from . import config as K

ICON_DIR = K.OUT_ROOT / "icons"
CROP_PX = 64


def _examples(raw, max_n=3):
    """iconId -> list of (category, card id, face, line text) - lines that contain the icon token."""
    ex = defaultdict(list)
    for cat, d in raw.items():
        for card in d["cards"]:
            for face, F in card["faces"].items():
                for l in F["lines"]:
                    t = l["text"]
                    if "{icon:" not in t:
                        continue
                    for part in t.split("{icon:")[1:]:
                        iid = part[:10]
                        lst = ex[iid]
                        if len(lst) < 12 and (cat, card["id"], face, t) not in lst:
                            lst.append((cat, card["id"], face, t))
    out = {}
    for iid, lst in ex.items():
        # prefer lines with text, from distinct categories
        lst = sorted(lst, key=lambda e: (-sum(ch.isalpha() for ch in e[3].replace("{icon:", "").split("}")[-1]), e[0], e[1]))
        pick, cats = [], set()
        for e in lst:
            if e[0] not in cats:
                pick.append(e)
                cats.add(e[0])
            if len(pick) == max_n:
                break
        for e in lst:
            if len(pick) >= max_n:
                break
            if e not in pick:
                pick.append(e)
        out[iid] = pick
    return out


def build(raw, occ, decor, leaders):
    if ICON_DIR.exists():
        shutil.rmtree(ICON_DIR)
    (ICON_DIR / "crops").mkdir(parents=True)
    (ICON_DIR / "decor").mkdir(parents=True)
    card_cats = set(K.CARD_CATEGORIES)
    ex = _examples(raw)
    rows = []
    for iid, lst in occ.items():
        cats = Counter(o["cat"] for o in lst)
        files = sorted({o["file"].split("/")[-1] for o in lst})
        n_card = sum(v for c, v in cats.items() if c in card_cats)
        n_cards = len({(o["file"], o["page"]) for o in lst})
        max_mm = max(leaders[iid]["w"], leaders[iid]["h"]) * 25.4 / 72
        if iid in decor:
            status = "decor"
        elif n_card and n_cards == 1 and max_mm >= 12:
            status = "likely_art"
        elif n_card == 0:
            status = "component_only"
        else:
            status = "annotate"
        rows.append(dict(iconId=iid, occurrences=len(lst), card_occurrences=n_card, categories=dict(cats.most_common()),
                         files=files, status=status, decor_reason=decor.get(iid),
                         size_mm=[round(leaders[iid]["w"] * 25.4 / 72, 1), round(leaders[iid]["h"] * 25.4 / 72, 1)],
                         examples=[dict(category=e[0], card=e[1], face=e[2], line=e[3]) for e in ex.get(iid, [])],
                         exemplar=dict(file=lst[0]["file"], page=lst[0]["page"], face=lst[0]["face"],
                                       rect_pt=[round(v, 2) for v in lst[0]["rect"]])))
    rows.sort(key=lambda r: (-r["occurrences"], r["iconId"]))
    # crops: rendered from the ORIGINAL page around the exemplar occurrence; small, for labelling only
    docs = {}
    for r in rows:
        e = r["exemplar"]
        if e["file"] not in docs:
            docs[e["file"]] = pymupdf.open(K.PRINT_ROOT / e["file"])
        p = docs[e["file"]][e["page"] - 1]
        tb = p.trimbox
        x0, y0, x1, y1 = e["rect_pt"]
        clip = pymupdf.Rect(x0 + tb.x0 - 1, y0 + tb.y0 - 1, x1 + tb.x0 + 1, y1 + tb.y0 + 1)
        z = min(6.0, CROP_PX / max(clip.width, clip.height))
        pix = p.get_pixmap(matrix=pymupdf.Matrix(z, z), clip=clip, alpha=False)
        sub = "decor" if r["status"] in ("decor", "likely_art") else "crops"
        pix.save(str(ICON_DIR / sub / f"{r['iconId']}.png"))
        r["crop"] = f"{sub}/{r['iconId']}.png"
    # stats
    ann = [r for r in rows if r["status"] == "annotate"]
    tot = sum(r["card_occurrences"] for r in ann)
    cov = {}
    for q in (0.8, 0.9, 0.95):
        acc, n = 0, 0
        for r in sorted(ann, key=lambda r: -r["card_occurrences"]):
            acc += r["card_occurrences"]
            n += 1
            if acc >= q * tot:
                break
        cov[q] = n
    n95 = cov[0.95]
    stats = dict(total_clusters=len(rows), total_occurrences=sum(r["occurrences"] for r in rows),
                 decor=sum(r["status"] == "decor" for r in rows),
                 component_only=sum(r["status"] == "component_only" for r in rows),
                 likely_art=sum(r["status"] == "likely_art" for r in rows),
                 clusters_for_80pct=cov[0.8], clusters_for_90pct=cov[0.9],
                 to_annotate=len(ann), to_annotate_occurrences=tot, clusters_for_95pct=n95,
                 to_annotate_ge3=sum(r["card_occurrences"] >= 3 for r in ann),
                 to_annotate_singletons=sum(r["card_occurrences"] == 1 for r in ann),
                 decor_reasons=dict(Counter((r["decor_reason"] or "").split(":")[0] for r in rows if r["status"] == "decor")))
    (ICON_DIR / "catalog.json").write_text(json.dumps(dict(stats=stats, clusters=rows), ensure_ascii=False, indent=1))
    _csv(ICON_DIR / "icon-dictionary-template.csv", ann)
    _csv(ICON_DIR / "icon-dictionary-components.csv", [r for r in rows if r["status"] == "component_only"])
    _csv(ICON_DIR / "likely-art.csv", [r for r in rows if r["status"] == "likely_art"])
    with open(ICON_DIR / "decor-list.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["iconId", "occurrences", "categories", "reason"])
        for r in rows:
            if r["status"] == "decor":
                w.writerow([r["iconId"], r["occurrences"], _cats(r), r["decor_reason"]])
    _html(rows, stats)
    return stats, rows


def _cats(r):
    return "; ".join(f"{c}:{n}" for c, n in r["categories"].items())


def _csv(path, rows):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["iconId", "occurrences", "categories", "example_context", "meaning_en", "meaning_zh", "kind", "notes"])
        for r in rows:
            ctx = " || ".join(f"[{e['card']} {e['face']}] {e['line']}" for e in r["examples"])
            w.writerow([r["iconId"], r["occurrences"], _cats(r), ctx, "", "", "", ""])


def _html(rows, stats):
    def table(sel, title, note=""):
        h = [f"<h2 id='{title.split()[0].lower()}'>{html.escape(title)} ({len(sel)})</h2><p>{note}</p>",
             "<table><tr><th>#</th><th>crop</th><th>iconId</th><th>occ.</th><th>size mm</th><th>categories</th><th>files</th><th>example lines</th></tr>"]
        for k, r in enumerate(sel, 1):
            exs = "<br>".join(f"<small>[{html.escape(e['card'])} {e['face']}]</small> {html.escape(e['line'])}" for e in r["examples"])
            extra = f"<br><small class=r>{html.escape(r['decor_reason'])}</small>" if r["decor_reason"] else ""
            h.append(f"<tr><td>{k}</td><td><img src='{r['crop']}' loading='lazy'></td><td><code>{r['iconId']}</code>{extra}</td>"
                     f"<td>{r['occurrences']}</td><td>{r['size_mm'][0]}×{r['size_mm'][1]}</td><td>{html.escape(_cats(r))}</td>"
                     f"<td><small>{html.escape(', '.join(r['files']))}</small></td><td>{exs}</td></tr>")
        h.append("</table>")
        return "\n".join(h)
    doc = ["<!doctype html><meta charset='utf-8'><title>DDBG core-box icon catalog</title>",
           "<style>body{font-family:sans-serif;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:3px;vertical-align:top;font-size:13px}"
           "img{max-width:64px;max-height:64px;background:#888}code{font-size:13px}.r{color:#a00}</style>",
           "<h1>DDBG core box – icon clusters for annotation</h1>",
           "<p><b>Box-only working material.</b> Crops are rendered from the print PDFs for labelling and must never be committed or shipped. "
           "Token <code>{icon:&lt;iconId&gt;}</code> in raw/parsed JSON refers to these ids.</p>",
           f"<pre>{html.escape(json.dumps(stats, indent=1))}</pre>",
           "<p><a href='#annotate'>annotate</a> · <a href='#likely'>likely art</a> · <a href='#component'>component-only</a> · <a href='#decor'>decor</a></p>",
           table([r for r in rows if r["status"] == "annotate"], "Annotate – clusters that occur on cards",
                 "Sorted by occurrence count. Fill icon-dictionary-template.csv."),
           table([r for r in rows if r["status"] == "likely_art"], "Likely card art – single card, >=12 mm",
                 "Card-specific artwork (e.g. trinket pictures). Excluded from the annotation count; rescue any real icon by hand."),
           table([r for r in rows if r["status"] == "component_only"], "Component-only clusters (tiles, punchboards, hamlet board, sheets)",
                 "Not needed for card data; useful later for board/tile annotation."),
           table([r for r in rows if r["status"] == "decor"], "Decor – excluded automatically", "Reason under each id. Move back to annotation if wrong.")]
    (ICON_DIR / "index.html").write_text("\n".join(doc), encoding="utf-8")
