# ddbg-extract — Darkest Dungeon board game core box: raw card extraction

Reproducible extractor that turns the print PDFs of the **core box (MG_DD_01 COREBOX)** into
per-card JSON (raw text + icon placements), a first-pass parse for four categories, a component
reconciliation against the official rulebook, and an icon catalog for human annotation.

Print PDFs are used **only as a data source**. Nothing here is a game asset. The icon crops in
`icons/` are for annotation only: they stay on this box and are never committed anywhere.

## Run

```bash
cd /workspace/ddbg-extract
python3 scripts/run_all.py            # incremental (per-file cache in work/cache)
python3 scripts/run_all.py --force    # ignore cache, re-extract every PDF
python3 scripts/run_all.py --workers 4
```

Dependencies: Python 3.13 (tested), `pymupdf` (tested 1.28.2), `imagehash` (4.3.2), `Pillow`, `numpy`
(`pip install pymupdf imagehash pillow numpy`). Input root is `PRINT_ROOT` in
`scripts/ddbg_extract/config.py` (`/workspace/ddbg-print/DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print`).
Runtime on this box: ~130 s from scratch (4 workers), ~45 s with a warm cache.

The run first checks coverage: every PDF under the core-box folder must be listed either in
`SOURCES` (extracted) or `TEXT_FREE` (manual entry), otherwise it aborts.

**Determinism:** for the same input PDFs and extractor version, all outputs are byte-identical
(verified: a `--force` run reproduced all 27 JSON files, `icons/catalog.json` and the CSV template
exactly). Icon ids depend on the whole input set (see below), so adding PDFs can change ids.

## Pipeline

| stage | module | what it does |
|---|---|---|
| 1 | `stage1.py`, `pageextract.py` | per PDF page: text spans (rawdict char boxes → tight bbox, ligatures normalised, NFC, overprint duplicates removed), icon elements (small placed images + small vector drawings), grouping of stacked layers into one composite icon, perceptual signature of each composite rendered from a *clean* copy of the page (art-only images and all text removed). Cached per file. |
| 2 | `cluster.py` | deterministic greedy leader clustering of signatures across all files → `iconId` |
| 3 | `assemble.py` | per-face JSON in mm, `lines` view with `{icon:<id>}` tokens, decor detection, front/back pairing, deck-copy dedupe |
| 4 | `parse.py` | first-pass parse of hero_skill, monster_medium, monster_large, trinket |
| 5 | `catalog.py` | icon crops, contact sheet, dictionary template CSV |
| 6 | `reconcile.py` | component counts vs rulebook component list |

## Outputs

```
raw/corebox/<category>.json        schema ddbg-raw-v1      (23 categories)
parsed/corebox/<category>.json     schema ddbg-parsed-v0   (hero_skill, monster_medium, monster_large, trinket)
reports/reconciliation.{md,json}   rulebook vs extracted counts
reports/summary.json               manifest: sources (+bytes), text-free files, output sha1/bytes, counts, parse stats, icon stats
icons/index.html                   contact sheet (box only)
icons/crops/<iconId>.png           one crop per annotate/component cluster (box only)
icons/decor/<iconId>.png           decor + likely_art crops (box only)
icons/catalog.json                 every cluster: status, counts, categories, files, size, examples, exemplar location
icons/icon-dictionary-template.csv clusters to annotate (meanings blank), sorted by occurrences desc
icons/icon-dictionary-components.csv clusters that appear only on sheets/punchboards/tiles
icons/likely-art.csv               single-card clusters ≥12 mm (probably art fragments; review quickly)
icons/decor-list.csv               clusters excluded as decor, with reason
work/                              cache, logs, scratch renders (box only)
```

### Coordinates and units
All coordinates are **mm**, origin = top-left of the card's **TrimBox**, y downward. Font size is
in pt. `trim_mm` = [width, height]. Spans/icons lying outside the trim are dropped.

### Raw schema (`ddbg-raw-v1`)
```
{ schema, extractor_version, category, kind: "card"|"sheet", units: "mm",
  sources: [{face, file}], n_pages, n_unique, n_copies_total,
  cards: [{ id: "<category>:[ADD_014:]pNNN", source_set: "base"|"ADD_014",
            copies, pages: [int], copy_variants?: [{page, face, iconId}],
            faces: { front: Face, back?: Face } }] }
Face = { file, page, trim_mm, face_phash,
         spans: [{t, bbox, font, size, color, rot?, dup?}],
         icons: [{iconId, bbox, bbox_full?, decor?, container?, varies_between_copies?}],
         lines: [{rot, text, bbox}] }        # text like "{icon:8d4bbe5e11} +1 vs Unholy"
```
* Deck copies: pages whose text and icons are identical are merged (`copies`, `pages`). Pages that
  differ **only** by one small (≤6 mm) icon at the same position are also merged and the differing
  icon is listed in `copy_variants` (on monster cards this is the monster-token colour marker,
  Core rules p.17). The icon is flagged `varies_between_copies` in the face.
* `face_phash` = 64-bit perceptual hash of a low-res render of the whole face (used to group back
  designs); no image is stored.

### Icon ids
* An icon placement is a *composite*: overlapping image/vector layers whose centres nest are one icon.
  `bbox` = union of the image layers (core), `bbox_full` (if different) includes glow/frame vectors.
* Signature = pHash + 2×2 colour grid + size + hue histogram, computed on a render with card art and
  all text removed, so the number printed inside an icon does not split clusters.
* `iconId` = first 10 hex of sha1 of the cluster leader's signature key. Same picture in different
  files → same id. Different colour variants (e.g. red vs green burst) → different ids.
* Meaning of every icon is **unknown** until `icon-dictionary-template.csv` is filled in. The parser
  never names an icon.
* `occurrences` counts placements on every printed page (deck copies included).

### Catalog statuses
`annotate` (needs a meaning) · `component_only` (only on sheets/punchboards/tiles) · `likely_art`
(appears on a single card and ≥12 mm — usually an art fragment, but check) · `decor` with reason:
blank after cleaning, text plate (constant inner label), thin rule/bar (aspect >6), panel/container,
fixed template element on ≥90 % of faces with no adjacent text.

### Parsed schema (`ddbg-parsed-v0`)
Only clearly labelled fields are named (printed label, title/back text, rulebook anatomy p.24
"Life"). Everything else is kept raw: `*_lines_raw`, `unlabeled_numbers` (`text`, `bbox`,
`left_icon`, `inside_icon`). Each file has `field_notes`, `stats`, `failures` (card id + pages + issues).
A card counts as failed if it has any issue (e.g. the printed typo `Acc 1O` on hero_skill p.44 is kept
raw and reported, not corrected).

## Known limitations
See `REPORT.md` (Chinese) → 未解决问题.
