"""Hero standee die-cut helpers (synthetic pages, no EN_FILES PDFs)."""

import tempfile
import unittest
from pathlib import Path

import pymupdf

from ddbg_print_art.diecut import (
    HERO_STANDEE_HEIGHT_PT,
    HERO_STANDEE_WIDTH_PT,
    iter_hero_standee_diecut_candidates,
    png_slug_for_hero_standee,
    stroke_looks_like_rubine_diecut,
)
from ddbg_print_art.hero_standees import export_heroes_from_page
from ddbg_print_art.separation_omit import omit_rubine_separation_stroke


def _draw_hero_panel(page: pymupdf.Page, x: float, y: float) -> pymupdf.Rect:
    rect = pymupdf.Rect(x, y, x + HERO_STANDEE_WIDTH_PT, y + HERO_STANDEE_HEIGHT_PT)
    page.draw_rect(rect, color=(1, 0, 0), width=1, stroke_opacity=1)
    return rect


class HeroStandeeDiecutTest(unittest.TestCase):
    def test_rubine_spot_stroke_black_normalized(self):
        drawing = {"type": "s", "color": (0.0, 0.0, 0.0), "width": 0.25}
        self.assertTrue(stroke_looks_like_rubine_diecut(drawing, page_has_rubine=True))

    def test_iter_hero_standee_diecut_black_stroke_on_rubine_page(self):
        doc = pymupdf.open()
        page = doc.new_page(width=700, height=900)
        page.insert_text((10, 20), "PANTONE Rubine Red C")
        rect = pymupdf.Rect(44, 40, 44 + HERO_STANDEE_WIDTH_PT, 40 + HERO_STANDEE_HEIGHT_PT)
        page.draw_rect(rect, color=(0, 0, 0), width=0.25)
        cuts = iter_hero_standee_diecut_candidates(page, require_rubine_stroke=True)
        self.assertEqual(len(cuts), 1)
        doc.close()

    def test_iter_hero_standee_diecut_candidates(self):
        doc = pymupdf.open()
        page = doc.new_page(width=700, height=900)
        page.insert_text((10, 20), "PANTONE Rubine Red C marker")
        _draw_hero_panel(page, 44, 40)
        cuts = iter_hero_standee_diecut_candidates(page, require_rubine_stroke=True)
        self.assertEqual(len(cuts), 1)
        self.assertAlmostEqual(cuts[0].rect.width, HERO_STANDEE_WIDTH_PT, delta=0.5)
        doc.close()

    def test_png_slug(self):
        self.assertEqual(png_slug_for_hero_standee("BOUNTY HUNTER", "front"), "bounty-hunter-front.png")

    def test_export_labeled_hero_from_synthetic(self):
        doc = pymupdf.open()
        page = doc.new_page(width=700, height=900)
        page.insert_text((10, 20), "Rubine Red C")
        rect = _draw_hero_panel(page, 44, 40)
        page.insert_text((rect.x0 + 20, rect.y1 - 30), "CRUSADER", fontsize=14)
        omit_rubine_separation_stroke(doc, page)
        with tempfile.TemporaryDirectory() as tmp:
            png_dir = Path(tmp)
            rows = export_heroes_from_page(
                doc,
                page,
                pdf_rel="fixture_front.pdf",
                page_no=1,
                face="front",
                png_dir=png_dir,
                dpi=72,
                require_rubine_stroke=True,
                omit_separation=False,
            )
            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0].hero, "CRUSADER")
            self.assertTrue((png_dir / "crusader-front.png").is_file())
        doc.close()


if __name__ == "__main__":
    unittest.main()
