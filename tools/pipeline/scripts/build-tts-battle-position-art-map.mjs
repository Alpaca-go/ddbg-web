#!/usr/bin/env node
/**
 * Parse TTS Workshop save JSON → apps/web/src/card-art/battle-position-art-map.json
 *
 * Maps (presentation only):
 * - The Darkest Heroes/{Hero}/Custom_Token → formal eight hero standee portraits
 *
 * Stance track art: monster-stance-print-art-map.json (print TrimBox board).
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
  "Monster standee / card atlas not mapped in this slice (see phase4-card-art-faces out of scope).",
);

const out = {
  schema: "ddbg.tts-hero-token-art-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName || "Darkest Dungeon - Complete Edition",
    notes: [
      "Hero portraits from The Darkest Heroes Custom_Token ImageURL (formal eight).",
      "Stance track art uses monster-stance-print-art-map.json (print TrimBox board); no TTS Color Room Tiles.",
      "No print PDF; no Steam CDN hotlink in UI (local cache via cache-tts-card-art.mjs).",
    ],
  },
  heroTokens,
  pendingConfirmation: pending,
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${outPath}`);
console.log(`heroTokens=${heroTokens.length} pending=${pending.length}`);
