"""Render PDF pages to PNG inside trim / bleed crop."""

from __future__ import annotations

from pathlib import Path

import pymupdf

from .bleed import crop_rect


def page_text_snippet(page: pymupdf.Page, clip: pymupdf.Rect, max_len: int = 200) -> str:
    text = page.get_text("text", clip=clip) or ""
    collapsed = " ".join(text.split())
    return collapsed[:max_len]


def export_page_png(
    page: pymupdf.Page,
    dest: Path,
    dpi: int,
) -> tuple[str, pymupdf.Rect]:
    clip, method = crop_rect(page)
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    # Render clip region to pixmap (origin at clip top-left)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(dest))
    return method, clip
