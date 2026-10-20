"""Hamlet board / BLD building tile export (synthetic + hints)."""

import json
import tempfile
import unittest
from pathlib import Path

import pymupdf

from ddbg_print_art.hamlet_board import run_hamlet_board_export
from ddbg_print_art.hamlet_building_tiles import (
    EXPECTED_UPGRADE_TILE_COUNT,
    _export_clip_for_panel,
    _load_bld_p1_hints,
    run_hamlet_building_tile_export,
)
from ddbg_print_art.diecut import BuildingTilePanel, punchboard_300x300_pdf_candidates
from ddbg_print_art.tile_raster_quality import assert_building_tile_raster

BLD_PDF = (
    Path("/tmp/DARKEST_DUNGEON_PRINT_EN_WAVE 1/MG_DD_01_EN_COREBOX_Print")
    / "DD_EN_COREBOX_PUNCHBOARD_300x300_FRONT.pdf"
)


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


class BldHintsTest(unittest.TestCase):
    def test_hints_cover_upgradable_buildings(self):
        hints = _load_bld_p1_hints()
        self.assertEqual(len(hints), EXPECTED_UPGRADE_TILE_COUNT)
        keys = {(h["buildingId"], int(h["level"])) for h in hints}
        for building in (
            "abbey",
            "tavern",
            "sanitarium",
            "survivalist",
            "stagecoach",
            "blacksmith",
            "nomadWagon",
        ):
            self.assertIn((building, 2), keys)
            self.assertIn((building, 3), keys)

    def test_hints_fixture_json(self):
        fixture = Path(__file__).resolve().parents[1] / "fixtures" / "hamlet-building-tile-bld-p1-hints.json"
        data = json.loads(fixture.read_text(encoding="utf-8"))
        self.assertEqual(data["page"], 1)
        self.assertEqual(len(data["tiles"]), EXPECTED_UPGRADE_TILE_COUNT)


@unittest.skipUnless(BLD_PDF.is_file(), "Kyries BLD PDF not on disk (local validation only)")
class BldExportQualityTest(unittest.TestCase):
    def test_exported_tiles_non_black_and_verify_phrases(self):
        import pymupdf

        with tempfile.TemporaryDirectory() as tmp:
            out_root = Path(tmp) / "out"
            rows = run_hamlet_building_tile_export(Path("/tmp"), out_root, dpi=120, omit_hidden_terms=False)
            self.assertEqual(len(rows), EXPECTED_UPGRADE_TILE_COUNT)
            _back, front = punchboard_300x300_pdf_candidates("/tmp")
            self.assertTrue(front)
            doc = pymupdf.open(Path("/tmp") / front)
            page = doc[0]
            hints = {(h["buildingId"], int(h["level"])): h for h in _load_bld_p1_hints()}
            for row in rows:
                hint = hints[(row.building_id, row.level)]
                phrases = [str(p) for p in hint["verifyPhrases"]]
                panel = BuildingTilePanel(0, "die", pymupdf.Rect(row.diecut_pt), 0.0, 0.0)
                clip = _export_clip_for_panel(panel)
                assert_building_tile_raster(page, clip, verify_phrases=phrases)
                png = out_root / row.png_rel
                self.assertTrue(png.is_file(), png)
            doc.close()


if __name__ == "__main__":
    unittest.main()
