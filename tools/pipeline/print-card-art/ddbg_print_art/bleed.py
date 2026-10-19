"""Resolve per-page crop rectangle: TrimBox first, else MediaBox minus 3 mm bleed."""

from __future__ import annotations

import pymupdf

# 3 mm in PDF points (1 pt = 1/72 in)
BLEED_INSET_PT = 3 / 25.4 * 72


def _area(rect: pymupdf.Rect) -> float:
    return max(0.0, rect.width) * max(0.0, rect.height)


def _is_strictly_inside(inner: pymupdf.Rect, outer: pymupdf.Rect, tol: float = 0.25) -> bool:
    if _area(inner) <= 0 or _area(outer) <= 0:
        return False
    return (
        inner.x0 >= outer.x0 + tol
        and inner.y0 >= outer.y0 + tol
        and inner.x1 <= outer.x1 - tol
        and inner.y1 <= outer.y1 - tol
        and _area(inner) < _area(outer) - tol
    )


def crop_rect(page: pymupdf.Page) -> tuple[pymupdf.Rect, str]:
    """
    Return (clip_rect, method) where method is 'trimbox' or 'mediabox_minus_3mm'.
    """
    media = pymupdf.Rect(page.mediabox)
    trim = pymupdf.Rect(page.trimbox)
    if _is_strictly_inside(trim, media):
        return trim, "trimbox"
    inset = BLEED_INSET_PT
    clip = pymupdf.Rect(
        media.x0 + inset,
        media.y0 + inset,
        media.x1 - inset,
        media.y1 - inset,
    )
    if clip.width <= 0 or clip.height <= 0:
        return media, "mediabox_fallback"
    return clip, "mediabox_minus_3mm"
