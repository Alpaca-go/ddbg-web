"""Room token die-cut helpers (synthetic pages, no EN_FILES PDFs)."""

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from ddbg_print_art.diecut import (
    DIE_CUT_SIDE_PT,
    REVEALED_IMAGE_XREF_TO_KIND,
    RUBINE_RED_C_RGB,
    SMALL_TOKEN_STROKE_SIDE_PT,
    bleed_disc_rect,
    iter_diecut_candidates,
    png_slug_for_token,
    punchboard_pdf_candidates,
    rgb_looks_like_rubine_red_c,
    stroke_looks_like_rubine_diecut,
)
from ddbg_print_art.room_tokens import export_tokens_from_page

KINDS = ("treasure", "objective", "empty", "dark", "curio", "trap", "lair")


def _draw_diecut_square(
    page: pymupdf.Page,
    x: float,
    y: float,
    *,
    side: float = DIE_CUT_SIDE_PT,
    color: tuple[float, float, float] = (1, 0, 0),
    width: float = 1,
) -> None:
    page.draw_rect(
        pymupdf.Rect(x, y, x + side, y + side),
        color=color,
        width=width,
        stroke_opacity=1,
    )


class PunchboardCandidateTest(unittest.TestCase):
    def test_punchboard_200x300_case_insensitive(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            wave = root / "DARKEST_DUNGEON_PRINT_EN_WAVE 1" / "MG_DD_01_EN_COREBOX_Print"
            wave.mkdir(parents=True)
            front = wave / "DD_EN_COREBOX_PUNCHBOARD_200x300_FRONT_V2.pdf"
            back = wave / "DD_EN_COREBOX_PUNCHBOARD_200X300_BACK_V2.pdf"
            front.write_bytes(b"%PDF-1.4\n")
            back.write_bytes(b"%PDF-1.4\n")
            back_rel, front_rel = punchboard_pdf_candidates(str(root))
            self.assertIsNotNone(front_rel)
            self.assertIsNotNone(back_rel)
            self.assertIn("FRONT", front_rel.upper())
            self.assertIn("BACK", back_rel.upper())


class RubineRgbTest(unittest.TestCase):
    def test_print_pdf_rubine_rgb_tuple(self):
        r, g, b = RUBINE_RED_C_RGB
        self.assertTrue(rgb_looks_like_rubine_red_c(r, g, b))
        drawing = {"type": "s", "color": RUBINE_RED_C_RGB, "width": 0.99}
        self.assertTrue(stroke_looks_like_rubine_diecut(drawing, page_has_rubine=True))
        self.assertFalse(stroke_looks_like_rubine_diecut(drawing, page_has_rubine=False))


class DiecutFixtureTest(unittest.TestCase):
    def test_iter_diecut_61pt_excludes_33pt_rubine_decoys(self):
        doc = pymupdf.open()
        page = doc.new_page(width=900, height=500)
        page.insert_text((10, 20), "PANTONE Rubine Red C")
        for i in range(21):
            _draw_diecut_square(
                page,
                20 + (i % 7) * 72,
                40 + (i // 7) * 72,
                side=DIE_CUT_SIDE_PT,
                color=RUBINE_RED_C_RGB,
                width=0.99,
            )
        for i in range(15):
            _draw_diecut_square(
                page,
                520 + (i % 5) * 40,
                40 + (i // 5) * 40,
                side=SMALL_TOKEN_STROKE_SIDE_PT,
                color=RUBINE_RED_C_RGB,
                width=0.99,
            )
        cuts = iter_diecut_candidates(page, require_rubine_stroke=True)
        self.assertEqual(len(cuts), 21)
        for cut in cuts:
            self.assertAlmostEqual(cut.side_pt, DIE_CUT_SIDE_PT, delta=0.75)
        doc.close()

    def test_iter_diecut_candidates_fixture_page(self):
        doc = pymupdf.open()
        page = doc.new_page(width=500, height=500)
        page.insert_text((10, 20), "PANTONE Rubine Red C marker")
        for i in range(21):
            _draw_diecut_square(page, 20 + (i % 7) * 70, 40 + (i // 7) * 70)
        cuts = iter_diecut_candidates(page, require_rubine_stroke=True)
        self.assertEqual(len(cuts), 21)
        doc.close()

    def test_bleed_disc_centered(self):
        die = pymupdf.Rect(10, 10, 10 + DIE_CUT_SIDE_PT, 10 + DIE_CUT_SIDE_PT)
        bleed = bleed_disc_rect(die)
        self.assertAlmostEqual(bleed.width, 82.21, delta=0.5)
        cx = (die.x0 + die.x1) / 2
        self.assertAlmostEqual((bleed.x0 + bleed.x1) / 2, cx, places=2)

    def test_png_slug(self):
        self.assertEqual(png_slug_for_token("treasure", "revealed"), "room-token-treasure_revealed.png")


class ExportSyntheticTest(unittest.TestCase):
    def test_export_revealed_kinds_from_synthetic(self):
        doc = pymupdf.open()
        page = doc.new_page(width=800, height=320)
        page.insert_text((5, 12), "Rubine Red C")
        xref_to_kind: dict[int, str] = {}
        for row in range(3):
            for col, kind in enumerate(KINDS):
                x = 10 + col * 90
                y = 30 + row * 80
                rect = pymupdf.Rect(x, y, x + DIE_CUT_SIDE_PT, y + DIE_CUT_SIDE_PT)
                _draw_diecut_square(page, rect.x0, rect.y0)
                pix = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, 4, 4), 1)
                pix.clear_with(40 + col * 30)
                xref = page.insert_image(rect, pixmap=pix)
                if row == 0:
                    xref_to_kind[int(xref)] = kind

        with tempfile.TemporaryDirectory() as tmp:
            png_dir = Path(tmp)
            with patch.dict(REVEALED_IMAGE_XREF_TO_KIND, xref_to_kind, clear=True):
                rows = export_tokens_from_page(
                    page,
                    pdf_rel="fixture_back.pdf",
                    page_no=3,
                    face="revealed",
                    png_dir=png_dir,
                    dpi=72,
                    crop_mode="diecut",
                    require_rubine_stroke=True,
                )
            self.assertEqual(len(rows), 7)
            self.assertEqual({r.kind for r in rows}, set(KINDS))
            for row in rows:
                self.assertTrue((png_dir / row.png_rel.split("/")[-1]).is_file())
        doc.close()


if __name__ == "__main__":
    unittest.main()
