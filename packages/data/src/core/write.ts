import path from "node:path";
import { DATA_ROOT, readDataJson, writeDataFiles } from "../shared/write-files";

import { heroSourcePaths } from "./heroes/hero-sources";
import { iconDictionarySchema } from "../shared/dictionary/schema";
import {
  heroSkillFileSchema,
  monsterLargeFileSchema,
  monsterMediumFileSchema,
  trinketFileSchema,
} from "../shared/extract/parsed";
import { rawFileSchema } from "../shared/extract/raw";
import { buildNormalizedCorebox } from "./corebox.build";
import type { NormalizedCorebox } from "./corebox.build";

/** 读词典、parsed 和 raw，生成卡牌与独立的获批板块几何。 */
export function loadNormalizedCorebox(): NormalizedCorebox {
  return buildNormalizedCorebox({
    questsRaw: rawFileSchema.parse(readDataJson("extract/corebox/raw/quest.json")),
    bossAbilitiesRaw: rawFileSchema.parse(readDataJson("extract/corebox/raw/boss_ability.json")),
    hamletEvents: rawFileSchema.parse(readDataJson("extract/corebox/raw/hamlet_event.json")),
    diseases: rawFileSchema.parse(readDataJson("extract/corebox/raw/disease.json")),
    rooms: rawFileSchema.parse(readDataJson("extract/corebox/raw/room.json")),
    stygianRooms: rawFileSchema.parse(readDataJson("extract/corebox/raw/stygian_room.json")),
    curios: rawFileSchema.parse(readDataJson("extract/corebox/raw/curio.json")),
    heroStats: rawFileSchema.parse(readDataJson(heroSourcePaths("core").stat)),
    roomTiles: rawFileSchema.parse(readDataJson("extract/corebox/raw/dungeon_tile.json")),
    dictionary: iconDictionarySchema.parse(readDataJson("dictionary/icon-dictionary-v1.8.json")),
    heroSkills: heroSkillFileSchema.parse(readDataJson(heroSourcePaths("core").skillParsed)),
    heroSkillRaw: rawFileSchema.parse(readDataJson(heroSourcePaths("core").skillRaw)),
    monsterMedium: monsterMediumFileSchema.parse(
      readDataJson("extract/corebox/parsed/monster_medium.json"),
    ),
    monsterMediumRaw: rawFileSchema.parse(readDataJson("extract/corebox/raw/monster_medium.json")),
    monsterLarge: monsterLargeFileSchema.parse(
      readDataJson("extract/corebox/parsed/monster_large.json"),
    ),
    monsterLargeRaw: rawFileSchema.parse(readDataJson("extract/corebox/raw/monster_large.json")),
    trinkets: trinketFileSchema.parse(readDataJson("extract/corebox/parsed/trinket.json")),
    trinketRaw: rawFileSchema.parse(readDataJson("extract/corebox/raw/trinket.json")),
    quirks: rawFileSchema.parse(readDataJson("extract/corebox/raw/quirk.json")),
    virtues: rawFileSchema.parse(readDataJson("extract/corebox/raw/virtue_affliction.json")),
    extensionWarrensHeroSkills: heroSkillFileSchema.parse(
      readDataJson(heroSourcePaths("warrens").skillParsed),
    ),
    extensionWarrensHeroSkillRaw: rawFileSchema.parse(
      readDataJson(heroSourcePaths("warrens").skillRaw),
    ),
    extensionWarrensHeroStatRaw: rawFileSchema.parse(readDataJson(heroSourcePaths("warrens").stat)),
    extensionCoveHeroSkills: heroSkillFileSchema.parse(
      readDataJson(heroSourcePaths("cove").skillParsed),
    ),
    extensionCoveHeroSkillRaw: rawFileSchema.parse(readDataJson(heroSourcePaths("cove").skillRaw)),
    extensionCoveHeroStatRaw: rawFileSchema.parse(readDataJson(heroSourcePaths("cove").stat)),
    extensionWealdHeroSkills: heroSkillFileSchema.parse(
      readDataJson(heroSourcePaths("weald").skillParsed),
    ),
    extensionWealdHeroSkillRaw: rawFileSchema.parse(
      readDataJson(heroSourcePaths("weald").skillRaw),
    ),
    extensionWealdHeroStatRaw: rawFileSchema.parse(readDataJson(heroSourcePaths("weald").stat)),
    extensionMusketeerHeroSkills: heroSkillFileSchema.parse(
      readDataJson(heroSourcePaths("musketeer").skillParsed),
    ),
    extensionMusketeerHeroSkillRaw: rawFileSchema.parse(
      readDataJson(heroSourcePaths("musketeer").skillRaw),
    ),
    extensionMusketeerHeroStatRaw: rawFileSchema.parse(
      readDataJson(heroSourcePaths("musketeer").stat),
    ),
  });
}

export function writeNormalizedCorebox(
  outputDir = path.join(DATA_ROOT, "normalized/corebox"),
): NormalizedCorebox {
  const built = loadNormalizedCorebox();
  writeDataFiles(outputDir, {
    "hamlet_event.json": built.hamlet_event,
    "disease.json": built.disease,
    "monster_pool.json": built.monster_pool,
    "darkest_monster_pool.json": built.darkest_monster_pool,
    "darkest_boss_content.json": built.darkest_boss_content,
    "absolute_nothingness_support.json": built.absolute_nothingness_support,
    "darkest_boss_abilities.json": built.darkest_boss_abilities,
    "ruins_boss_abilities.json": built.ruins_boss_abilities,
    "quest_cards.json": built.quest_cards,
    "stygian_rooms.json": built.stygian_rooms,
    "room.json": built.room,
    "curio.json": built.curio,
    "hero_stat.json": built.hero_stat,
    "room_tile_geometry.json": built.room_tile_geometry,
    "hero_skill.json": built.hero_skill,
    "monster_medium.json": built.monster_medium,
    "monster_large.json": built.monster_large,
    "trinket.json": built.trinket,
    "quirk.json": built.quirk,
    "virtue_affliction.json": built.virtue_affliction,
  });
  return built;
}
