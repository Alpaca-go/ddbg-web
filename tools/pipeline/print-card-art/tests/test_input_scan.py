"""EN_FILES input filtering and PNG output collision guard."""

import tempfile
import unittest
from pathlib import Path

from ddbg_print_art.input_scan import (
    assert_unique_png_outputs,
    is_en_print_pdf_rel,
    iter_input_pdfs,
    path_has_excluded_segment,
)
from ddbg_print_art.paths import png_basename


class InputScanTest(unittest.TestCase):
    def test_excludes_chinese_and_tmp(self):
        self.assertTrue(path_has_excluded_segment("中文版/foo.pdf"))
        self.assertTrue(path_has_excluded_segment("tmp/scratch.pdf"))
        self.assertFalse(
            is_en_print_pdf_rel("中文版/DARKEST_DUNGEON_PRINT_EN_WAVE_1/x.pdf")
        )

    def test_accepts_en_wave_paths(self):
        rel = "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/a.pdf"
        self.assertTrue(is_en_print_pdf_rel(rel))

    def test_iter_input_pdfs_skips_non_en(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            en = root / "DARKEST_DUNGEON_PRINT_EN_WAVE 1" / "deck"
            zh = root / "中文版" / "deck"
            en.mkdir(parents=True)
            zh.mkdir(parents=True)
            en_pdf = en / "DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf"
            zh_pdf = zh / "DD_EN_COREBOX_CARDS_63x88_CURIO_FRONT_V2.pdf"
            en_pdf.write_bytes(b"%PDF-1.4\n")
            zh_pdf.write_bytes(b"%PDF-1.4\n")
            found = iter_input_pdfs(root)
            self.assertEqual(len(found), 1)
            self.assertIn("PRINT_EN_WAVE", found[0].as_posix())

    def test_duplicate_png_raises(self):
        claims: dict[str, str] = {}
        assert_unique_png_outputs("png/a.png", "src-a", claims)
        with self.assertRaises(ValueError):
            assert_unique_png_outputs("png/a.png", "src-b", claims)

    def test_monster_stance_fixture_slug_matches_run_py(self):
        pdf_rel = (
            "DARKEST_DUNGEON_PRINT_EN_WAVE_1/MG_DD_01_EN_COREBOX_Print/"
            "DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf"
        )
        expected = f"png/{png_basename(pdf_rel, 1, False)}"
        self.assertEqual(
            expected,
            "png/DARKEST_DUNGEON_PRINT_EN_WAVE_1_MG_DD_01_EN_COREBOX_Print_"
            "DD_COREBOX_BOARD_Monster_Stance_FRONT.pdf_p001.png",
        )


if __name__ == "__main__":
    unittest.main()
