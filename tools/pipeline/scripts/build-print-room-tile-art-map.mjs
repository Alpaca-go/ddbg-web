#!/usr/bin/env node
/**
 * Promote room_tile_geometry tiles → apps/web room-tile-print-art-map.json.
 * PNG paths are Kyries manual / export conventions under .cache/print-card-art/ (gitignored).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");

const geometryPath = resolve(repoRoot, "packages/data/normalized/corebox/room_tile_geometry.json");
const out = resolve(repoRoot, "apps/web/src/card-art/room-tile-print-art-map.json");

const FACE_DIR = "manual/room-tile-faces";
const AREA_DIR = "manual/room-tile-areas";

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
    matchMethod: "manual_path_convention",
    reviewVerdict: "path_convention",
    areaIds: t.areas.map((a) => a.id),
    areaPngRelTemplate: `${AREA_DIR}/${sanitizeTileId(t.id)}/{areaId}.png`,
  }));

const map = {
  schema: "ddbg.print-room-tile-art-map.v1",
  source: {
    geometry: "packages/data/normalized/corebox/room_tile_geometry.json",
    tileCount: tiles.length,
    notes: [
      "facePngRel / areaPngRelTemplate are relative to .cache/print-card-art/ (DDBG_PRINT_CARD_ART_CACHE).",
      "Per-area crops: manual/room-tile-areas/<tileId>/<areaId>.png; whole face: manual/room-tile-faces/<tileId>.png.",
      "R-048: no invented print geometry in UI; missing PNG → Chinese placeholder.",
      "Regenerate: node tools/pipeline/scripts/build-print-room-tile-art-map.mjs",
    ],
  },
  tiles,
  pendingConfirmation: [
    "Kyries manual exports for room tile faces and per-area crops are not committed; paths are conventions only.",
  ],
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map, null, 2) + "\n", "utf8");
console.log(`Wrote ${tiles.length} tiles → ${out.replace(repoRoot + "/", "")}`);
