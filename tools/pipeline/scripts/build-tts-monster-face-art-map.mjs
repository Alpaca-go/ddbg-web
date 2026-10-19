#!/usr/bin/env node
/**
 * Parse TTS Workshop save JSON → apps/web/src/card-art/monster-face-art-map.json
 *
 * Maps (presentation only):
 * - Core box monster_medium / monster_large cards → TTS "Monsters Cards" Face atlas cells
 * - Match by TTS object Nickname = printed monster name; disambiguate by deck/category/level/page
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

function* walk(objs, path = "") {
  for (const o of objs) {
    const nick = o.Nickname || "";
    const p2 = `${path}/${nick || o.Name || ""}`;
    yield [p2, o];
    for (const c of o.ContainedObjects || []) yield* walk([c], p2);
  }
}

function uniqueHits(hits) {
  const m = new Map();
  for (const h of hits) m.set(`${h.deck}:${h.cell}`, h);
  return [...m.values()];
}

function pickHit(card, hits, allCards) {
  const uniq = uniqueHits(hits);
  if (uniq.length === 1) return { hit: uniq[0], cellSource: "tts_nickname_unique" };

  const page = card.pages[0];
  const isLarge = card.id.startsWith("monster_large");
  const sameName = allCards.filter((c) => c.name === card.name);
  const hasMed = sameName.some((c) => c.id.startsWith("monster_medium"));
  const hasLg = sameName.some((c) => c.id.startsWith("monster_large"));

  if (hasMed && hasLg && uniq.some((h) => h.deck === 466) && uniq.some((h) => h.deck !== 466)) {
    if (isLarge) {
      const hit = uniq.find((h) => h.deck === 466) || uniq[0];
      return { hit, cellSource: "tts_nickname_large_deck466" };
    }
    const hit = uniq.find((h) => h.deck === 461 || h.deck === 460) || uniq[0];
    return { hit, cellSource: "tts_nickname_medium_deck461_460" };
  }

  const cat = card.id.split(":")[0];
  const sameCat = sameName.filter((c) => c.id.startsWith(cat)).sort((a, b) => a.level - b.level);
  if (sameCat.length > 1) {
    const sorted = [...uniq].sort((a, b) => a.cell - b.cell || a.deck - b.deck);
    const idx = sameCat.findIndex((c) => c.id === card.id);
    if (idx >= 0 && sorted[idx]) {
      return { hit: sorted[idx], cellSource: "tts_nickname_level_index" };
    }
  }

  if (sameCat.length === 1 && card.level && new Set(uniq.map((u) => u.deck)).size === 1) {
    const sorted = [...uniq].sort((a, b) => a.cell - b.cell);
    const idx = card.level - 1;
    if (sorted[idx]) {
      return { hit: sorted[idx], cellSource: "tts_level_index_single_deck" };
    }
  }

  const pageHit = uniq.find((h) => h.cell === page - 1) || uniq.find((h) => h.cell === page);
  if (pageHit) {
    return {
      hit: pageHit,
      cellSource: pageHit.cell === page - 1 ? "tts_page_minus_one" : "tts_page_exact",
    };
  }

  return null;
}

const ttsPath = resolve(arg("--tts", ""));
const outPath = resolve(
  arg("--out", resolve(root, "apps/web/src/card-art/monster-face-art-map.json")),
);
const mediumPath = resolve(root, "packages/data/normalized/corebox/monster_medium.json");
const largePath = resolve(root, "packages/data/normalized/corebox/monster_large.json");

if (!ttsPath) {
  console.error("Missing --tts /path/to/workshop-save.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(ttsPath, "utf8"));
const medium = JSON.parse(readFileSync(mediumPath, "utf8")).cards;
const large = JSON.parse(readFileSync(largePath, "utf8")).cards;
const allCards = [...medium, ...large];

const atlases = {};
const ttsByName = new Map();
const pending = [];

for (const [path, o] of walk(data.ObjectStates || [])) {
  if (!path.includes("Monsters Cards") || o.CardID == null) continue;
  const nick = o.Nickname;
  if (!nick || nick === "Deck" || nick === "Card") continue;
  const cid = Number(o.CardID);
  const deck = Math.floor(cid / 100);
  const cell = cid % 100;
  const info = (o.CustomDeck || {})[String(deck)];
  if (info?.FaceURL && !atlases[String(deck)]) {
    atlases[String(deck)] = {
      faceUrl: info.FaceURL,
      backUrl: info.BackURL || null,
      numWidth: info.NumWidth,
      numHeight: info.NumHeight,
    };
  }
  const list = ttsByName.get(nick) || [];
  list.push({ deck, cell, cid, path });
  ttsByName.set(nick, list);
}

const cards = [];
for (const card of allCards) {
  const hits = ttsByName.get(card.name);
  if (!hits) {
    pending.push(`${card.id}: no TTS Monsters Cards nickname "${card.name}"`);
    continue;
  }
  const picked = pickHit(card, hits, allCards);
  if (!picked) {
    pending.push(`${card.id}: ambiguous TTS cells for "${card.name}"`);
    continue;
  }
  const deckId = String(picked.hit.deck);
  const atlas = atlases[deckId];
  if (!atlas) {
    pending.push(`${card.id}: missing atlas for deck ${deckId}`);
    continue;
  }
  cards.push({
    id: card.id,
    name: card.name,
    level: card.level,
    page: card.pages[0],
    category: card.id.split(":")[0],
    faceUrl: atlas.faceUrl,
    backUrl: atlas.backUrl,
    numWidth: atlas.numWidth,
    numHeight: atlas.numHeight,
    deckId,
    cell: picked.hit.cell,
    ttsCardId: picked.hit.cid,
    cellSource: picked.cellSource,
  });
}

pending.push(
  "Extension / Boss / Stygian monsters outside Darkest Dungeon Monsters Cards bags not scanned.",
);
pending.push(
  "Cell disambiguation uses TTS nickname + level/page heuristics only; not verified against every print FRONT page.",
);
pending.push(
  "monsterWidthArt Large 1-2 stance strip remains in battle-position-art-map; not bound to engine stanceSlots here.",
);
pending.push(
  "Warrens / Weald / Cove / Crimson Court / Color of Madness monster decks not in core-box slice.",
);

const atlasesUsed = {};
for (const card of cards) {
  if (!atlasesUsed[card.deckId] && atlases[card.deckId]) {
    atlasesUsed[card.deckId] = atlases[card.deckId];
  }
}

const out = {
  schema: "ddbg.tts-monster-face-art-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName || "Darkest Dungeon - Complete Edition",
    notes: [
      "Face cells from TTS Monsters Cards CustomDeck FaceURL (decks 460/461/466 core box).",
      "No print PDF; local cache via cache-tts-card-art.mjs.",
    ],
  },
  atlases: atlasesUsed,
  cards,
  pendingConfirmation: pending,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(
  `cards=${cards.length} atlases=${Object.keys(atlases).length} pending=${pending.length}`,
);
