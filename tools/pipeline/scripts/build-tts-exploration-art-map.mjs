#!/usr/bin/env node
/**
 * Parse TTS Workshop save JSON → apps/web/src/card-art/exploration-art-map.json
 *
 * Maps (presentation only):
 * - Room token chips: Custom_Tile under Infinite_Bag nicknames Empty/Lair/…
 *
 * QuestMap + ruins room cards use print PNG (exploration-print-art-map.json).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

const TOKEN_BAGS = {
  empty: "Empty",
  dark: "Dark Room",
  curio: "Curio",
  lair: "Lair",
  trap: "Trap",
  treasure: "Treasure",
  objective: "Objective",
};

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function* walk(objs) {
  for (const o of objs) {
    yield o;
    for (const c of o.ContainedObjects || []) yield* walk([c]);
  }
}

function findByNickname(objs, nickname) {
  for (const o of walk(objs)) {
    if (o.Nickname === nickname) return o;
  }
  return null;
}

const ttsPath = resolve(arg("--tts", ""));
const outPath = resolve(
  arg("--out", resolve(root, "apps/web/src/card-art/exploration-art-map.json")),
);

if (!ttsPath) {
  console.error("Missing --tts /path/to/workshop-save.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(ttsPath, "utf8"));

const pending = [];

const roomTokens = [];
for (const [kind, bagNick] of Object.entries(TOKEN_BAGS)) {
  const bag = findByNickname(data.ObjectStates || [], bagNick);
  const tile = bag?.ContainedObjects?.find(
    (o) => o.Name === "Custom_Tile" && o.CustomImage?.ImageURL,
  );
  if (!tile) {
    pending.push(`room token kind ${kind}: bag "${bagNick}" missing Custom_Tile`);
    continue;
  }
  roomTokens.push({
    kind,
    imageUrl: tile.CustomImage.ImageURL,
    cacheName: `token-${kind}`,
    ttsBag: bagNick,
  });
}

const out = {
  schema: "ddbg.tts-exploration-art-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName ?? null,
    notes: [
      "Room tokens only: first Custom_Tile ImageURL under each exploration token Infinite_Bag.",
      "QuestMap + ruins room cards use exploration-print-art-map.json (print PNG); regenerate via build-print-exploration-art-map.mjs.",
      "Battle Room Tile boards not present as keyed TTS objects in this save.",
    ],
  },
  roomTokens,
  pendingConfirmation: [
    ...pending,
    "room_token ×7: print export is punchboard sheet only; per-token PNG export pending (R-048). TTS Custom_Tile until confirmed.",
    "Corridor segment tiles (Base/Darkest Room Tiles nicknames 0-1, 1-2, …) not wired — web map has no corridor geometry.",
    "Battle Room Tile faces (room_tile_geometry) not mapped; TTS has no per-tile identity for ruins boards in this save.",
    "Stygian / other location room cards use other decks (e.g. 450) — out of this slice.",
  ],
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote tokens=${roomTokens.length} → ${outPath}`);
if (pending.length) console.warn("Pending:", pending);
