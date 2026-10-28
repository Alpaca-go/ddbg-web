"""Room tile face export (synthetic PDF + patched geometry manifest)."""

import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from ddbg_print_art.room_tile_faces import (
    face_png_rel,
    find_pdf_by_basename,
    run_room_tile_face_export,
    sanitize_tile_id_for_path,
)


class RoomTileFacePathTest(unittest.TestCase):
    def test_sanitize_tile_id(self):
        self.assertEqual(sanitize_tile_id_for_path("room_tile:p002:front"), "room_tile-p002-front")
        self.assertEqual(face_png_rel("room_tile:p001"), "manual/room-tile-faces/room_tile-p001.png")


class RoomTileFaceExportTest(unittest.TestCase):
    def test_find_pdf_by_basename(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            nested = root / "a" / "b"
            nested.mkdir(parents=True)
            pdf = nested / "DD_COREBOX_TILES_FRONT.pdf"
            pdf.write_bytes(b"%PDF-1.4\n")
            found = find_pdf_by_basename(root, "DD_COREBOX_TILES_FRONT.pdf")
            self.assertEqual(found, pdf)

    def test_export_single_tile_page(self):
        fake_tiles = [
            {
                "id": "room_tile:p099:front",
                "name": "Fixture Chamber",
                "geometryVerified": True,
                "source": {"file": "DD_COREBOX_TILES_FRONT.pdf", "page": 2, "face": "front"},
            },
        ]
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            input_root = root / "in"
            wave = input_root / "COREBOX"
            wave.mkdir(parents=True)
            pdf_path = wave / "DD_COREBOX_TILES_FRONT.pdf"
            doc = pymupdf.open()
            doc.new_page(width=300, height=300)
            page2 = doc.new_page(width=300, height=300)
            page2.insert_text((10, 20), "page2")
            doc.save(str(pdf_path))
            doc.close()

            out_root = root / "out"
            repo_root = root / "repo"
            repo_root.mkdir()
            (repo_root / "packages/data/normalized/corebox").mkdir(parents=True)
            (repo_root / "packages/data/normalized/corebox/room_tile_geometry.json").write_text(
                json.dumps({"tiles": fake_tiles}),
                encoding="utf-8",
            )

            with patch(
                "ddbg_print_art.room_tile_faces.load_geometry_tiles",
                return_value=fake_tiles,
            ):
                rows = run_room_tile_face_export(
                    input_root,
                    out_root,
                    repo_root,
                    dpi=72,
                    dry_run=False,
                )

            self.assertEqual(len(rows), 1)
            self.assertEqual(rows[0].tile_id, "room_tile:p099:front")
            png = out_root / rows[0].png_rel
            self.assertTrue(png.is_file())
            self.assertGreater(png.stat().st_size, 100)


if __name__ == "__main__":
    unittest.main()
