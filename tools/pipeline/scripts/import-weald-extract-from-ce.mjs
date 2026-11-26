#!/usr/bin/env node
/**
 * Build packages/data/extract/extension/weald from CE literals + TDH print PDF extract.
 * CE JSON: darkest-dungeon-boardgame docs/data/complete-edition/heroes/c2b
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CE = process.env.DDB_CE_ROOT ?? "/tmp/ddb-ref/docs/data/complete-edition/heroes/c2b";
const OUT = path.join(ROOT, "packages/data/extract/extension/weald");

const SB_L1 = [
  [316, "Pierce"],
  [319, "Puncture"],
  [322, "Adder\u2019s Kiss"],
  [325, "Impale"],
  [328, "Expose"],
  [331, "Captivate"],
  [334, "Serpent Sway"],
];
const HM_L1 = [
  [337, "Hound\u2019s Rush"],
  [340, "Hound\u2019s Harry"],
  [343, "Target Whistle"],
  [346, "Cry Havoc"],
  [349, "Guard Dog"],
  [352, "Lick Wounds"],
  [355, "Blackjack"],
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
  const hm = readJson(path.join(CE, "hound-master-profiles.json"));
  const sb = readJson(path.join(CE, "shieldbreaker-profiles.json"));
  const expect = [
    ["hound-master", 1, 11, 1, 2],
    ["hound-master", 2, 15, 2, 2],
    ["hound-master", 3, 19, 3, 2],
    ["shieldbreaker", 1, 11, 1, 2],
    ["shieldbreaker", 2, 15, 2, 2],
    ["shieldbreaker", 3, 19, 3, 3],
  ];
  for (const [heroId, level, life, dodge, speed] of expect) {
    const file = heroId === "shieldbreaker" ? sb : hm;
    const profile = file.profiles.find((p) => p.level === level);
    if (!profile) throw new Error(`CE 缺少 ${heroId} level ${level}`);
    const front = profile.forms.find((f) => f.side === "front" || f.form === "HERO_PROFILE");
    const fields = front?.literalFields ?? profile.forms[0]?.literalFields;
    if (!fields) throw new Error(`CE 缺少 literalFields：${heroId} L${level}`);
    if (fields.life.literal !== life || fields.dodge.literal !== dodge) {
      throw new Error(
        `CE STAT 与 R-106 不一致 ${heroId} L${level}: life=${fields.life.literal} dodge=${fields.dodge.literal}`,
      );
    }
    const move = fields.movement?.literal?.count ?? 0;
    if (heroId === "shieldbreaker" && level < 3 && move === 3 && speed === 2) {
      // CE movement.literal=3 与印刷移动栏两枚靴不一致；R-106 以 extract 图标数核实 Speed 2。
      continue;
    }
    if (move !== speed) {
      throw new Error(
        `CE movement 与 R-106 Speed ${heroId} L${level}: move=${move} expected=${speed}`,
      );
    }
  }
}

function assertParsedSkills() {
  const parsed = readJson(path.join(OUT, "parsed/hero_skill.json"));
  const hm = heroFromSkills("hound-master-skills.json", "hound-master");
  const sb = heroFromSkills("shieldbreaker-skills.json", "shieldbreaker");
  for (const [page, name] of SB_L1) {
    const card = parsed.cards.find((c) => c.id === `hero_skill:p${String(page).padStart(3, "0")}`);
    if (!card || card.name !== name || card.hero !== "SHIELDBREAKER" || card.level !== 1) {
      throw new Error(`parsed SB L1 漂移 p${page}: ${card?.name} / ${card?.hero}`);
    }
    if (sb.byPage.get(page) !== name) throw new Error(`CE vs parsed SB p${page}`);
  }
  for (const [page, name] of HM_L1) {
    const card = parsed.cards.find((c) => c.id === `hero_skill:p${String(page).padStart(3, "0")}`);
    if (!card || card.name !== name || card.hero !== "HOUNDMASTER" || card.level !== 1) {
      throw new Error(`parsed HM L1 漂移 p${page}: ${card?.name} / ${card?.hero}`);
    }
    if (hm.byPage.get(page) !== name) throw new Error(`CE vs parsed HM p${page}`);
  }
  if (parsed.stats.failed !== 0) throw new Error(`parsed 失败 ${parsed.stats.failed}`);
}

const extractScript = path.join(
  ROOT,
  "tools/pipeline/extract-print/scripts/extract_weald_extension.py",
);
console.log("Running Weald print extract…");
execFileSync("python3", [extractScript], { stdio: "inherit", cwd: ROOT });

assertProfiles();
assertParsedSkills();
console.log(`Weald extract OK → ${OUT}`);
