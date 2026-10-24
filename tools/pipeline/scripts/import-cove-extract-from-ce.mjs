#!/usr/bin/env node
/**
 * Build packages/data/extract/extension/cove from CE literals + TDH print PDF extract.
 * CE JSON: /tmp/ddb-ref/docs/data/complete-edition/heroes/c2b/*-skills.json & *-profiles.json
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CE = process.env.DDB_CE_ROOT ?? "/tmp/ddb-ref/docs/data/complete-edition/heroes/c2b";
const OUT = path.join(ROOT, "packages/data/extract/extension/cove");

const MAA_L1 = [
  [232, "Crush"],
  [235, "Rampart"],
  [238, "Bellow"],
  [241, "Defender"],
  [244, "Retribution"],
  [247, "Command"],
  [250, "Bolster"],
];
const FLAG_L1 = [
  [253, "Punish"],
  [256, "Rain of Sorrows"],
  [259, "Exsanguinate"],
  [262, "Reclaim"],
  [265, "Redeem"],
  [268, "Endure"],
  [271, "Suffer"],
];

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function heroFromSkills(file, heroId) {
  const data = readJson(path.join(CE, file));
  const byPage = new Map();
  for (const form of data.forms) {
    const page = form.frontLiteral?.numericFields?.crit?.sourceRefs?.[0]?.page;
    if (page) byPage.set(page, form.printedName);
  }
  return { heroId, byPage };
}

function assertProfiles() {
  const maa = readJson(path.join(CE, "man-at-arms-profiles.json"));
  const flag = readJson(path.join(CE, "flagellant-profiles.json"));
  const expect = [
    ["flagellant", 1, 12, 2, 0],
    ["flagellant", 2, 16, 3, 0],
    ["flagellant", 3, 22, 3, 0],
    ["man-at-arms", 1, 16, 1, 1],
    ["man-at-arms", 2, 22, 2, 1],
    ["man-at-arms", 3, 28, 3, 1],
  ];
  for (const [heroId, level, life, dodge, speed] of expect) {
    const file = heroId === "flagellant" ? flag : maa;
    const profile = file.profiles.find((p) => p.level === level);
    if (!profile) throw new Error(`CE 缺少 ${heroId} level ${level}`);
    const front = profile.forms.find((f) => f.side === "front" || f.form === "HERO_PROFILE");
    const fields = front?.literalFields ?? profile.forms[0]?.literalFields;
    if (!fields) throw new Error(`CE 缺少 literalFields：${heroId} L${level}`);
    if (fields.life.literal !== life || fields.dodge.literal !== dodge) {
      throw new Error(
        `CE STAT 与 R-105 不一致 ${heroId} L${level}: life=${fields.life.literal} dodge=${fields.dodge.literal}`,
      );
    }
    const ceSpeed = fields.speed.literal;
    if (speed === 0 && ceSpeed !== null && ceSpeed !== 0) {
      throw new Error(`CE speed 非 null/0：${heroId} L${level}`);
    }
  }
}

function assertParsedSkills() {
  const parsed = readJson(path.join(OUT, "parsed/hero_skill.json"));
  const maa = heroFromSkills("man-at-arms-skills.json", "man-at-arms");
  const flag = heroFromSkills("flagellant-skills.json", "flagellant");
  for (const [page, name] of MAA_L1) {
    const card = parsed.cards.find((c) => c.id === `hero_skill:p${String(page).padStart(3, "0")}`);
    if (!card || card.name !== name || card.hero !== "MAN-AT-ARMS" || card.level !== 1) {
      throw new Error(`parsed MAA L1 漂移 p${page}: ${card?.name} / ${card?.hero}`);
    }
    if (maa.byPage.get(page) !== name) throw new Error(`CE vs parsed MAA p${page}`);
  }
  for (const [page, name] of FLAG_L1) {
    const card = parsed.cards.find((c) => c.id === `hero_skill:p${String(page).padStart(3, "0")}`);
    if (!card || card.name !== name || card.hero !== "FLAGELLANT" || card.level !== 1) {
      throw new Error(`parsed Flagellant L1 漂移 p${page}: ${card?.name} / ${card?.hero}`);
    }
    if (flag.byPage.get(page) !== name) throw new Error(`CE vs parsed Flagellant p${page}`);
  }
  if (parsed.stats.failed !== 0) throw new Error(`parsed 失败 ${parsed.stats.failed}`);
}

const extractScript = path.join(
  ROOT,
  "tools/pipeline/extract-print/scripts/extract_cove_extension.py",
);
console.log("Running Cove print extract…");
execFileSync("python3", [extractScript], { stdio: "inherit", cwd: ROOT });

assertProfiles();
assertParsedSkills();
console.log(`Cove extract OK → ${OUT}`);
