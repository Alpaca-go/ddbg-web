import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { roomTileBattleAreas } from "../../packages/engine/src/index";
import { normalizedHeroStatFileSchema } from "../../packages/data/src/normalize/hero-stat";
import { roomTileGeometryFileSchema } from "../../packages/data/src/normalize/room-tile";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedVirtueAfflictionFileSchema,
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
    resolveId: (id) => (id === "virtual:battle-data" ? "\0virtual:battle-data" : null),
    load(id) {
      if (id !== "\0virtual:battle-data") return null;
      const heroStats = normalizedHeroStatFileSchema
        .parse(read("hero_stat"))
        .cards.filter((card) => card.attributesVerified && card.level === 1);
      const resolveCards = normalizedVirtueAfflictionFileSchema.parse(
        read("virtue_affliction"),
      ).cards;
      if (
        resolveCards.length !== 10 ||
        resolveCards.some((card) => card.verification.unverified || !card.verified_turn_start)
      )
        throw new Error("意志牌堆必须完整且效果已核实（R-048）");
      const skillIds = new Set([
        "hero_skill:p001",
        "hero_skill:p004",
        "hero_skill:p007",
        "hero_skill:p010",
        "hero_skill:p022",
        "hero_skill:p031",
        "hero_skill:p034",
        "hero_skill:p037",
        "hero_skill:p064",
        "hero_skill:p070",
        "hero_skill:p079",
        "hero_skill:p082",
        "hero_skill:p088",
        "hero_skill:p091",
        "hero_skill:p097",
      ]);
      const skills = normalizedHeroSkillFileSchema
        .parse(read("hero_skill"))
        .cards.filter((card) => skillIds.has(card.id) && !card.verification.unverified);
      const monsterIds = new Set([
        "monster_medium:p001",
        "monster_medium:p004",
        "monster_medium:p040",
      ]);
      const monsters = normalizedMonsterMediumFileSchema
        .parse(read("monster_medium"))
        .cards.filter((card) => monsterIds.has(card.id) && !card.verification.unverified)
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
            stanceSlots: 1,
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
        heroStats.length !== 4 ||
        skills.length !== skillIds.size ||
        monsters.length !== monsterIds.size
      )
        throw new Error("战斗沙盒缺少获批卡牌，拒绝替换或补值（R-048）");
      return `export const battleData = ${JSON.stringify({ heroStats, skills, monsters, resolveCards, deployment: tile.deployment, areas: roomTileBattleAreas(tile), tileName: tile.name })};`;
    },
  };
}
