"""Stage 1: per-PDF extraction (spans + composite icons with perceptual signatures). Cached per file."""
import hashlib, json, os
import pymupdf
from . import config as K
from . import pageextract as P

CACHE = K.OUT_ROOT / "work" / "cache"


def _r(rect):
    return [round(rect.x0, 2), round(rect.y0, 2), round(rect.x1, 2), round(rect.y1, 2)]


def file_key(path):
    st = os.stat(path)
    h = hashlib.sha1(f"{K.EXTRACTOR_VERSION}|{path}|{st.st_size}|{int(st.st_mtime)}".encode()).hexdigest()[:12]
    return h


def extract_file(rel):
    path = str(K.PRINT_ROOT / rel)
    CACHE.mkdir(parents=True, exist_ok=True)
    cpath = CACHE / (os.path.basename(rel).replace(".pdf", "") + "." + file_key(path) + ".json")
    if cpath.exists():
        return json.loads(cpath.read_text())
    doc = pymupdf.open(path)
    clean = P.make_clean_doc(path)
    pages = []
    for i, p in enumerate(doc):
        tb = p.trimbox
        spans = P.extract_spans(p)
        for s in spans:
            s["bbox"] = [round(v, 2) for v in s["bbox"]]
            s["origin"] = [round(v, 2) for v in s["origin"]]
        comps = P.group_elements(P.extract_elements(p))
        icons = []
        cp = clean[i]
        for c in comps:
            sig = P.signature(cp, c["rect"])
            icons.append(dict(rect=_r(c["rect"]), core=_r(c["core"]), n_layers=c["n_layers"], n_img=c["n_img"],
                              n_vec=c["n_vec"], container=c["container"], sig=sig))
        # whole-face perceptual hash (low-res render, hash only - no image is kept). Used to group card backs
        # into design variants (e.g. positive vs negative quirk backs) in the reconciliation report.
        pix = p.get_pixmap(matrix=pymupdf.Matrix(0.3, 0.3), clip=tb, alpha=False)
        from PIL import Image
        import imagehash
        face_hash = str(imagehash.phash(Image.frombytes("RGB", (pix.width, pix.height), pix.samples).convert("L")))
        pages.append(dict(page=i + 1, trim_pt=[round(tb.width, 2), round(tb.height, 2)], face_phash=face_hash,
                          spans=spans, icons=icons))
    res = dict(file=rel, n_pages=doc.page_count, pages=pages)
    cpath.write_text(json.dumps(res))
    return res
