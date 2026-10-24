"""PNG slug/basename must stay aligned with tools/pipeline/scripts/lib/print-png-rel.mjs."""

from __future__ import annotations

import unittest

from ddbg_print_art.paths import png_basename, slugify_pdf_rel

CORE_STAT = (
    "DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print/"
    "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_100x180_Hero_STAT_FRONT.pdf"
)


class TestPngBasename(unittest.TestCase):
    def test_no_double_pdf_suffix(self) -> None:
        base = png_basename(CORE_STAT, 1, False)
        self.assertNotIn(".pdf.pdf", base)
        self.assertTrue(base.endswith(".pdf_p001.png"))

    def test_slug_keeps_single_pdf_extension(self) -> None:
        slug = slugify_pdf_rel(CORE_STAT)
        self.assertTrue(slug.endswith(".pdf"))
        self.assertEqual(slug.count(".pdf"), 1)


if __name__ == "__main__":
    unittest.main()
