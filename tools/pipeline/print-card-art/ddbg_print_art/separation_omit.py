"""Hide PANTONE Rubine Red C die-cut strokes when rasterizing (trial content-stream patch)."""

from __future__ import annotations

import re

import pymupdf

# After `/CS0 CS` (Rubine separation on DH punchboards), zero the tint so stroke vanishes.
_RUBINE_SCN_RE = re.compile(
    rb"/CS0\s+CS\s+1\s+SCN",
    re.IGNORECASE,
)
_RUBINE_SCN_RE_CS = re.compile(
    rb"/CS0\s+cs\s+1\s+scn",
    re.IGNORECASE,
)


def omit_rubine_separation_stroke(doc: pymupdf.Document, page: pymupdf.Page) -> bool:
    """
    Patch page content streams so Rubine die-cut hairlines are not painted.

    Returns True if any stream was modified.
    """
    xrefs = page.get_contents()
    if not xrefs:
        return False
    if not isinstance(xrefs, list):
        xrefs = [xrefs]
    changed = False
    for xref in xrefs:
        raw = doc.xref_stream(xref)
        if not raw:
            continue
        patched = _RUBINE_SCN_RE.sub(b"0 SCN", raw)
        patched = _RUBINE_SCN_RE_CS.sub(b"0 scn", patched)
        if patched != raw:
            doc.update_stream(xref, patched)
            changed = True
    return changed
