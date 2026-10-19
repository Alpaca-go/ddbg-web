#!/usr/bin/env node
/**
 * Parse TTS Workshop save JSON → apps/web/src/card-art/battle-position-art-map.json
 *
 * Maps (presentation only):
 * - Color Room Tiles bag → stance row strip images (TTS nicknames 1-2, 3, Large 1-2)
 * - The Darkest Heroes/{Hero}/Custom_Token → formal eight hero standee portraits
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("../../../", import.meta.url)));

const FORMAL_TTS = {
  Crusader: "CRUSADER",
  Hellion: "HELLION",
  Highwayman: "HIGHWAYMAN",
  Vestal: "VESTAL",
  "Bounty Hunter": "BOUNTY HUNTER",
  "Plague Doctor": "PLAGUE DOCTOR",
  "Grave Robber": "GRAVE ROBBER",
  Occultist: "OCCULTIST",
};

const STANCES = [
  { stance: "aggressive", rank: 1, labelZh: "进攻", colorTileNick: "1-2" },
  { stance: "defensive", rank: 2, labelZh: "防御", colorTileNick: "1-2" },
  { stance: "ranged", rank: 3, labelZh: "远程", colorTileNick: "3" },
  { stance: "support", rank: 4, labelZh: "支援", colorTileNick: null },
];

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
  arg("--out", resolve(root, "apps/web/src/card-art/battle-position-art-map.json")),
);

if (!ttsPath) {
  console.error("Missing --tts /path/to/workshop-save.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(ttsPath, "utf8"));
const pending = [];

const colorBag = findByNickname(data.ObjectStates || [], "Color Room Tiles");
const colorTiles = new Map();
for (const o of colorBag?.ContainedObjects || []) {
  if (o.Name === "Custom_Tile" && o.CustomImage?.ImageURL) {
    colorTiles.set(o.Nickname, o.CustomImage.ImageURL);
  }
}

const colorTileEntries = [];
for (const [nick, url] of colorTiles) {
  const slug = nick.toLowerCase().replace(/\s+/g, "-");
  colorTileEntries.push({
    ttsNickname: nick,
    imageUrl: url,
    cacheName: `stance-color-tile-${slug}`,
    ttsObject: "Custom_Tile",
    ttsBag: "Color Room Tiles",
  });
}

const stanceSlots = STANCES.map((row) => {
  if (!row.colorTileNick) {
    pending.push(
      `stance:${row.stance}: no dedicated Color Room Tile in TTS; UI uses CSS fallback strip only`,
    );
    return {
      stance: row.stance,
      rank: row.rank,
      labelZh: row.labelZh,
      colorTileNick: null,
      cacheName: null,
      imageUrl: null,
    };
  }
  const url = colorTiles.get(row.colorTileNick);
  if (!url) {
    pending.push(`stance:${row.stance}: missing Color Room Tile "${row.colorTileNick}"`);
    return {
      stance: row.stance,
      rank: row.rank,
      labelZh: row.labelZh,
      colorTileNick: row.colorTileNick,
      cacheName: null,
      imageUrl: null,
    };
  }
  const slug = row.colorTileNick.toLowerCase().replace(/\s+/g, "-");
  return {
    stance: row.stance,
    rank: row.rank,
    labelZh: row.labelZh,
    colorTileNick: row.colorTileNick,
    cacheName: `stance-color-tile-${slug}`,
    imageUrl: url,
  };
});

const largeTileUrl = colorTiles.get("Large 1-2");
const monsterWidthArt = largeTileUrl
  ? {
      ttsNickname: "Large 1-2",
      imageUrl: largeTileUrl,
      cacheName: "stance-color-tile-large-1-2",
      semantic: "large_monster_stance_span",
      pendingConfirmation:
        "TTS nickname only; not matched to printed stance width rules in this slice.",
    }
  : null;
if (!largeTileUrl) {
  pending.push('monster width: missing Color Room Tile "Large 1-2"');
}

const heroesBag = findByNickname(data.ObjectStates || [], "The Darkest Heroes");
const heroTokens = [];
for (const [ttsHero, engineHero] of Object.entries(FORMAL_TTS)) {
  const bag = (heroesBag?.ContainedObjects || []).find((o) => o.Nickname === ttsHero);
  const token = (bag?.ContainedObjects || []).find((o) => o.Name === "Custom_Token");
  const url = token?.CustomImage?.ImageURL;
  if (!url) {
    pending.push(`hero_token:${engineHero}: missing Custom_Token under ${ttsHero}`);
    continue;
  }
  const slug = ttsHero.toLowerCase().replace(/\s+/g, "-");
  heroTokens.push({
    hero: engineHero,
    ttsHero,
    imageUrl: url,
    cacheName: `hero-token-${slug}`,
    ttsObject: "Custom_Token",
    ttsPath: `The Darkest Heroes/${ttsHero}`,
  });
}

pending.push(
  "Monster card face atlas mapped separately in monster-face-art-map.json (not in this script).",
);
pending.push(
  "Color Room Tile nicknames (1-2, 3) aligned to stance rows by TTS bag labels only; not verified against print stance track colors.",
);

const out = {
  schema: "ddbg.tts-battle-position-art-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName || "Darkest Dungeon - Complete Edition",
    notes: [
      "Stance row strips from TTS Color Room Tiles Custom_Tile ImageURL only.",
      "Hero portraits from The Darkest Heroes Custom_Token ImageURL (formal eight).",
      "No print PDF; no Steam CDN hotlink in UI (local cache via cache-tts-card-art.mjs).",
    ],
  },
  colorTiles: colorTileEntries,
  stanceSlots,
  heroTokens,
  monsterWidthArt,
  pendingConfirmation: pending,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(
  `stanceSlots=${stanceSlots.length} heroTokens=${heroTokens.length} colorTiles=${colorTileEntries.length} pending=${pending.length}`,
);
