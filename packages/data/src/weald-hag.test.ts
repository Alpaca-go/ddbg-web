import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import content from "../normalized/extension/weald/hag_i.json";
import ordinaryTiles from "../normalized/extension/weald/room_tile_geometry.json";
import { rawFileSchema } from "./extract/raw";
import { wealdHagContentSchema, wealdHagTileSchema } from "./weald-hag";
import { wealdRoomTileGeometryFileSchema } from "./weald-room";
import { loadNormalizedWealdLevelOneMonsters } from "./normalize/write-weald";

const approved = wealdHagContentSchema.parse(content);
const readRaw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(new URL(`../extract/extension/weald/raw/${name}.json`, import.meta.url), "utf8"),
    ),
  );

describe("R-254 Hag I 独立印刷目录", () => {
  it("rawId＋face 对应真实印刷页；锅两面只有一份实体", () => {
    const raw = readRaw("monster_large");
    for (const face of approved.faces) {
      const card = raw.cards.find((c) => c.id === face.rawId)!;
      const source = card.faces[face.face]!;
      expect(card.copies).toBe(1);
      expect(source.page).toBe(face.role === "hag" ? 10 : 13);
      expect(source.file).toBe(
        approved.sources[face.face === "front" ? "combatFront" : "combatBack"],
      );
    }
    expect(new Set(approved.faces.map((f) => f.rawId)).size).toBe(2);
    const abilities = readRaw("boss_ability");
    for (const id of [
      approved.abilities.descriptionCardId,
      approved.abilities.hagCardId,
      approved.abilities.cauldronCardId,
    ]) {
      const card = abilities.cards.find((c) => c.id === id)!;
      expect(card.faces.front.file).toBe(approved.sources.abilityFront);
      expect(card.faces.back?.file).toBe(approved.sources.abilityBack);
      expect(card.faces.front.page).toBe(Number(id.slice(-3)));
    }
    const tile = readRaw("dungeon_tile").cards.find((c) => c.id === approved.tile.rawId)!;
    expect(tile.faces.back?.file).toBe(approved.tile.source.file);
    expect(tile.faces.back?.page).toBe(5);
    expect(readRaw("room").cards.find((c) => c.id === approved.tile.roomId)?.faces.front.page).toBe(
      10,
    );
  });

  it("核准数值、满锅翻面防护和未印刷伤害不被旧占位覆盖", () => {
    expect(
      approved.faces.map((f) => [f.role, f.life, f.speed, f.dodge, f.innateProtection]),
    ).toEqual([
      ["hag", 60, 2, 1, false],
      ["empty", 66, 0, 0, true],
      ["full", 9, 0, 0, false],
    ]);
    const [hag, empty, full] = approved.faces;
    expect(hag!.skills[0]).toMatchObject({
      accuracy: 10,
      damage: null,
      crit: null,
      critDamage: null,
    });
    expect(hag!.skills.slice(1).map((s) => [s.crit, s.critDamage, s.accuracy, s.damage])).toEqual([
      [1, 5, 9, 3],
      [0, 2, 10, 1],
    ]);
    expect(empty!.skills).toEqual([]);
    expect(full!.skills[0]).toMatchObject({
      name: "Boil",
      range: 0,
      accuracy: 12,
      damage: 5,
      crit: 1,
      critDamage: 9,
    });
    expect(approved.setup).toMatchObject({
      monsterInitiativeCards: 3,
      heroInitiativeCards: 4,
      cauldronStance: "ranged",
    });
  });

  it("Hag 普通选招完整覆盖 d10，Into the Pot 由专属能力触发", () => {
    const hag = approved.faces[0]!;
    expect(
      Array.from({ length: 10 }, (_, n) =>
        hag.allStancesSelection.filter((r) => r.min <= n + 1 && r.max >= n + 1).map((r) => r.slot),
      ),
    ).toEqual(Array.from({ length: 10 }, (_, n) => [n < 6 ? 2 : 3]));
    const bad = structuredClone(content);
    bad.faces[2]!.face = "front";
    expect(wealdHagContentSchema.safeParse(bad).success).toBe(false);
  });

  it("10 号几何保留 17 对通路与三对角点，容量合计 37", () => {
    const tile = approved.tile;
    expect(tile.areas.reduce((sum, a) => sum + a.capacity, 0)).toBe(37);
    expect(
      tile.edges.filter((e) => !e.blocked && !e.cornerOnly).map((e) => `${e.from}-${e.to}`),
    ).toEqual([
      "A-B",
      "A-D",
      "B-C",
      "B-D",
      "B-E",
      "C-F",
      "D-E",
      "D-G",
      "E-F",
      "E-H",
      "E-J",
      "F-H",
      "G-I",
      "G-J",
      "H-K",
      "I-J",
      "J-K",
    ]);
    expect(tile.edges.filter((e) => e.cornerOnly).map((e) => `${e.from}-${e.to}`)).toEqual([
      "B-F",
      "E-K",
      "H-J",
    ]);
    expect(tile.deployment.monsters).toEqual({
      aggressive: "B",
      defensive: "B",
      ranged: "F",
      support: "F",
    });
    expect(tile.deployment.heroes).toEqual({
      aggressive: "A",
      defensive: "I",
      ranged: "J",
      support: "J",
    });
    const bad = structuredClone(tile);
    bad.edges.push({ from: "B", to: "A", cornerOnly: false, blocked: false });
    expect(wealdHagTileSchema.safeParse(bad).success).toBe(false);
    const high = { ...tile, areas: tile.areas.map((a) => ({ ...a, elevation: "high" })) };
    expect(wealdHagTileSchema.safeParse(high).success).toBe(false);
    expect(
      wealdHagTileSchema.safeParse({
        ...tile,
        deployment: {
          ...tile.deployment,
          monsters: { ...tile.deployment.monsters, ranged: "missing" },
        },
      }).success,
    ).toBe(false);
  });

  it("Boss 卡与板块未混入普通目录，也未提前授予战斗资格", () => {
    const pool = loadNormalizedWealdLevelOneMonsters();
    const ids = [...pool.monster_medium.cards, ...pool.monster_large.cards].map((c) => c.id);
    for (const face of approved.faces) expect(ids).not.toContain(face.rawId);
    expect(wealdRoomTileGeometryFileSchema.parse(ordinaryTiles).tiles).toHaveLength(9);
    expect(
      wealdRoomTileGeometryFileSchema.safeParse({
        ...ordinaryTiles,
        tiles: [...ordinaryTiles.tiles, approved.tile],
      }).success,
    ).toBe(false);
    expect(wealdHagContentSchema.safeParse({ ...content, combatReady: true }).success).toBe(false);
    expect(wealdHagTileSchema.safeParse({ ...approved.tile, usable: true }).success).toBe(false);
  });
});
