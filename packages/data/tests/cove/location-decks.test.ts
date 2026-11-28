import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curioFileSchema } from "../../src/core/curios/curio";
import { coveCurioFileSchema } from "../../src/core/curios/curio";
import { monsterPoolFileSchema } from "../../src/core/monsters/monster-pool";
import { buildCoveLevelOneLocationDecks } from "../../src/cove/location-decks";
import { coveRoomFileSchema } from "../../src/cove/rooms/room";
import { loadNormalizedCoveLevelOneMonsters } from "../../src/cove/write";

const root = new URL("../../", import.meta.url);
const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(file, root), "utf8")) as unknown;

function sources() {
  const roomFile = coveRoomFileSchema.parse(read("normalized/extension/cove/room.json"));
  const monsters = loadNormalizedCoveLevelOneMonsters();
  return {
    contentPacks: ["core", "cove"] as const,
    coreMonsterPool: monsterPoolFileSchema.parse(read("normalized/corebox/monster_pool.json"))
      .cards,
    coreCurios: curioFileSchema.parse(read("normalized/corebox/curio.json")).cards,
    cove: {
      medium: monsters.monster_medium,
      curios: coveCurioFileSchema.parse(read("normalized/extension/cove/curio.json")).cards,
      rooms: roomFile.cards.filter((card) => !card.boss),
    },
  };
}

describe("Cove I 级地点牌堆目录（数据登记；不接出征）", () => {
  it("31 通用怪物实例 + 17 Cove 当地实体 + 24 奇物 + 9 普通房", () => {
    const input = sources();
    const before = structuredClone(input);
    const decks = buildCoveLevelOneLocationDecks(input);
    expect(decks.location).toBe("cove");
    expect(decks.level).toBe(1);
    expect(decks.monsters.common).toHaveLength(31);
    expect(decks.monsters.local).toHaveLength(17);
    expect(decks.curios).toHaveLength(24);
    expect(decks.curios.filter((card) => card.id.startsWith("curio:cove:"))).toHaveLength(16);
    expect(decks.rooms).toHaveLength(9);
    expect(decks.rooms.every((card) => card.id.startsWith("room:cove:"))).toBe(true);
    expect(decks.rooms.some((card) => card.boss)).toBe(false);
    expect(buildCoveLevelOneLocationDecks(input)).toEqual(decks);
    expect(input).toEqual(before);
  });

  it("未选 Cove 包或核心目录残缺时拒绝", () => {
    expect(() => buildCoveLevelOneLocationDecks({ ...sources(), contentPacks: ["core"] })).toThrow(
      "未启用",
    );
    const broken = sources();
    broken.coreMonsterPool.pop();
    expect(() => buildCoveLevelOneLocationDecks(broken)).toThrow();
    const bossRoom = sources();
    const boss = coveRoomFileSchema
      .parse(read("normalized/extension/cove/room.json"))
      .cards.find((card) => card.boss)!;
    bossRoom.cove.rooms = [
      ...bossRoom.cove.rooms,
      boss as unknown as (typeof bossRoom.cove.rooms)[number],
    ];
    expect(() => buildCoveLevelOneLocationDecks(bossRoom)).toThrow("Boss");
  });
});
