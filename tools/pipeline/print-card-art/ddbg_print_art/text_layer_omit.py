"""Omit hidden/overprint text when rasterizing punchboard building tiles."""

from __future__ import annotations

import pymupdf

# BLD p1 carries Guild / Graveyard labels on a separate print layer (not upgradable buildings).
HIDDEN_BUILDING_PRINT_TERMS: tuple[str, ...] = ("Guild", "Graveyard")


def redact_hidden_building_terms(page: pymupdf.Page, clip: pymupdf.Rect) -> int:
    """
    Redact Guild / Graveyard text instances intersecting clip.

    Returns the number of redaction annotations applied.
    """
    count = 0
    for term in HIDDEN_BUILDING_PRINT_TERMS:
        for rect in page.search_for(term):
            hit = pymupdf.Rect(rect)
            if not hit.intersects(clip):
                continue
            page.add_redact_annot(hit)
            count += 1
    if count:
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE)
    return count
