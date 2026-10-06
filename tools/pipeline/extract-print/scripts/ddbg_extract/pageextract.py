"""Per-page extraction: text spans, icon layer elements, composite grouping and icon signatures.

Coordinates inside this module are PDF points relative to the TRIM box top-left (y downwards).
Conversion to millimetres happens in assemble.py.
"""
import unicodedata
import pymupdf
import imagehash
from PIL import Image
from . import config as K

LIG = {"\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi", "\ufb04": "ffl"}


def _norm_text(t):
    for a, b in LIG.items():
        t = t.replace(a, b)
    return unicodedata.normalize("NFC", t.replace("\u00a0", " "))


def _rot(dirv):
    dx, dy = dirv
    if abs(dx) >= abs(dy):
        return 0 if dx > 0 else 180
    return 90 if dy > 0 else 270


def _iou(a, b):
    iw = min(a[2], b[2]) - max(a[0], b[0])
    ih = min(a[3], b[3]) - max(a[1], b[1])
    if iw <= 0 or ih <= 0:
        return 0.0
    inter = iw * ih
    ua = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - inter
    return inter / ua if ua > 0 else 0.0


def extract_spans(page):
    """Return deduplicated text spans inside the trim box.
    - bbox is tight around the non-whitespace glyphs (from rawdict char boxes);
    - sp_before/sp_after record stripped leading/trailing whitespace (used when joining lines);
    - InDesign emits the same text twice (stroke + fill, sometimes a shadow copy slightly offset):
      spans with identical text and IoU >= 0.5 are merged; 'ndup' counts the copies and 'colors'
      lists all colours (last = fill colour, which is kept as 'color')."""
    tb = page.trimbox
    ox, oy = tb.x0, tb.y0
    flags = pymupdf.TEXT_PRESERVE_WHITESPACE | pymupdf.TEXT_MEDIABOX_CLIP
    out = []
    for b in page.get_text("rawdict", flags=flags)["blocks"]:
        for l in b.get("lines", []):
            rot = _rot(l["dir"])
            for s in l["spans"]:
                chars = s.get("chars", [])
                raw = "".join(c["c"] for c in chars)
                if not raw.strip():
                    continue
                ink = [c for c in chars if not c["c"].isspace()]
                x0 = min(c["bbox"][0] for c in ink); y0 = min(c["bbox"][1] for c in ink)
                x1 = max(c["bbox"][2] for c in ink); y1 = max(c["bbox"][3] for c in ink)
                cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
                if not (tb.x0 <= cx <= tb.x1 and tb.y0 <= cy <= tb.y1):
                    continue   # slug / bleed text
                t = _norm_text(raw)
                rec = dict(t=t.strip(), bbox=[x0 - ox, y0 - oy, x1 - ox, y1 - oy],
                           font=s["font"].split("+")[-1], size=round(s["size"], 2),
                           color="#%06x" % s["color"], rot=rot,
                           origin=[s["origin"][0] - ox, s["origin"][1] - oy])
                if raw[:1].isspace():
                    rec["sp_before"] = True
                if raw[-1:].isspace():
                    rec["sp_after"] = True
                dup = False
                for o in out:
                    if o["t"] == rec["t"] and o["rot"] == rot and _iou(o["bbox"], rec["bbox"]) >= 0.5:
                        dup = True
                        o["ndup"] = o.get("ndup", 1) + 1
                        o.setdefault("colors", [o["color"]])
                        if rec["color"] not in o["colors"]:
                            o["colors"].append(rec["color"])
                        o["color"] = rec["color"]   # stroke first, fill last -> keep fill colour
                        break
                if not dup:
                    out.append(rec)
    return out


def _inside_frac(r, tb):
    a = r.get_area()
    if a <= 0:
        return 0.0
    return (r & tb).get_area() / a


def extract_elements(page, art_xrefs=None):
    """Icon-layer candidates: small placed images (not soft-mask helper images) and small vector paths.
    Returns list of dict(kind, rect(pt, trim-relative), xref)."""
    tb = page.trimbox
    els = []
    for im in page.get_image_info(xrefs=True):
        r = pymupdf.Rect(im["bbox"])
        if _inside_frac(r, tb) < 0.5:
            continue
        r = r & tb
        w, h = r.width, r.height
        if max(w, h) > K.ICON_MAX_SIDE or w * h > K.ICON_MAX_AREA or min(w, h) < 0.8:
            continue
        if im["xref"] == 0 and im["colorspace"] == 1:
            continue   # luminosity soft-mask helper images (drop shadows/glows) - not visible on their own
        els.append(dict(kind="img", rect=r, xref=im["xref"]))
    for dr in page.get_drawings():
        r = pymupdf.Rect(dr["rect"])
        if r.width < 0 or r.height < 0:
            r.normalize()
        if max(r.width, r.height) < K.MIN_VEC_SIDE:
            continue
        if r.get_area() <= 0:
            continue   # pure lines (separators, crop marks)
        if min(r.width, r.height) < 1.2 and max(r.width, r.height) > 6 * max(min(r.width, r.height), 0.01):
            continue   # thin rules / separators drawn as filled rects
        if _inside_frac(r, tb) < 0.5:
            continue
        r = r & tb
        if max(r.width, r.height) > K.ICON_MAX_SIDE or r.get_area() > K.ICON_MAX_AREA:
            continue
        fo = dr.get("fill_opacity") or 0
        so = dr.get("stroke_opacity") or 0
        if (dr.get("fill") is None or fo == 0) and (dr.get("color") is None or so == 0):
            continue
        els.append(dict(kind="vec", rect=r, xref=None))
    # shift to trim-relative
    for e in els:
        e["rect"] = pymupdf.Rect(e["rect"].x0 - tb.x0, e["rect"].y0 - tb.y0, e["rect"].x1 - tb.x0, e["rect"].y1 - tb.y0)
    return els


def _contains(a, b, frac=0.9):
    ba = b.get_area()
    return ba > 0 and (a & b).get_area() >= frac * ba


def group_elements(els):
    """Group stacked layers into composite icons.
    Rule: two intersecting elements are layers of one icon when the smaller one's centre lies in the
    central 60% of the larger one and >=60% of the smaller one lies inside the larger (frames, glows,
    highlights, dim overlays). Badges sitting on a corner and neighbours touching via glows stay apart.
    'Containers' (panels holding >=2 disjoint elements) never merge with their content."""
    n = len(els)
    rects = [e["rect"] for e in els]
    areas = [r.get_area() for r in rects]
    container = [False] * n
    for i in range(n):
        inner = [j for j in range(n) if j != i and areas[j] >= 9 and areas[j] <= 0.6 * areas[i]
                 and _contains(rects[i], rects[j])]
        if len(inner) >= 2:
            # need two inner elements that do not overlap each other much
            ok = False
            for a in range(len(inner)):
                for b in range(a + 1, len(inner)):
                    ra, rb = rects[inner[a]], rects[inner[b]]
                    if (ra & rb).get_area() < 0.3 * min(areas[inner[a]], areas[inner[b]]):
                        ok = True
                        break
                if ok:
                    break
            container[i] = ok
    par = list(range(n))

    def f(i):
        while par[i] != i:
            par[i] = par[par[i]]
            i = par[i]
        return i
    order = sorted(range(n), key=lambda i: (rects[i].y0, rects[i].x0))
    for ii, i in enumerate(order):
        if container[i]:
            continue
        a = rects[i]
        for j in order[ii + 1:]:
            if container[j]:
                continue
            b = rects[j]
            if b.y0 > a.y1 + 0.5:
                break
            ax = pymupdf.Rect(a.x0 - .3, a.y0 - .3, a.x1 + .3, a.y1 + .3)
            if not ax.intersects(b):
                continue
            L, S = (a, b) if areas[i] >= areas[j] else (b, a)
            sa = S.get_area()
            merge = False
            if sa > 0:
                cx, cy = (S.x0 + S.x1) / 2, (S.y0 + S.y1) / 2
                lcx, lcy = (L.x0 + L.x1) / 2, (L.y0 + L.y1) / 2
                if abs(cx - lcx) <= 0.3 * L.width + 0.3 and abs(cy - lcy) <= 0.3 * L.height + 0.3 \
                        and (L & S).get_area() >= 0.6 * sa:
                    merge = True
            # small vector pieces of one glyph-like icon that touch each other
            if not merge and els[i]["kind"] == "vec" and els[j]["kind"] == "vec":
                U = a | b
                if max(a.width, a.height) < 12 and max(b.width, b.height) < 12 and max(U.width, U.height) <= 14:
                    merge = True
            if merge:
                par[f(i)] = f(j)
    groups = {}
    for i in range(n):
        groups.setdefault(f(i), []).append(i)
    comps = []
    for g in groups.values():
        r = pymupdf.Rect(rects[g[0]])
        for k in g[1:]:
            r |= rects[k]
        if max(r.width, r.height) < 2.0:
            continue
        kinds = sorted(els[k]["kind"] for k in g)
        imgs = [rects[k] for k in g if els[k]["kind"] == "img"]
        core = pymupdf.Rect(imgs[0]) if imgs else pymupdf.Rect(r)
        for q in imgs[1:]:
            core |= q
        comps.append(dict(rect=r, core=core, n_layers=len(g), n_img=kinds.count("img"), n_vec=kinds.count("vec"),
                          container=any(container[k] for k in g)))
    comps.sort(key=lambda c: (round(c["rect"].y0, 1), round(c["rect"].x0, 1)))
    return comps


def art_xrefs(doc):
    """xrefs of images that are only ever placed large (card art, panels). Never includes an xref that
    is also placed at icon size somewhere in the document."""
    big, small = set(), set()
    for p in doc:
        for im in p.get_image_info(xrefs=True):
            if im["xref"] == 0:
                continue
            r = pymupdf.Rect(im["bbox"])
            if max(r.width, r.height) > K.ICON_MAX_SIDE or r.get_area() > K.ICON_MAX_AREA:
                big.add(im["xref"])
            else:
                small.add(im["xref"])
    return big - small


def make_clean_doc(path):
    """Copy of the PDF with large art images made transparent and all text removed.
    Used only to render icon signatures independent of card art and printed numbers."""
    doc = pymupdf.open(path)
    arts = art_xrefs(doc)
    done = set()
    for p in doc:
        for x in [im[0] for im in p.get_images(full=True)]:
            if x in arts and x not in done:
                try:
                    p.delete_image(x)
                except Exception:
                    pass
                done.add(x)
        p.add_redact_annot(p.rect)
        p.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_NONE,
                           text=pymupdf.PDF_REDACT_TEXT_REMOVE)
    return doc


def signature(clean_page, rect):
    """Perceptual signature of the composite rendered from the cleaned page."""
    tb = clean_page.trimbox
    clip = pymupdf.Rect(rect.x0 + tb.x0, rect.y0 + tb.y0, rect.x1 + tb.x0, rect.y1 + tb.y0)
    pix = clean_page.get_pixmap(matrix=pymupdf.Matrix(K.RENDER_ZOOM, K.RENDER_ZOOM), clip=clip, alpha=False)
    im = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    ph = imagehash.phash(im.convert("L"), hash_size=8)
    small = im.resize((2, 2), Image.BOX)
    grid = [int(v) for px in small.getdata() for v in px]
    gray = im.convert("L")
    hist = gray.histogram()
    npx = max(1, sum(hist))
    mean = sum(i * c for i, c in enumerate(hist)) / npx
    std = (sum(c * (i - mean) ** 2 for i, c in enumerate(hist)) / npx) ** 0.5
    # hue histogram of saturated pixels (separates colour variants: dim / orange / yellow ...)
    hsv = im.convert("HSV").resize((24, 24), Image.BOX)
    bins = [0] * 12
    nsat = 0
    for hh, ss, vv in hsv.getdata():
        if ss > 90 and vv > 64:
            nsat += 1
            bins[min(11, hh * 12 // 256)] += 1
    hue = [round(b / nsat, 3) if nsat else 0.0 for b in bins]
    return dict(phash=str(ph), grid=grid, w=round(rect.width, 2), h=round(rect.height, 2), std=round(std, 1),
                hue=hue, satf=round(nsat / 576.0, 3))
