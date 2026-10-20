"""Raster checks for punchboard building-tile exports."""

from __future__ import annotations

import pymupdf

# Non-black threshold (0–255); punchboard art is rarely pure #000 outside bleed.
NON_BLACK_LUMINANCE_MIN = 25
# Minimum share of pixels above threshold for a full building panel at 72 dpi.
BUILDING_TILE_MIN_NON_BLACK_RATIO = 0.25
BUILDING_TILE_MIN_NON_BLACK_RATIO_NARROW = 0.24
BUILDING_TILE_NARROW_SHORT_PT = 72.0


def min_non_black_ratio_for_clip(clip: pymupdf.Rect) -> float:
    short = min(clip.width, clip.height)
    long = max(clip.width, clip.height)
    if short < BUILDING_TILE_NARROW_SHORT_PT or (short > 0 and long / short >= 1.25):
        return BUILDING_TILE_MIN_NON_BLACK_RATIO_NARROW
    return BUILDING_TILE_MIN_NON_BLACK_RATIO


def non_black_pixel_ratio(
    page: pymupdf.Page,
    clip: pymupdf.Rect,
    *,
    dpi: int = 72,
) -> float:
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    if pix.width <= 0 or pix.height <= 0:
        return 0.0
    samples = pix.samples
    if not samples:
        return 0.0
    step = pix.n
    bright = 0
    total = pix.width * pix.height
    for i in range(0, len(samples), step):
        if max(samples[i], samples[i + 1], samples[i + 2]) > NON_BLACK_LUMINANCE_MIN:
            bright += 1
    return bright / total


def clip_contains_phrases(page: pymupdf.Page, clip: pymupdf.Rect, phrases: list[str]) -> bool:
    text = page.get_text("text", clip=clip).replace("\n", " ")
    return all(phrase in text for phrase in phrases)


def assert_building_tile_raster(
    page: pymupdf.Page,
    clip: pymupdf.Rect,
    *,
    verify_phrases: list[str],
    min_non_black_ratio: float | None = None,
) -> float:
    ratio = non_black_pixel_ratio(page, clip)
    floor = (
        min_non_black_ratio
        if min_non_black_ratio is not None
        else min_non_black_ratio_for_clip(clip)
    )
    if ratio < floor:
        raise ValueError(
            f"BLD tile export too dark: non_black_ratio={ratio:.3f} "
            f"(min {floor}) clip={list(clip)}"
        )
    if not clip_contains_phrases(page, clip, verify_phrases):
        snippet = page.get_text("text", clip=clip).replace("\n", " ")[:120]
        raise ValueError(
            f"BLD tile missing verify phrases {verify_phrases!r}; clip text={snippet!r}"
        )
    return ratio
