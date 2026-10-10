import { readFileSync } from "node:fs";
import type { Plugin } from "vite";
import { roomTileBattleAreas } from "../../packages/engine/src/index";
import { normalizedHeroStatFileSchema } from "../../packages/data/src/normalize/hero-stat";
import { roomTileGeometryFileSchema } from "../../packages/data/src/normalize/room-tile";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
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
      const skillIds = new Set([
        "hero_skill:p001",
        "hero_skill:p022",
        "hero_skill:p064",
        "hero_skill:p070",
        "hero_skill:p088",
        "hero_skill:p097",
      ]);
      const skills = normalizedHeroSkillFileSchema
        .parse(read("hero_skill"))
        .cards.filter((card) => skillIds.has(card.id) && !card.verification.unverified);
      const monsters = normalizedMonsterMediumFileSchema
        .parse(read("monster_medium"))
        .cards.filter((card) => card.id === "monster_medium:p001" && !card.verification.unverified);
      const tile = roomTileGeometryFileSchema
        .parse(read("room_tile_geometry"))
        .tiles.find(
          (entry) => entry.id === "room_tile:p001" && entry.rawId === "dungeon_tile:p001",
        );
      if (
        !tile ||
        heroStats.length !== 4 ||
        skills.length !== skillIds.size ||
        monsters.length !== 1
      )
        throw new Error("战斗沙盒缺少获批卡牌，拒绝替换或补值（R-048）");
      return `export const battleData = ${JSON.stringify({ heroStats, skills, monsters, areas: roomTileBattleAreas(tile), tileName: tile.name })};`;
    },
  };
}
