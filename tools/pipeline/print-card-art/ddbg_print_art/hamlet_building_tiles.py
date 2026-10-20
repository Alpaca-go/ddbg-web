"""Export Hamlet building upgrade tiles (BLD) from punchboard 300×300 FRONT p1."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path

import pymupdf

from .bleed import crop_rect
from .diecut import (
    BUILDING_TILE_LONG_PT,
    BUILDING_TILE_SHORT_PT,
    BuildingTilePanel,
    iter_building_upgrade_panel_candidates,
    png_slug_for_building_tile,
    punchboard_300x300_pdf_candidates,
)
from .export_pdf import page_text_snippet
from .input_scan import assert_unique_png_outputs
from .separation_omit import omit_rubine_separation_stroke
from .text_layer_omit import redact_hidden_building_terms

PRINT_NAME_TO_BUILDING_ID: dict[str, str] = {
    "Abbey": "abbey",
    "Tavern": "tavern",
    "Sanitarium": "sanitarium",
    "Survivalist": "survivalist",
    "Stagecoach": "stagecoach",
    "Blacksmith": "blacksmith",
    "Nomad Wagon": "nomadWagon",
}

UPGRADE_LEVEL_ROMAN: dict[str, int] = {"II": 2, "III": 3}
EXPECTED_UPGRADE_TILE_COUNT = 14

BLD_P1_HINTS_PATH = (
    Path(__file__).resolve().parents[1] / "fixtures" / "hamlet-building-tile-bld-p1-hints.json"
)
DIE_CUT_HINT_TOLERANCE_PT = 2.5

MATCH_EXPAND_LEFT_PT = 80.0
MATCH_EXPAND_TOP_PT = 150.0
MATCH_EXPAND_RIGHT_PT = 80.0
MATCH_EXPAND_BOTTOM_PT = 60.0


@dataclass(frozen=True)
class BuildingLabelAnchor:
    building_id: str
    print_name: str
    level_roman: str
    level: int
    cx: float
    cy: float


@dataclass
class BuildingTileExportRow:
    building_id: str
    level: int
    print_name: str
    print_level: str
    png_rel: str
    pdf_rel: str
    page: int
    form_xref: int
    form_name: str
    crop_method: str
    panel_long_pt: float
    panel_short_pt: float
    diecut_pt: list[float]
    text_snippet: str
    match_method: str
    hidden_terms_redacted: int


def _norm_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def _collect_upgrade_label_anchors(page: pymupdf.Page) -> list[BuildingLabelAnchor]:
    anchors: list[BuildingLabelAnchor] = []
    for block in page.get_text("dict").get("blocks", []):
        for line in block.get("lines", []):
            parts: list[tuple[str, tuple[float, float, float, float]]] = []
            for span in line.get("spans", []):
                text = _norm_text(span.get("text", ""))
                if not text:
                    continue
                parts.append((text, tuple(span["bbox"])))
            for index, (text, bbox) in enumerate(parts):
                if text not in PRINT_NAME_TO_BUILDING_ID:
                    continue
                level_roman = None
                for j in range(max(0, index - 2), min(len(parts), index + 3)):
                    if parts[j][0] in UPGRADE_LEVEL_ROMAN:
                        level_roman = parts[j][0]
                        break
                if level_roman is None:
                    continue
                cx = (bbox[0] + bbox[2]) / 2.0
                cy = (bbox[1] + bbox[3]) / 2.0
                anchors.append(
                    BuildingLabelAnchor(
                        building_id=PRINT_NAME_TO_BUILDING_ID[text],
                        print_name=text,
                        level_roman=level_roman,
                        level=UPGRADE_LEVEL_ROMAN[level_roman],
                        cx=cx,
                        cy=cy,
                    )
                )
    if len(anchors) != EXPECTED_UPGRADE_TILE_COUNT:
        raise ValueError(
            f"BLD p1: expected {EXPECTED_UPGRADE_TILE_COUNT} building II/III label anchors, "
            f"got {len(anchors)}"
        )
    return anchors


def _expanded_match_clip(panel: BuildingTilePanel) -> pymupdf.Rect:
    rect = panel.rect
    return pymupdf.Rect(
        rect.x0 - MATCH_EXPAND_LEFT_PT,
        rect.y0 - MATCH_EXPAND_TOP_PT,
        rect.x1 + MATCH_EXPAND_RIGHT_PT,
        rect.y1 + MATCH_EXPAND_BOTTOM_PT,
    )


def _match_text_for_panel(page: pymupdf.Page, panel: BuildingTilePanel) -> str:
    tight = _norm_text(page_text_snippet(page, panel.rect))
    clip = _expanded_match_clip(panel)
    expanded = _norm_text(page_text_snippet(page, clip))
    if not tight:
        return expanded
    if not expanded:
        return tight
    return expanded if len(expanded) > len(tight) else tight


def _tile_match_score(building_id: str, level: int, match_text: str) -> float:
    """Score expanded clip text for one BLD upgrade tile (higher = better)."""
    text = match_text
    if building_id == "abbey" and level == 2:
        if (
            "Remove 2 Quirks" in text
            and "-6" not in text
            and "Heal 7" not in text
            and "Reveal two" not in text
            and "Blacksmith" not in text
            and "Blacksmit" not in text
        ):
            return 50.0
        return 0.0
    if building_id == "abbey" and level == 3:
        if "Gain 1 Positive Quirk" in text and "-6" in text and "Remove 2 Quirks" not in text:
            return 50.0
        if "Gain 1 Positive Quirk" in text and "-6" in text and "Reveal one" in text:
            return 52.0
        return 0.0
    if building_id == "tavern" and level == 2:
        if "Tavern" in text and "-9" in text and "Heal 9" not in text:
            return 45.0
        return 0.0
    if building_id == "tavern" and level == 3:
        if "Tavern" in text and "-6" in text and "Heal 18" not in text:
            return 45.0
        return 0.0
    if building_id == "sanitarium" and level == 2:
        if "Heal 7" in text and "Heal 14" in text:
            return 50.0
        return 0.0
    if building_id == "sanitarium" and level == 3:
        if "Heal 9" in text and "Heal 18" in text:
            return 50.0
        return 0.0
    if building_id == "survivalist" and level == 2:
        if "Gain 1" in text and "Gain 2" in text and "Gain 3" not in text:
            score = 48.0
            if "Waiting" in text:
                score -= 12.0
            return score
        return 0.0
    if building_id == "survivalist" and level == 3:
        if "Gain 3" in text:
            return 48.0
        return 0.0
    if building_id == "stagecoach" and level == 2:
        if "Waiting" in text and "Add another Waiting" not in text:
            score = 46.0
            if "Gain 1" in text and "Gain 2" in text:
                score += 6.0
            return score
        return 0.0
    if building_id == "stagecoach" and level == 3:
        if "Add another Waiting" in text:
            return 46.0
        return 0.0
    if building_id == "blacksmith" and level == 2:
        if "Blacksmith" in text and "Use One of" in text:
            return 42.0 if "Next Quest Only" in text else 48.0
        return 0.0
    if building_id == "blacksmith" and level == 3:
        if "Next Quest Only" in text:
            return 48.0
        return 0.0
    if building_id == "nomadWagon" and level == 2:
        if "Reveal two Level I" in text:
            return 50.0
        return 0.0
    if building_id == "nomadWagon" and level == 3:
        if "Reveal one Level I Trinket" in text or "one Level II Trinket" in text:
            return 50.0
        return 0.0
    return 0.0


def _upgrade_tile_targets() -> list[BuildingLabelAnchor]:
    targets: list[BuildingLabelAnchor] = []
    for print_name, building_id in PRINT_NAME_TO_BUILDING_ID.items():
        for level_roman, level in UPGRADE_LEVEL_ROMAN.items():
            targets.append(
                BuildingLabelAnchor(
                    building_id=building_id,
                    print_name=print_name,
                    level_roman=level_roman,
                    level=level,
                    cx=0.0,
                    cy=0.0,
                )
            )
    return targets


def _load_bld_p1_hints() -> list[dict[str, object]]:
    data = json.loads(BLD_P1_HINTS_PATH.read_text(encoding="utf-8"))
    tiles = data.get("tiles")
    if not isinstance(tiles, list) or len(tiles) != EXPECTED_UPGRADE_TILE_COUNT:
        raise ValueError(f"Invalid BLD p1 hints file: {BLD_P1_HINTS_PATH}")
    return tiles


def _panel_for_diecut_hint(
    panels: list[BuildingTilePanel],
    diecut_pt: list[float],
) -> BuildingTilePanel:
    hint = pymupdf.Rect(diecut_pt)
    for panel in panels:
        rect = panel.rect
        if (
            abs(rect.x0 - hint.x0) <= DIE_CUT_HINT_TOLERANCE_PT
            and abs(rect.y0 - hint.y0) <= DIE_CUT_HINT_TOLERANCE_PT
        ):
            return panel
    raise ValueError(
        f"BLD p1: no Form panel at diecut origin ({hint.x0:.2f}, {hint.y0:.2f}) "
        f"(tolerance {DIE_CUT_HINT_TOLERANCE_PT}pt)"
    )


def _assign_panels_from_hints(
    page: pymupdf.Page,
    panels: list[BuildingTilePanel],
) -> list[tuple[BuildingLabelAnchor, BuildingTilePanel, str]]:
    assignments: list[tuple[BuildingLabelAnchor, BuildingTilePanel, str]] = []
    used: set[tuple[float, float]] = set()
    for hint in _load_bld_p1_hints():
        building_id = str(hint["buildingId"])
        level = int(hint["level"])
        diecut = hint["diecutPt"]
        if not isinstance(diecut, list) or len(diecut) != 4:
            raise ValueError(f"Invalid diecutPt for {building_id} L{level}")
        panel = _panel_for_diecut_hint(panels, [float(v) for v in diecut])
        key = (round(panel.rect.x0, 2), round(panel.rect.y0, 2))
        if key in used:
            raise ValueError(f"Duplicate BLD panel assignment at {key}")
        used.add(key)
        print_name = next(k for k, v in PRINT_NAME_TO_BUILDING_ID.items() if v == building_id)
        level_roman = {2: "II", 3: "III"}[level]
        anchor = BuildingLabelAnchor(
            building_id=building_id,
            print_name=print_name,
            level_roman=level_roman,
            level=level,
            cx=0.0,
            cy=0.0,
        )
        match_text = _match_text_for_panel(page, panel)
        phrases = hint.get("verifyPhrases") or []
        if isinstance(phrases, list):
            for phrase in phrases:
                if str(phrase) not in match_text:
                    raise ValueError(
                        f"BLD verify failed for {print_name} {level_roman}: "
                        f"missing {phrase!r} in {match_text[:120]!r}"
                    )
        assignments.append((anchor, panel, match_text))
    return assignments


def _assign_panels_by_signature(
    page: pymupdf.Page,
    panels: list[BuildingTilePanel],
) -> list[tuple[BuildingLabelAnchor, BuildingTilePanel, str]]:
    targets = _upgrade_tile_targets()
    if len(panels) < EXPECTED_UPGRADE_TILE_COUNT:
        raise ValueError(
            f"BLD p1: expected ≥{EXPECTED_UPGRADE_TILE_COUNT} die-cut panels, got {len(panels)}"
        )
    match_texts = [_match_text_for_panel(page, panel) for panel in panels]
    n_t = len(targets)
    n_p = len(panels)
    scores: list[list[float]] = []
    for target in targets:
        row = [
            _tile_match_score(target.building_id, target.level, match_texts[col])
            for col in range(n_p)
        ]
        scores.append(row)

    try:
        import numpy as np
        from scipy.optimize import linear_sum_assignment

        # Maximize score → minimize negative score.
        row_ind, col_ind = linear_sum_assignment(-np.array(scores))
        pairs = [(int(r), int(c)) for r, c in zip(row_ind, col_ind)]
    except ImportError:
        pairs: list[tuple[int, int]] = []
        used_cols: set[int] = set()
        for row in range(n_t):
            best_col = max(
                (col for col in range(n_p) if col not in used_cols),
                key=lambda col: scores[row][col],
            )
            used_cols.add(best_col)
            pairs.append((row, best_col))

    assigned: list[tuple[BuildingLabelAnchor, BuildingTilePanel, str]] = []
    used_panel_indexes: set[int] = set()
    for row, col in pairs:
        if col in used_panel_indexes:
            raise ValueError("Duplicate panel assignment while matching BLD tiles")
        used_panel_indexes.add(col)
        score = scores[row][col]
        if score < 40.0:
            target = targets[row]
            raise ValueError(
                f"Low-confidence BLD match for {target.print_name} {target.level_roman} "
                f"(score={score:.1f}, text={match_texts[col][:120]!r})"
            )
        assigned.append((targets[row], panels[col], match_texts[col]))
    return assigned


def _export_panel_clip(
    src_doc: pymupdf.Document,
    page_index: int,
    clip: pymupdf.Rect,
    dest: Path,
    dpi: int,
    *,
    omit_rubine: bool,
    omit_hidden_terms: bool,
) -> tuple[str, str, int]:
    tile_doc = pymupdf.open()
    tile_doc.insert_pdf(src_doc, from_page=page_index, to_page=page_index)
    page = tile_doc[0]
    redacted = 0
    if omit_rubine:
        omit_rubine_separation_stroke(tile_doc, page)
    if omit_hidden_terms:
        redacted = redact_hidden_building_terms(page, clip)
    zoom = dpi / 72.0
    mat = pymupdf.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(dest))
    snippet = page_text_snippet(page, clip)
    tile_doc.close()
    method = "bld_form_panel_bbox"
    if omit_hidden_terms and redacted:
        method = "bld_form_panel_bbox_hidden_text_redacted"
    return method, snippet, redacted


def run_hamlet_building_tile_export(
    input_root: Path,
    out_root: Path,
    *,
    dpi: int = 200,
    page_no: int = 1,
    dry_run: bool = False,
    omit_rubine: bool = True,
    omit_hidden_terms: bool = True,
) -> list[BuildingTileExportRow]:
    _back_rel, front_rel = punchboard_300x300_pdf_candidates(str(input_root))
    if not front_rel:
        raise FileNotFoundError(
            "Could not find DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf under input root"
        )
    pdf_path = input_root / front_rel
    doc = pymupdf.open(pdf_path)
    if page_no < 1 or page_no > doc.page_count:
        doc.close()
        raise ValueError(f"{front_rel}: page {page_no} out of range (1..{doc.page_count})")
    page = doc[page_no - 1]
    trim, trim_method = crop_rect(page)
    if trim_method != "trimbox":
        doc.close()
        raise ValueError(f"{front_rel} p{page_no}: expected TrimBox (R-048), got {trim_method}")
    _collect_upgrade_label_anchors(page)
    panels = iter_building_upgrade_panel_candidates(page, trim=trim)
    assignments = _assign_panels_from_hints(page, panels)

    png_dir = out_root / "png"
    png_claims: dict[str, str] = {}
    rows: list[BuildingTileExportRow] = []

    for anchor, panel, match_text in sorted(
        assignments,
        key=lambda pair: (pair[0].building_id, pair[0].level),
    ):
        clip = panel.rect
        png_name = png_slug_for_building_tile(anchor.building_id, anchor.level)
        png_rel = f"png/{png_name}"
        claim = f"{anchor.building_id}:L{anchor.level}"
        assert_unique_png_outputs(png_rel, claim, png_claims)
        dest = png_dir / png_name
        if dry_run:
            method = "dry_run"
            snippet = ""
            redacted = 0
        else:
            method, snippet, redacted = _export_panel_clip(
                doc,
                page_no - 1,
                clip,
                dest,
                dpi,
                omit_rubine=omit_rubine,
                omit_hidden_terms=omit_hidden_terms,
            )
        rows.append(
            BuildingTileExportRow(
                building_id=anchor.building_id,
                level=anchor.level,
                print_name=anchor.print_name,
                print_level=anchor.level_roman,
                png_rel=png_rel,
                pdf_rel=front_rel,
                page=page_no,
                form_xref=panel.xref,
                form_name=panel.form_name,
                crop_method=method,
                panel_long_pt=round(panel.long_pt, 2),
                panel_short_pt=round(panel.short_pt, 2),
                diecut_pt=[
                    round(panel.rect.x0, 2),
                    round(panel.rect.y0, 2),
                    round(panel.rect.x1, 2),
                    round(panel.rect.y1, 2),
                ],
                text_snippet=(match_text or snippet)[:240],
                match_method="bld_form_panel_bbox_hints",
                hidden_terms_redacted=redacted,
            )
        )

    doc.close()

    if not dry_run:
        manifest = {
            "schema": "ddbg.print-hamlet-building-tile-export.v1",
            "dpi": dpi,
            "page": page_no,
            "geometry": (
                "PUNCHBOARD_300x300 FRONT p1 Form panel bbox "
                f"~{BUILDING_TILE_LONG_PT}×{BUILDING_TILE_SHORT_PT} pt (R-048)"
            ),
            "tiles": [asdict(r) for r in rows],
        }
        (out_root / "hamlet-building-tile-export.json").write_text(
            json.dumps(manifest, indent=2) + "\n",
            encoding="utf-8",
        )
    return rows
