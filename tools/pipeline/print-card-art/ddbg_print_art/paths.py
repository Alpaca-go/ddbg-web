"""Stable PNG slug from PDF relative path."""

from __future__ import annotations

import re


def slugify_pdf_rel(pdf_rel: str) -> str:
    s = pdf_rel.replace("\\", "/")
    s = re.sub(r"[^A-Za-z0-9._-]+", "_", s)
    s = re.sub(r"_+", "_", s).strip("_")
    return s[:180] if len(s) > 180 else s


def png_basename(pdf_rel: str, page: int, is_old: bool) -> str:
    slug = slugify_pdf_rel(pdf_rel)
    suffix = "_old" if is_old else ""
    return f"{slug}_p{page:03d}{suffix}.png"
