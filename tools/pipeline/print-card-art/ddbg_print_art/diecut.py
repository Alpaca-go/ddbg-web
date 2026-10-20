"""Detect punchboard die-cut paths (PANTONE Rubine Red C, ~61.37 pt roundrect)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Iterable

import pymupdf

from .input_scan import iter_input_pdfs

RUBINE_SEPARATION_NAME = "PANTONE Rubine Red C"
# DeviceRGB from PyMuPDF 1.28.2 on DD_EN_COREBOX_PUNCHBOARD Rubine strokes (Kyries export).
RUBINE_RED_C_RGB: tuple[float, float, float] = (0.855, 0.034, 0.402)
RUBINE_RGB_TOLERANCE: tuple[float, float, float] = (0.12, 0.10, 0.12)
# Smaller punchboard art (not room-token die-cuts); filtered by DIE_CUT_SIDE_PT only.
SMALL_TOKEN_STROKE_SIDE_PT = 33.02
DIE_CUT_SIDE_PT = 61.37
CHIP_GRID_SIDE_PT = 76.54
BLEED_FILL_DISC_PT = 82.21
SIDE_TOLERANCE_PT = 0.75
SQUARE_TOLERANCE_PT = 1.25

# The Darkest Heroes punchboard — Rubine die-cut panel (arched silhouette bbox).
HERO_STANDEE_WIDTH_PT = 177.83
HERO_STANDEE_HEIGHT_PT = 237.09

FORMAL_HERO_PRINT_NAMES: tuple[str, ...] = (
    "CRUSADER",
    "HELLION",
    "BOUNTY HUNTER",
    "HIGHWAYMAN",
    "GRAVE ROBBER",
    "VESTAL",
    "OCCULTIST",
    "PLAGUE DOCTOR",
)

_ROOM_TOKEN_KINDS = (
    "treasure",
    "objective",
    "empty",
    "dark",
    "curio",
    "trap",
    "lair",
)

# Revealed face image XObject xref → engine room token kind (corebox punchboard p3, V2).
REVEALED_IMAGE_XREF_TO_KIND: dict[int, str] = {
    163: "treasure",
    165: "objective",
    167: "empty",
    169: "dark",
    171: "curio",
    173: "trap",
    175: "lair",
}

FRONT_DOOR_IMAGE_XREF = 192
EXPECTED_DIE_CUT_COUNT = 21


@dataclass(frozen=True)
class DieCutRect:
    rect: pymupdf.Rect
    side_pt: float


def _xref_blobs(doc: pymupdf.Document, xref: int, seen: set[int], depth: int = 0) -> str:
    if xref in seen or depth > 10:
        return ""
    seen.add(xref)
    try:
        obj = doc.xref_object(xref)
    except (RuntimeError, ValueError):
        return ""
    chunks = [obj]
    for match in re.finditer(r"(\d+)\s+0\s+R", obj):
        child = int(match.group(1))
        chunks.append(_xref_blobs(doc, child, seen, depth + 1))
    return "\n".join(chunks)


def page_mentions_rubine_separation(page: pymupdf.Page) -> bool:
    visible = (page.get_text() or "").lower()
    if "rubine" in visible:
        return True
    try:
        raw = page.read_contents() or b""
    except (RuntimeError, ValueError):
        raw = b""
    if b"rubine" in raw.lower():
        return True
    doc = page.parent
    if doc is None:
        return False
    seen: set[int] = set()
    blobs: list[str] = []
    try:
        blobs.append(_xref_blobs(doc, page.xref, seen))
    except (RuntimeError, ValueError):
        pass
    for xref in page.get_contents() or []:
        try:
            stream = doc.xref_stream(xref)
            if stream and b"rubine" in stream.lower():
                return True
            blobs.append(_xref_blobs(doc, int(xref), seen))
        except (RuntimeError, ValueError):
            continue
    combined = "\n".join(blobs).lower()
    return "rubine" in combined


def _color_repr(color: object) -> str:
    if color is None:
        return ""
    if isinstance(color, str):
        return color
    return repr(color)


def rgb_looks_like_rubine_red_c(r: float, g: float, b: float) -> bool:
    """Match PANTONE Rubine Red C as DeviceRGB (magenta-red, not pure red)."""
    ref = RUBINE_RED_C_RGB
    tol = RUBINE_RGB_TOLERANCE
    if (
        abs(r - ref[0]) <= tol[0]
        and abs(g - ref[1]) <= tol[1]
        and abs(b - ref[2]) <= tol[2]
    ):
        return True
    # Synthetic fixtures / pure-red stand-ins on Rubine pages.
    return r > 0.85 and g < 0.15 and b < 0.15


def stroke_looks_like_rubine_diecut(drawing: dict, page_has_rubine: bool) -> bool:
    """True when stroke is the die-cut separation (or test stand-in on fixture pages)."""
    if drawing.get("type") not in ("s", "fs"):
        return False
    color = drawing.get("color")
    rep = _color_repr(color).lower()
    if "rubine" in rep:
        return True
    if not page_has_rubine:
        return False
    if isinstance(color, (tuple, list)):
        if len(color) == 1 and float(color[0]) > 0.5:
            return True
        if len(color) >= 3:
            r, g, b = float(color[0]), float(color[1]), float(color[2])
            if rgb_looks_like_rubine_red_c(r, g, b):
                return True
            # PyMuPDF 1.24+ may normalize Separation spot strokes to black when converting.
            width = float(drawing.get("width") or 0)
            if width <= 2.5 and r < 0.08 and g < 0.08 and b < 0.08:
                return True
    width = float(drawing.get("width") or 0)
    if color is None and width <= 2.5:
        return True
    return False


def _rect_side(rect: pymupdf.Rect) -> float:
    return min(rect.width, rect.height)


def _rect_matches_hero_standee_panel(rect: pymupdf.Rect) -> bool:
    return (
        abs(rect.width - HERO_STANDEE_WIDTH_PT) < SIDE_TOLERANCE_PT
        and abs(rect.height - HERO_STANDEE_HEIGHT_PT) < SIDE_TOLERANCE_PT
    )


def iter_hero_standee_diecut_candidates(
    page: pymupdf.Page,
    *,
    require_rubine_stroke: bool = True,
) -> list[DieCutRect]:
    """Rubine path bbox for DH / formal hero portrait panels (177.83×237.09 pt)."""
    page_has_rubine = page_mentions_rubine_separation(page)
    out: list[DieCutRect] = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if rect is None:
            continue
        rect = pymupdf.Rect(rect)
        if not _rect_matches_hero_standee_panel(rect):
            continue
        if require_rubine_stroke and page_has_rubine:
            if not stroke_looks_like_rubine_diecut(drawing, page_has_rubine):
                continue
        elif require_rubine_stroke and not page_has_rubine:
            continue
        side = min(rect.width, rect.height)
        out.append(DieCutRect(rect=rect, side_pt=side))
    return _dedupe_rects(out)


def iter_diecut_candidates(
    page: pymupdf.Page,
    *,
    require_rubine_stroke: bool = True,
) -> list[DieCutRect]:
    page_has_rubine = page_mentions_rubine_separation(page)
    out: list[DieCutRect] = []
    for drawing in page.get_drawings():
        rect = drawing.get("rect")
        if rect is None:
            continue
        side = _rect_side(rect)
        if abs(side - CHIP_GRID_SIDE_PT) < SIDE_TOLERANCE_PT:
            continue
        if abs(side - DIE_CUT_SIDE_PT) > SIDE_TOLERANCE_PT:
            continue
        if abs(rect.width - rect.height) > SQUARE_TOLERANCE_PT:
            continue
        if require_rubine_stroke and page_has_rubine:
            if not stroke_looks_like_rubine_diecut(drawing, page_has_rubine):
                continue
        elif require_rubine_stroke and not page_has_rubine:
            continue
        out.append(DieCutRect(rect=pymupdf.Rect(rect), side_pt=side))
    return _dedupe_rects(out)


def _dedupe_rects(cuts: Iterable[DieCutRect]) -> list[DieCutRect]:
    seen: list[pymupdf.Rect] = []
    unique: list[DieCutRect] = []
    for cut in cuts:
        if any(cut.rect.intersects(s) and abs(cut.rect.x0 - s.x0) < 0.5 for s in seen):
            continue
        seen.append(cut.rect)
        unique.append(cut)
    unique.sort(key=lambda c: (round(c.rect.y0, 2), round(c.rect.x0, 2)))
    return unique


def bleed_disc_rect(diecut: pymupdf.Rect) -> pymupdf.Rect:
    """Bleed underlay disc (~82.2 pt) centered on die-cut."""
    cx = (diecut.x0 + diecut.x1) / 2.0
    cy = (diecut.y0 + diecut.y1) / 2.0
    half = BLEED_FILL_DISC_PT / 2.0
    return pymupdf.Rect(cx - half, cy - half, cx + half, cy + half)


def inset_diecut_clip(diecut: pymupdf.Rect, inset_pt: float = 0.85) -> pymupdf.Rect:
    """Shrink clip slightly so Rubine hairline stroke is not rasterized at the edge."""
    return pymupdf.Rect(
        diecut.x0 + inset_pt,
        diecut.y0 + inset_pt,
        diecut.x1 - inset_pt,
        diecut.y1 - inset_pt,
    )


def image_placements(page: pymupdf.Page) -> list[tuple[int, pymupdf.Rect]]:
    placements: list[tuple[int, pymupdf.Rect]] = []
    for entry in page.get_images(full=True):
        xref = int(entry[0])
        for rect in page.get_image_rects(xref):
            placements.append((xref, pymupdf.Rect(rect)))
    return placements


def dominant_image_xref_in_rect(
    rect: pymupdf.Rect, placements: list[tuple[int, pymupdf.Rect]]
) -> int | None:
    cx = (rect.x0 + rect.x1) / 2.0
    cy = (rect.y0 + rect.y1) / 2.0
    best: tuple[float, int] | None = None
    for xref, irect in placements:
        if not irect.contains((cx, cy)):
            continue
        area = irect.width * irect.height
        if best is None or area > best[0]:
            best = (area, xref)
    return best[1] if best else None


def kind_for_revealed_xref(xref: int) -> str | None:
    return REVEALED_IMAGE_XREF_TO_KIND.get(xref)


def hamlet_board_pdf_candidate(input_root: str) -> str | None:
    """Return relative path to DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf."""
    from pathlib import Path

    root = Path(input_root)
    matches: list[Path] = []
    for path in iter_input_pdfs(root):
        if "BOARD_Hamlet" not in path.name and "BOARD_HAMLET" not in path.name.upper():
            continue
        if "FRONT" not in path.name.upper():
            continue
        matches.append(path)

    def pick(candidates: list[Path]) -> str | None:
        if not candidates:
            return None
        pool = [
            p
            for p in candidates
            if "Old_version" not in p.as_posix() and "/old/" not in p.as_posix().lower()
        ]
        if not pool:
            pool = candidates
        pool.sort(key=lambda p: p.as_posix())
        return pool[0].relative_to(root).as_posix()

    return pick(matches)


def punchboard_pdf_candidates(input_root: str) -> tuple[str | None, str | None]:
    """Return (back_pdf_rel, front_pdf_rel) preferring *_V2.pdf over Old_version."""
    from pathlib import Path

    root = Path(input_root)
    backs: list[Path] = []
    fronts: list[Path] = []
    for path in iter_input_pdfs(root):
        name = path.name
        if "punchboard_200x300" not in name.casefold():
            continue
        rel = path.relative_to(root).as_posix()
        upper = name.upper()
        if "BACK" in upper:
            backs.append(path)
        elif "FRONT" in upper:
            fronts.append(path)

    def pick(candidates: list[Path]) -> str | None:
        if not candidates:
            return None
        v2 = [p for p in candidates if "_V2" in p.name.upper()]
        pool = v2 if v2 else candidates
        pool = [p for p in pool if "Old_version" not in p.as_posix() and "/old/" not in p.as_posix().lower()]
        if not pool:
            pool = candidates
        pool.sort(key=lambda p: p.as_posix())
        return pool[0].relative_to(root).as_posix()

    return pick(backs), pick(fronts)


def png_slug_for_token(kind: str, face: str) -> str:
    safe = re.sub(r"[^a-z0-9_-]+", "-", kind.lower())
    return f"room-token-{safe}_{face}.png"


def png_slug_for_hero_standee(hero_print_name: str, face: str) -> str:
    safe = re.sub(r"[^a-z0-9_-]+", "-", hero_print_name.lower())
    return f"{safe}-{face}.png"


def darkest_heroes_pdf_candidates(input_root: str) -> tuple[str | None, str | None]:
    """Return (back_pdf_rel, front_pdf_rel) under EN_FILES."""
    from pathlib import Path

    root = Path(input_root)
    backs: list[Path] = []
    fronts: list[Path] = []
    for path in iter_input_pdfs(root):
        upper = path.name.upper()
        if "THE_DARKEST_HEROES_PUNCHBOARD" not in upper:
            continue
        rel = path.relative_to(root).as_posix()
        if "BACK" in upper:
            backs.append(path)
        elif "FRONT" in upper:
            fronts.append(path)

    def pick(candidates: list[Path]) -> str | None:
        if not candidates:
            return None
        pool = [p for p in candidates if "Old_version" not in p.as_posix()]
        if not pool:
            pool = candidates
        pool.sort(key=lambda p: p.as_posix())
        return pool[0].relative_to(root).as_posix()

    return pick(backs), pick(fronts)
