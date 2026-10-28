"""Export approved battle room tile faces from COREBOX TILES PDFs (TrimBox page raster)."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import pymupdf

from .export_pdf import export_page_png
from .input_scan import assert_unique_png_outputs


def sanitize_tile_id_for_path(tile_id: str) -> str:
    return tile_id.replace(":", "-")


def face_png_rel(tile_id: str, *, face_dir: str = "manual/room-tile-faces") -> str:
    return f"{face_dir}/{sanitize_tile_id_for_path(tile_id)}.png"


def load_geometry_tiles(repo_root: Path) -> list[dict]:
    path = repo_root / "packages/data/normalized/corebox/room_tile_geometry.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    tiles = data.get("tiles") or []
    return [t for t in tiles if t.get("geometryVerified") is True]


def find_pdf_by_basename(input_root: Path, basename: str) -> Path:
    matches = sorted(p for p in input_root.rglob(basename) if p.is_file())
    if not matches:
        raise FileNotFoundError(f"No PDF named {basename!r} under {input_root}")
    if len(matches) > 1:
        rels = ", ".join(m.relative_to(input_root).as_posix() for m in matches[:4])
        raise ValueError(f"Ambiguous PDF {basename!r}: {len(matches)} matches (e.g. {rels})")
    return matches[0]


@dataclass
class RoomTileFaceExportRow:
    tile_id: str
    name: str
    png_rel: str
    pdf_basename: str
    page: int
    face: str
    crop_method: str


def run_room_tile_face_export(
    input_root: Path,
    out_root: Path,
    repo_root: Path,
    *,
    dpi: int = 200,
    dry_run: bool = False,
) -> list[RoomTileFaceExportRow]:
    tiles = load_geometry_tiles(repo_root)
    if not tiles:
        raise ValueError("No geometryVerified tiles in room_tile_geometry.json")

    pdf_cache: dict[str, pymupdf.Document] = {}
    png_claims: dict[str, str] = {}
    rows: list[RoomTileFaceExportRow] = []

    try:
        for tile in tiles:
            tile_id = str(tile["id"])
            source = tile["source"]
            pdf_name = str(source["file"])
            page_no = int(source["page"])
            face = str(source.get("face") or source.get("side") or "front")

            if pdf_name not in pdf_cache:
                pdf_path = find_pdf_by_basename(input_root, pdf_name)
                pdf_cache[pdf_name] = pymupdf.open(pdf_path)

            doc = pdf_cache[pdf_name]
            if page_no < 1 or page_no > doc.page_count:
                raise ValueError(
                    f"{tile_id}: page {page_no} out of range for {pdf_name} ({doc.page_count} pages)",
                )

            png_rel = face_png_rel(tile_id)
            assert_unique_png_outputs(png_rel, tile_id, png_claims)

            if dry_run:
                rows.append(
                    RoomTileFaceExportRow(
                        tile_id=tile_id,
                        name=str(tile.get("name") or ""),
                        png_rel=png_rel,
                        pdf_basename=pdf_name,
                        page=page_no,
                        face=face,
                        crop_method="dry_run",
                    ),
                )
                continue

            page = doc.load_page(page_no - 1)
            dest = out_root / png_rel
            crop_method, _clip = export_page_png(page, dest, dpi)
            rows.append(
                RoomTileFaceExportRow(
                    tile_id=tile_id,
                    name=str(tile.get("name") or ""),
                    png_rel=png_rel,
                    pdf_basename=pdf_name,
                    page=page_no,
                    face=face,
                    crop_method=crop_method,
                ),
            )
    finally:
        for doc in pdf_cache.values():
            doc.close()

    return rows
