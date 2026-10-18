import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import {
  createConditionPool,
  roomTileBattleAreas,
  FORMAL_HERO_NAMES,
} from "../../packages/engine/src/index";
import { diseaseFileSchema } from "../../packages/data/src/disease";
import { normalizedHeroStatFileSchema } from "../../packages/data/src/normalize/hero-stat";
import { roomTileGeometryFileSchema } from "../../packages/data/src/normalize/room-tile";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedMonsterLargeFileSchema,
  normalizedVirtueAfflictionFileSchema,
  normalizedQuirkFileSchema,
} from "../../packages/data/src/normalize/schema";

/** 构建时校验并只打包沙盒所需卡牌；不复制数据、不打包整盒或美术。 */
export function battleDataPlugin(): Plugin {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        new URL(`../../packages/data/normalized/corebox/${name}.json`, import.meta.url),
        "utf8",
      ),
    );
  return {
    name: "battle-sandbox-data",
    resolveId: (id) =>
      [
        "virtual:battle-data",
        "virtual:quest-battle-data",
        "virtual:quest-battle-data-v1",
        "virtual:quest-battle-data-v2",
      ].includes(id)
        ? `\0${id}`
        : null,
    load(id) {
      if (
        ![
          "\0virtual:battle-data",
          "\0virtual:quest-battle-data",
          "\0virtual:quest-battle-data-v1",
          "\0virtual:quest-battle-data-v2",
        ].includes(id)
      )
        return null;
      const questCatalog = id !== "\0virtual:battle-data";
      const currentQuest = id === "\0virtual:quest-battle-data";
      const sixHeroQuest = id === "\0virtual:quest-battle-data-v2";
      const plagueDoctor = currentQuest || sixHeroQuest;
      const graveOccultist = currentQuest;
      const catalogNames = graveOccultist
        ? FORMAL_HERO_NAMES
        : plagueDoctor
          ? FORMAL_HERO_NAMES.filter((n) => n !== "GRAVE ROBBER" && n !== "OCCULTIST")
          : questCatalog
            ? FORMAL_HERO_NAMES.filter(
                (n) =>
                  n !== "PLAGUE DOCTOR" && n !== "GRAVE ROBBER" && n !== "OCCULTIST",
              )
            : FORMAL_HERO_NAMES.filter((n) =>
                ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(n),
              );
      const heroStats = normalizedHeroStatFileSchema
        .parse(read("hero_stat"))
        // R-081/088/094/095：战役使用获批属性；普通战斗沙盒保留原四英雄。
        .cards.filter(
          (card) =>
            card.attributesVerified &&
            (questCatalog || card.level === 1) &&
            (catalogNames as readonly string[]).includes(card.name),
        );
      const conditions = createConditionPool(
        diseaseFileSchema.parse(read("disease")).cards,
        normalizedQuirkFileSchema.parse(read("quirk")).cards,
      );
      const resolveCards = normalizedVirtueAfflictionFileSchema.parse(
        read("virtue_affliction"),
      ).cards;
      if (
        resolveCards.length !== 10 ||
        resolveCards.some((card) => card.verification.unverified || !card.verified_turn_start)
      )
        throw new Error("意志牌堆必须完整且效果已核实（R-048）");
      // 已逐页核实的四核心 I/II/III：印刷 p001–042、p064–105，共 84 张。
      const skillIds = new Set(
        [1, 64].flatMap((start) =>
          Array.from({ length: 42 }, (_, i) => `hero_skill:p${String(start + i).padStart(3, "0")}`),
        ),
      );
      // 赏金猎人仅七张I级技能已接通，不随属性批准开放II/III级技能。
      if (questCatalog)
        for (let page = 43; page <= 61; page += 3)
          skillIds.add(`hero_skill:p${String(page).padStart(3, "0")}`);
      // R-094及后续七技能/村庄能力已接通；仍只开放I级技能。
      if (plagueDoctor)
        for (let page = 127; page <= 145; page += 3)
          skillIds.add(`hero_skill:p${String(page).padStart(3, "0")}`);
      // R-095：目录仅需七张I级转录通过的技能；效果/Pilfer/Dark Ritual仍未接线。
      if (graveOccultist) {
        for (let page = 169; page <= 187; page += 3)
          skillIds.add(`hero_skill:p${String(page).padStart(3, "0")}`);
        for (let page = 190; page <= 208; page += 3)
          skillIds.add(`hero_skill:p${String(page).padStart(3, "0")}`);
      }
      const skills = normalizedHeroSkillFileSchema
        .parse(read("hero_skill"))
        .cards.filter((card) => skillIds.has(card.id) && !card.verification.unverified);
      const monsterIds = new Set([
        "monster_large:p003",
        "monster_medium:p053",
        "monster_large:p001",
        "monster_medium:p050",
        "monster_medium:p013",
        "monster_medium:p001",
        "monster_medium:p004",
        "monster_medium:p040",
        "monster_medium:p007",
        "monster_medium:p010",
        "monster_medium:p021",
        "monster_medium:p027",
        "monster_medium:p031",
        "monster_medium:p043",
        "monster_medium:p046",
        "monster_large:p002",
        "monster_medium:p018",
        "monster_medium:p024",
        "monster_medium:p034",
        "monster_medium:p037",
      ]);
      const monsters = [
        ...normalizedMonsterMediumFileSchema.parse(read("monster_medium")).cards,
        ...normalizedMonsterLargeFileSchema.parse(read("monster_large")).cards,
      ]
        .filter((card) => monsterIds.has(card.id) && !card.verification.unverified)
        .map((card) => {
          const edges = card.type_position_tags.filter((tag) => tag === "Front" || tag === "Back");
          if (edges.length !== 1) throw new Error("怪物缺少唯一印刷 Front / Back（R-048）");
          if (!("skills" in card) || card.speed === undefined || !card.stanceGroups)
            throw new Error("怪物缺少已核实选招 / Speed（R-048）");
          const dodge = card.header_unlabeled_numbers.filter(
            (n) =>
              n.anchor.type === "beside_icon" &&
              n.anchor.inside_icon?.key === "dodge" &&
              ["confirmed", "confirmed_rulebook"].includes(n.anchor.inside_icon.naming),
          );
          if (
            dodge.length !== 1 ||
            !Number.isSafeInteger(dodge[0]!.numeric) ||
            dodge[0]!.numeric! < 0
          )
            throw new Error("怪物缺少唯一已命名 Dodge 整数，不补默认值（R-048）");
          return {
            ...card,
            dodge: dodge[0]!.numeric,
            spawnEdge: edges[0] === "Front" ? "front" : "back",
            stanceSlots: card.type_position_tags.includes("Large") ? 2 : 1,
          };
        });
      const tile = roomTileGeometryFileSchema
        .parse(read("room_tile_geometry"))
        .tiles.find(
          (entry) => entry.id === "room_tile:p001" && entry.rawId === "dungeon_tile:p001",
        );
      if (
        !tile ||
        !tile.usable ||
        tile.deployment?.printReview !== "verified" ||
        heroStats.length !== (graveOccultist ? 24 : plagueDoctor ? 18 : questCatalog ? 15 : 4) ||
        skills.length !== skillIds.size ||
        monsters.length !== monsterIds.size
      )
        throw new Error("战斗沙盒缺少获批卡牌，拒绝替换或补值（R-048）");
      return `export const battleData = ${JSON.stringify({ conditions, heroStats, skills, monsters, resolveCards, deployment: tile.deployment, areas: roomTileBattleAreas(tile), tileName: tile.name })};`;
    },
  };
}
