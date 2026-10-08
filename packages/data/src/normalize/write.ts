import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { iconDictionarySchema } from "../dictionary/schema";
import {
  heroSkillFileSchema,
  monsterLargeFileSchema,
  monsterMediumFileSchema,
  trinketFileSchema,
} from "../extract/parsed";
import { rawFileSchema } from "../extract/raw";
import { buildNormalizedCorebox } from "./build";
import type { NormalizedCorebox } from "./build";

const DATA_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA_ROOT, relativePath), "utf8")) as unknown;
}

/** 读入库的词典、parsed 和 raw，生成六类规范化数据。 */
export function loadNormalizedCorebox(): NormalizedCorebox {
  return buildNormalizedCorebox({
    dictionary: iconDictionarySchema.parse(readJson("dictionary/icon-dictionary-v1.8.json")),
    heroSkills: heroSkillFileSchema.parse(readJson("extract/corebox/parsed/hero_skill.json")),
    heroSkillRaw: rawFileSchema.parse(readJson("extract/corebox/raw/hero_skill.json")),
    monsterMedium: monsterMediumFileSchema.parse(
      readJson("extract/corebox/parsed/monster_medium.json"),
    ),
    monsterMediumRaw: rawFileSchema.parse(readJson("extract/corebox/raw/monster_medium.json")),
    monsterLarge: monsterLargeFileSchema.parse(
      readJson("extract/corebox/parsed/monster_large.json"),
    ),
    monsterLargeRaw: rawFileSchema.parse(readJson("extract/corebox/raw/monster_large.json")),
    trinkets: trinketFileSchema.parse(readJson("extract/corebox/parsed/trinket.json")),
    trinketRaw: rawFileSchema.parse(readJson("extract/corebox/raw/trinket.json")),
    quirks: rawFileSchema.parse(readJson("extract/corebox/raw/quirk.json")),
    virtues: rawFileSchema.parse(readJson("extract/corebox/raw/virtue_affliction.json")),
  });
}

export function writeNormalizedCorebox(
  outputDir = path.join(DATA_ROOT, "normalized/corebox"),
): NormalizedCorebox {
  const built = loadNormalizedCorebox();
  mkdirSync(outputDir, { recursive: true });
  const files: [string, unknown][] = [
    ["hero_skill.json", built.hero_skill],
    ["monster_medium.json", built.monster_medium],
    ["monster_large.json", built.monster_large],
    ["trinket.json", built.trinket],
    ["quirk.json", built.quirk],
    ["virtue_affliction.json", built.virtue_affliction],
  ];
  for (const [name, file] of files) {
    writeFileSync(path.join(outputDir, name), `${JSON.stringify(file, null, 1)}\n`);
  }
  return built;
}
