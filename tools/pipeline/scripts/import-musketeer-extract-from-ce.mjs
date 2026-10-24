#!/usr/bin/env node
/**
 * Build packages/data/extract/extension/musketeer from CE literals + Musketeer print PDF extract.
 * CE JSON: darkest-dungeon-boardgame docs/data/complete-edition/heroes/c2b
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CE = process.env.DDB_CE_ROOT ?? "/tmp/ddb-ref/docs/data/complete-edition/heroes/c2b";
const OUT = path.join(ROOT, "packages/data/extract/extension/musketeer");

const L1 = [
  [1, "Aimed Shot"],
  [4, "Smokescreen"],
  [7, "Call the Shot"],
  [10, "Buckshot"],
  [13, "Sidearm"],
  [16, "Patch Up"],
  [19, "Skeet Shot"],
];

function readJson(p) {
  return JSON.parse(readFileSync(p, "utf8"));
}

function heroFromSkills(file) {
  const data = readJson(path.join(CE, file));
  const byPage = new Map();
  for (const form of data.forms) {
    const nf = form.frontLiteral?.numericFields ?? {};
    const ref =
      nf.crit?.sourceRefs?.[0]?.page ??
      nf.acc?.sourceRefs?.[0]?.page ??
      nf.dmg?.sourceRefs?.[0]?.page;
    if (ref) byPage.set(ref, form.printedName);
  }
  return byPage;
}

function assertProfiles() {
  const prof = readJson(path.join(CE, "musketeer-profiles.json"));
  const expect = [
    [1, "front", 14, 0, 1],
    [2, "back", 19, 1, 1],
    [3, "front", 24, 2, 2],
  ];
  for (const [level, side, life, dodge, speed] of expect) {
    const profile = prof.profiles.find((p) => p.level === level);
    if (!profile) throw new Error(`CE 缺少 musketeer level ${level}`);
    const form = profile.forms.find(
      (f) => f.side === side || (side === "front" && f.form === "HERO_PROFILE"),
    );
    const fields = form?.literalFields;
    if (!fields) throw new Error(`CE 缺少 literalFields L${level} ${side}`);
    if (fields.life.literal !== life || fields.dodge.literal !== dodge) {
      throw new Error(
        `CE STAT 与 R-107 不一致 L${level}: life=${fields.life.literal} dodge=${fields.dodge.literal}`,
      );
    }
    const move = fields.movement?.literal?.count ?? 0;
    if (move !== speed) {
      throw new Error(`CE movement 与 R-107 Speed L${level}: move=${move} expected=${speed}`);
    }
  }
}

function assertParsedSkills() {
  const parsed = readJson(path.join(OUT, "parsed/hero_skill.json"));
  const byPage = heroFromSkills("musketeer-skills.json");
  for (const [page, name] of L1) {
    const card = parsed.cards.find(
      (c) => c.id === `hero_skill:musketeer:p${String(page).padStart(3, "0")}`,
    );
    if (!card || card.name !== name || card.hero !== "MUSKETEER" || card.level !== 1) {
      throw new Error(`parsed L1 漂移 p${page}: ${card?.name} / ${card?.hero}`);
    }
    if (byPage.get(page) !== name) throw new Error(`CE vs parsed p${page}`);
  }
  if (parsed.stats.failed !== 0) throw new Error(`parsed 失败 ${parsed.stats.failed}`);
}

const extractScript = path.join(
  ROOT,
  "tools/pipeline/extract-print/scripts/extract_musketeer_extension.py",
);
console.log("Running Musketeer print extract…");
execFileSync("python3", [extractScript], { stdio: "inherit", cwd: ROOT });

assertProfiles();
assertParsedSkills();
console.log(`Musketeer extract OK → ${OUT}`);
