#!/usr/bin/env node
/**
 * Promote geometryVerified room tiles → apps/web room-tile-print-art-map.json.
 * PNGs: export_room_tile_faces.py (TrimBox page from each tile's source PDF/page).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const geometryPath = resolve(repoRoot, "packages/data/normalized/corebox/room_tile_geometry.json");
const out = resolve(repoRoot, "apps/web/src/card-art/room-tile-print-art-map.json");

const FACE_DIR = "manual/room-tile-faces";

function sanitizeTileId(tileId) {
  return tileId.replace(/:/g, "-");
}

function facePngRel(tileId) {
  return `${FACE_DIR}/${sanitizeTileId(tileId)}.png`;
}

const geometry = JSON.parse(readFileSync(geometryPath, "utf8"));
const tiles = geometry.tiles
  .filter((t) => t.geometryVerified === true)
  .map((t) => ({
    tileId: t.id,
    name: t.name,
    facePngRel: facePngRel(t.id),
    printPage: t.source.page,
    primaryPdf: t.source.file,
    face: t.source.face,
    matchMethod: "geometry_source_trim_page",
    reviewVerdict: t.ruling ?? t.approval ?? "geometry_verified",
    areaIds: t.areas.map((a) => a.id),
  }));

const map = {
  schema: "ddbg.print-room-tile-art-map.v1",
  source: {
    geometry: "packages/data/normalized/corebox/room_tile_geometry.json",
    tileCount: tiles.length,
    exportScript: "tools/pipeline/print-card-art/export_room_tile_faces.py",
    notes: [
      "facePngRel paths are relative to .cache/print-card-art/ (DDBG_PRINT_CARD_ART_CACHE).",
      "Battle UI uses whole TrimBox page only (no per-area crops in web).",
      "R-048: page/file come from approved room_tile_geometry source; missing PNG → Chinese placeholder.",
      "Regenerate map: node tools/pipeline/scripts/build-print-room-tile-art-map.mjs",
      "Export PNGs: node tools/pipeline/scripts/export-print-room-tile-faces.mjs --input <EN_FILES>",
    ],
  },
  tiles,
  pendingConfirmation: [
    "Mapped: 9 geometryVerified Ruins faces (room_tile_geometry rooms 1–5, FRONT/BACK pages only).",
    "Not mapped: Ruins p006–p012 faces and all Darkest Dungeon / other location tiles (no approved geometry).",
    "PNG binaries gitignored; local cache required for battle underlay art.",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${tiles.length} tiles → ${out.replace(repoRoot + "/", "")}`);
