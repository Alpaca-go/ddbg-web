"""TrimBox export validation for curio / trinket / quest decks."""

import tempfile
import unittest
from pathlib import Path

import pymupdf

from ddbg_print_art.corebox_trim_decks import (
    DECK_SPECS,
    assert_trim_matches,
    run_corebox_trim_export,
)
from ddbg_print_art.export_pdf import page_text_snippet


class CoreboxTrimDeckTest(unittest.TestCase):
    def test_curio_trim_dimensions(self):
        spec = next(s for s in DECK_SPECS if s.key == "curio")
        doc = pymupdf.open()
        page = doc.new_page(width=220, height=292)
        trim = pymupdf.Rect(21, 21, 199.58, 270.45)
        page.set_trimbox(trim)
        page.insert_text((30, 50), "Eldritch Altar", fontsize=12)
        clip = assert_trim_matches(page, spec.trim)
        snippet = page_text_snippet(page, clip)
        self.assertIn("Eldritch", snippet)
        doc.close()

    def test_export_fixture_pdf_tree(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_root = Path(tmp) / "WAVE 1" / "MG_DD_01_EN_COREBOX_Print" / "02_DD_CARDS_COREBOX"
            input_root.mkdir(parents=True)
            spec = next(s for s in DECK_SPECS if s.key == "quest")
            for pdf_spec in spec.pdfs:
                pdf_path = input_root / pdf_spec.filename
                doc = pymupdf.open()
                for _ in range(pdf_spec.page_count):
                    page = doc.new_page(width=230, height=400)
                    page.set_trimbox(pymupdf.Rect(10, 12, 10 + 198.43, 12 + 340.16))
                doc.save(pdf_path)
                doc.close()
            out_root = Path(tmp) / "out"
            rows = run_corebox_trim_export(
                Path(tmp),
                out_root,
                dpi=72,
                decks=("quest",),
                dry_run=False,
            )
            self.assertEqual(len(rows), sum(p.page_count for p in spec.pdfs))
            self.assertTrue((out_root / rows[0].png_rel).is_file())


if __name__ == "__main__":
    unittest.main()
