#!/usr/bin/env node
/**
 * Parse a TTS Workshop save JSON and emit apps/web/src/card-art/hero-skill-face-map.json.
 *
 * Usage:
 *   node tools/pipeline/scripts/build-tts-hero-skill-face-map.mjs \
 *     --tts /path/to/3657612854.json \
 *     [--out apps/web/src/card-art/hero-skill-face-map.json]
 *
 * Mapping rules (presentation only; does not invent FaceURL):
 * - FaceURL / BackURL / NumWidth / NumHeight from CustomDeck on formal hero skill decks
 * - L1 cell from CardID under The Darkest Heroes/{Hero}/Deck (10×7 atlases only)
 * - L1 cells (sorted by deckId, cell) matched to I-level skills in print-page order
 * - L2/L3 = L1 cell + (level − 1) on the same atlas (interleaved levels)
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

function* walk(objs, path = "") {
  for (const o of objs) {
    const nick = o.Nickname || "";
    const name = o.Name || "";
    yield [path, o];
    for (const c of o.ContainedObjects || []) {
      yield* walk([c], `${path}/${nick || name}`);
    }
  }
}

const ttsPath = resolve(arg("--tts", ""));
const outPath = resolve(
  arg("--out", resolve(root, "apps/web/src/card-art/hero-skill-face-map.json")),
);
const skillsPath = resolve(root, "packages/data/extract/corebox/parsed/hero_skill.json");

if (!ttsPath || ttsPath === resolve("")) {
  console.error("Missing --tts /path/to/workshop-save.json");
  process.exit(1);
}

const data = JSON.parse(readFileSync(ttsPath, "utf8"));
const skills = JSON.parse(readFileSync(skillsPath, "utf8")).cards;

const atlases = new Map();
const l1ByHero = new Map();

for (const [path, o] of walk(data.ObjectStates || [])) {
  const parts = path.split("/");
  if (parts.length < 3 || parts[1] !== "The Darkest Heroes") continue;
  const hero = FORMAL_TTS[parts[2]];
  if (!hero) continue;

  for (const [k, v] of Object.entries(o.CustomDeck || {})) {
    if (v?.FaceURL && v.NumWidth === 10 && v.NumHeight === 7) {
      atlases.set(Number(k), {
        faceUrl: v.FaceURL,
        backUrl: v.BackURL || null,
        numWidth: v.NumWidth,
        numHeight: v.NumHeight,
      });
    }
  }

  if (o.CardID == null) continue;
  const cid = Number(o.CardID);
  const deck = Math.floor(cid / 100);
  const cell = cid % 100;
  const info = (o.CustomDeck || {})[String(deck)];
  if (!info || info.NumWidth !== 10 || info.NumHeight !== 7) continue;
  const list = l1ByHero.get(hero) || [];
  list.push({ deckId: deck, cell, ttsCardId: cid });
  l1ByHero.set(hero, list);
}

const entries = [];
const pending = [];
const atlasesOut = Object.fromEntries(
  [...atlases.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => [String(k), v]),
);

for (const hero of Object.values(FORMAL_TTS)) {
  const l1Cards = skills
    .filter((c) => c.hero === hero && c.level === 1)
    .sort((a, b) => a.pages[0] - b.pages[0]);
  const seen = new Map();
  for (const x of l1ByHero.get(hero) || []) {
    seen.set(`${x.deckId}:${x.cell}`, x);
  }
  const cells = [...seen.values()].sort((a, b) => a.deckId - b.deckId || a.cell - b.cell);
  if (cells.length !== 7) {
    pending.push(`${hero}: expected 7 L1 TTS cells, got ${cells.length}`);
    continue;
  }
  if (l1Cards.length !== 7) {
    pending.push(`${hero}: expected 7 L1 engine skills, got ${l1Cards.length}`);
    continue;
  }
  for (let i = 0; i < 7; i++) {
    const skillL1 = l1Cards[i];
    const { deckId, cell, ttsCardId } = cells[i];
    const atlas = atlases.get(deckId);
    if (!atlas) {
      pending.push(`${hero}: missing atlas ${deckId}`);
      continue;
    }
    const family = skills
      .filter((c) => c.hero === hero && c.name === skillL1.name)
      .sort((a, b) => a.level - b.level);
    for (const card of family) {
      const offset = card.level - 1;
      const mappedCell = cell + offset;
      const maxCell = atlas.numWidth * atlas.numHeight;
      if (mappedCell >= maxCell) {
        pending.push(`${card.id} cell ${mappedCell} out of atlas ${deckId}`);
        continue;
      }
      entries.push({
        id: card.id,
        name: card.name,
        level: card.level,
        hero,
        faceUrl: atlas.faceUrl,
        backUrl: atlas.backUrl,
        numWidth: atlas.numWidth,
        numHeight: atlas.numHeight,
        deckId: String(deckId),
        cell: mappedCell,
        ttsCardId: ttsCardId + offset,
        cellSource: offset === 0 ? "tts_card_object" : "atlas_level_stride",
      });
    }
  }
}

entries.sort((a, b) => a.id.localeCompare(b.id));

const out = {
  schema: "ddbg.tts-hero-skill-face-map.v1",
  source: {
    ttsWorkshopId: "3657612854",
    ttsSaveName: data.SaveName ?? null,
    notes: [
      "FaceURL/BackURL and atlas grid from TTS CustomDeck only (not print PDFs).",
      "L1 cell indices from CardID objects under The Darkest Heroes/{Hero}/Deck.",
      "Skill name order = sorted L1 CardID cells matched to print-page order of I-level skills (visually verified on atlas crops).",
      "L2/L3 cells = L1 cell + (level-1); interleaved levels confirmed on Smite I/II (cells 21/22).",
    ],
  },
  atlases: atlasesOut,
  cards: entries,
  pendingConfirmation: [
    ...pending,
    "Deck 419 (10×4) under hero bags are hero attribute/camp cards (e.g. Zealous Speech on Crusader sheet), not combat skill faces — out of this slice.",
    "1×1 CustomDeck hero portrait cards (467–482 etc.) not mapped in this slice.",
    "Non-formal heroes (Jester, Arbalest, …) not mapped.",
    "Grave Robber Toxin Trickery L2/L3 cells 1–2 on deck 514 inferred by level stride; L1 cell 0 confirmed on TTS Card object.",
  ],
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${entries.length} card faces → ${outPath}`);
if (pending.length) console.warn("Pending:", pending);
