#!/usr/bin/env node
/**
 * Parse TTS Workshop save JSON → apps/web/src/card-art/exploration-art-map.json
 *
 * Maps (presentation only):
 * - QuestMap FRONT pages: Custom_Tile ImageURL order in bags "Dungeon Tiles" + "Darkest Dungeon Tiles"
 * - Room token chips: Custom_Tile under Infinite_Bag nicknames Empty/Lair/…
 * - Ruins room cards: CustomDeck 447 in "Room Cards (Darkest Dungeon)"; cell = print page + 12
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
const roomsPath = resolve(root, "packages/data/normalized/corebox/room.json");
const layoutsPath = resolve(root, "packages/data/normalized/corebox/dungeon_layouts.json");

if (!ttsPath) {
  console.error("Missing --tts /path/to/workshop-save.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(ttsPath, "utf8"));
const rooms = JSON.parse(readFileSync(roomsPath, "utf8")).cards;
const layouts = JSON.parse(readFileSync(layoutsPath, "utf8")).layouts;

const pending = [];

const dungeonTiles = findByNickname(data.ObjectStates || [], "Dungeon Tiles");
const darkestTiles = findByNickname(data.ObjectStates || [], "Darkest Dungeon Tiles");
const tileObjects = [
  ...(dungeonTiles?.ContainedObjects || []),
  ...(darkestTiles?.ContainedObjects || []),
].filter((o) => o.Name === "Custom_Tile" && o.CustomImage?.ImageURL);

const questMapPages = [];
for (const layout of layouts) {
  const page = layout.source.page;
  const idx = page - 1;
  const tile = tileObjects[idx];
  if (!tile) {
    pending.push(`quest_map:p${String(page).padStart(3, "0")}: missing TTS tile index ${idx}`);
    continue;
  }
  questMapPages.push({
    id: layout.id,
    page,
    imageUrl: tile.CustomImage.ImageURL,
    cacheName: `quest-map-p${String(page).padStart(3, "0")}`,
    ttsObject: "Custom_Tile",
    ttsBag:
      idx < (dungeonTiles?.ContainedObjects?.length || 0)
        ? "Dungeon Tiles"
        : "Darkest Dungeon Tiles",
    ttsIndex: idx,
  });
}

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

const roomDeck = findByNickname(data.ObjectStates || [], "Room Cards (Darkest Dungeon)");
const deckInfo = roomDeck?.CustomDeck?.["447"];
if (!roomDeck || !deckInfo?.FaceURL) {
  pending.push('Missing "Room Cards (Darkest Dungeon)" CustomDeck 447');
}

const atlases = {};
if (deckInfo) {
  atlases["447"] = {
    faceUrl: deckInfo.FaceURL,
    backUrl: deckInfo.BackURL || null,
    numWidth: deckInfo.NumWidth,
    numHeight: deckInfo.NumHeight,
  };
}

const ttsCells = new Set(
  (roomDeck?.ContainedObjects || []).filter((o) => o.CardID != null).map((o) => o.CardID % 100),
);

const roomCards = [];
for (const card of rooms.filter((c) => c.location === "ruins")) {
  const page = card.source.page;
  const cell = page + 12;
  if (!deckInfo) continue;
  if (!ttsCells.has(cell)) {
    pending.push(`${card.id} page ${page} → cell ${cell} not present on TTS deck 447`);
    continue;
  }
  const maxCell = deckInfo.NumWidth * deckInfo.NumHeight;
  if (cell >= maxCell) {
    pending.push(`${card.id} cell ${cell} out of 6×6 atlas`);
    continue;
  }
  roomCards.push({
    id: card.id,
    name: card.name,
    page,
    boss: card.boss,
    faceUrl: deckInfo.FaceURL,
    backUrl: deckInfo.BackURL || null,
    numWidth: deckInfo.NumWidth,
    numHeight: deckInfo.NumHeight,
    deckId: "447",
    cell,
    ttsCardId: 447 * 100 + cell,
    cellSource: "room_print_page_plus_12",
  });
}

roomCards.sort((a, b) => a.id.localeCompare(b.id));

const out = {
  schema: "ddbg.tts-exploration-art-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName ?? null,
    notes: [
      "QuestMap images: ImageURL order in TTS bags Dungeon Tiles (12) then Darkest Dungeon Tiles (2).",
      "Room tokens: first Custom_Tile ImageURL under each exploration token Infinite_Bag.",
      "Ruins room cards: deck 447 cells = rooms_FRONT print page + 12 (TTS CardID % 100).",
      "No print PDF imagery; battle Room Tile boards not present as keyed TTS objects in this save.",
    ],
  },
  atlases,
  questMapPages,
  roomTokens,
  roomCards,
  pendingConfirmation: [
    ...pending,
    "QuestMap tile order follows TTS ContainedObjects order only; not re-verified page-by-page against print FRONT p1–14.",
    "Corridor segment tiles (Base/Darkest Room Tiles nicknames 0-1, 1-2, …) not wired — web map has no corridor geometry.",
    "Battle Room Tile faces (room_tile_geometry) not mapped; TTS has no per-tile identity for ruins boards in this save.",
    "Stygian / other location room cards use other decks (e.g. 450) — out of this slice.",
  ],
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `Wrote quest=${questMapPages.length} tokens=${roomTokens.length} roomCards=${roomCards.length} → ${outPath}`,
);
if (pending.length) console.warn("Pending:", pending);
