"""Unit tests for print-card-art helpers (no real print PDFs)."""

import tempfile
import unittest
from pathlib import Path

import pymupdf

from ddbg_print_art.bleed import BLEED_INSET_PT, crop_rect
from ddbg_print_art.classify import classify_pdf
from ddbg_print_art.export_pdf import export_page_png
from ddbg_print_art.old_path import is_old_path


class OldPathTest(unittest.TestCase):
    def test_old_segments(self):
        self.assertTrue(is_old_path("wave1/Old_version/foo.pdf"))
        self.assertTrue(is_old_path("wave1/old/foo.pdf"))
        self.assertTrue(is_old_path("wave1/Old/foo.pdf"))
        self.assertTrue(is_old_path("wave1/old-version/foo.pdf"))
        self.assertFalse(is_old_path("wave1/02_DD_CARDS/foo.pdf"))


class ClassifyTest(unittest.TestCase):
    def test_monster_medium_front(self):
        k = classify_pdf("02_DD_CARDS/DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf")
        self.assertEqual(k.category, "monster_medium")
        self.assertEqual(k.side, "front")


class BleedTest(unittest.TestCase):
    def test_mediabox_minus_3mm_when_no_trim(self):
        doc = pymupdf.open()
        page = doc.new_page(width=200, height=300)
        rect, method = crop_rect(page)
        self.assertEqual(method, "mediabox_minus_3mm")
        media = page.mediabox
        self.assertAlmostEqual(rect.x0 - media.x0, BLEED_INSET_PT, places=2)
        doc.close()


class ExportFixtureTest(unittest.TestCase):
    def test_export_single_page_png(self):
        doc = pymupdf.open()
        page = doc.new_page(width=120, height=180)
        page.insert_text((20, 40), "Bone Soldier", fontsize=14)
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp) / "test.png"
            method, _ = export_page_png(page, dest, dpi=72)
            self.assertTrue(dest.is_file())
            self.assertIn(method, ("trimbox", "mediabox_minus_3mm", "mediabox_fallback"))
        doc.close()


if __name__ == "__main__":
    unittest.main()
