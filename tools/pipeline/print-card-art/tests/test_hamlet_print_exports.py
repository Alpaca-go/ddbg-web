"""Hamlet board TrimBox export (synthetic fixture)."""

import tempfile
import unittest
from pathlib import Path

import pymupdf

from ddbg_print_art.hamlet_board import run_hamlet_board_export


class HamletBoardExportTest(unittest.TestCase):
    def test_trimbox_export_fixture(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_root = Path(tmp) / "DARKEST_DUNGEON_PRINT_EN_WAVE 1" / "MG_DD_01_EN_COREBOX_Print"
            input_root.mkdir(parents=True)
            pdf_path = input_root / "DD_EN_COREBOX_BOARD_Hamlet_FRONT.pdf"
            doc = pymupdf.open()
            page = doc.new_page(width=960, height=600)
            page.set_trimbox(pymupdf.Rect(56.69, 56.69, 898.58, 532.91))
            page.insert_text((80, 100), "Survivalist I", fontsize=12)
            doc.save(pdf_path)
            doc.close()
            out_root = Path(tmp) / "out"
            row = run_hamlet_board_export(Path(tmp), out_root, dpi=72, dry_run=False)
            self.assertEqual(row.png_rel, "png/hamlet-board-front.png")
            self.assertTrue((out_root / row.png_rel).is_file())
            self.assertAlmostEqual(row.trim_width_pt, 841.89, delta=0.1)


if __name__ == "__main__":
    unittest.main()
