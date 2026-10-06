#!/usr/bin/env python3
"""Single entry point: regenerate every output under /workspace/ddbg-extract from the print PDFs.

    python3 scripts/run_all.py            # uses per-PDF stage-1 cache in work/cache when valid
    python3 scripts/run_all.py --force    # ignore cache
    python3 scripts/run_all.py --workers 4
"""
import argparse, hashlib, json, os, shutil, sys, time
from collections import Counter
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ddbg_extract import config as K, stage1, assemble, parse, catalog, reconcile  # noqa: E402

OUT = K.OUT_ROOT


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


def check_coverage():
    listed = {s[1] for s in K.SOURCES} | {s[2] for s in K.SOURCES if s[2]} | {t[0] for t in K.TEXT_FREE}
    found = {str(p.relative_to(K.PRINT_ROOT)) for p in K.PRINT_ROOT.rglob("*.pdf")}
    missing = sorted(found - listed)
    gone = sorted(listed - found)
    if missing or gone:
        raise SystemExit(f"config does not match print folder.\n unlisted PDFs: {missing}\n listed but missing: {gone}")
    log(f"coverage ok: {len(found)} PDFs ({len(listed) - len(K.TEXT_FREE)} extracted, {len(K.TEXT_FREE)} text-free)")


def source_files():
    fs = []
    for cat, f, b, kind, ss in K.SOURCES:
        fs.append(f)
        if b:
            fs.append(b)
    return fs


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(obj, fh, ensure_ascii=False, indent=1)
        fh.write("\n")


def sha1(path):
    return hashlib.sha1(Path(path).read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()
    t0 = time.time()
    check_coverage()
    if a.force and stage1.CACHE.exists():
        shutil.rmtree(stage1.CACHE)
    fs = sorted(source_files(), key=lambda f: -(K.PRINT_ROOT / f).stat().st_size)
    res = {}
    with ProcessPoolExecutor(a.workers) as ex:
        for f, r in zip(fs, ex.map(stage1.extract_file, fs)):
            res[f] = r
    # prune stale cache entries (older extractor versions / changed PDFs)
    keep = {os.path.basename(f).replace(".pdf", "") + "." + stage1.file_key(str(K.PRINT_ROOT / f)) + ".json" for f in fs}
    for p in stage1.CACHE.glob("*.json"):
        if p.name not in keep:
            p.unlink()
    log(f"stage1 done: {len(fs)} PDFs, {sum(r['n_pages'] for r in res.values())} pages")

    raw, occ, decor, leaders = assemble.assemble(res)
    for d in (OUT / "raw", OUT / "parsed"):
        if d.exists():
            shutil.rmtree(d)
    for cat, obj in raw.items():
        dump(OUT / "raw" / "corebox" / f"{cat}.json", obj)
    log(f"raw written: {len(raw)} categories, {len(occ)} icon clusters")

    parsed, parse_stats = {}, {}
    for cat, fn in parse.PARSERS.items():
        recs = [fn(c) for c in raw[cat]["cards"]]
        parsed[cat] = recs
        fails = [dict(id=r["id"], pages=r["pages"], issues=r["issues"]) for r in recs if r["issues"]]
        parse_stats[cat] = dict(cards=len(recs), ok=len(recs) - len(fails), failed=len(fails),
                                success_rate=round((len(recs) - len(fails)) / max(1, len(recs)), 4), failures=fails)
        dump(OUT / "parsed" / "corebox" / f"{cat}.json", dict(
            schema="ddbg-parsed-v0", extractor_version=K.EXTRACTOR_VERSION, category=cat, source=f"raw/corebox/{cat}.json",
            field_notes=parse.NOTES[cat], icon_token="{icon:<iconId>} = unannotated icon cluster, see icons/catalog.json",
            stats={k: v for k, v in parse_stats[cat].items() if k != "failures"}, failures=fails, cards=recs))
    log("parsed: " + ", ".join(f"{c} {s['ok']}/{s['cards']}" for c, s in parse_stats.items()))

    cstats, _ = catalog.build(raw, occ, decor, leaders)
    log(f"icon catalog: {cstats}")

    rows = reconcile.reconcile(raw, parsed)
    dump(OUT / "reports" / "reconciliation.json", rows)
    (OUT / "reports" / "reconciliation.md").write_text(reconcile.markdown(rows) + "\n", encoding="utf-8")

    sizes = {str(p.relative_to(OUT)): p.stat().st_size for d in ("raw", "parsed") for p in sorted((OUT / d).rglob("*.json"))}
    manifest = dict(
        extractor_version=K.EXTRACTOR_VERSION, print_root=str(K.PRINT_ROOT),
        sources=[dict(file=f, bytes=(K.PRINT_ROOT / f).stat().st_size) for f in sorted(source_files())],
        text_free=[dict(file=t[0], label=t[1], note=t[2], pages=__import__("pymupdf").open(K.PRINT_ROOT / t[0]).page_count) for t in K.TEXT_FREE],
        outputs={k: dict(bytes=v, sha1=sha1(OUT / k)) for k, v in sizes.items()},
        total_json_bytes=dict(raw=sum(v for k, v in sizes.items() if k.startswith("raw")),
                              parsed=sum(v for k, v in sizes.items() if k.startswith("parsed"))),
        categories={c: dict(pages=o["n_pages"], unique=o["n_unique"], copies=o["n_copies_total"]) for c, o in raw.items()},
        parse={c: {k: v for k, v in s.items() if k != "failures"} for c, s in parse_stats.items()},
        icons=cstats)
    dump(OUT / "reports" / "summary.json", manifest)
    log(f"done in {time.time() - t0:.0f}s; raw {manifest['total_json_bytes']['raw']/1e6:.2f} MB, parsed {manifest['total_json_bytes']['parsed']/1e6:.2f} MB")


if __name__ == "__main__":
    main()
