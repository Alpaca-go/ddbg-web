import { describe, expect, it } from "vitest";
import {
  applyWealdBattleSetup,
  readDungeonExpeditionRegion,
  wealdBattleCreationEnabled,
} from "./dungeon-battle-setup";
import { NECROTIC_FUNGUS_MONSTER_CARD_ID } from "./necrotic-fungus";
import { WEALD_APPROVED_ROOM_TILES } from "./room-catalog";
import type { BattleSetup } from "../../battle";

const tileOne = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 1)!;
const tileThree = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 3)!;

const minimalSetup = (): BattleSetup => ({
  light: 5,
  skills: [],
  entities: [
    {
      id: "m0",
      side: "monster",
      hero: null,
      areaId: "E",
      stance: "aggressive",
      stanceSlots: 1,
      monsterCardId: "fixture",
      life: 5,
      wounds: 0,
      dodge: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    },
  ],
  monsters: [
    {
      id: "fixture",
      life: 5,
      verification: { unverified: false },
      skills: [],
      stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
    },
  ],
  areas: [],
});

describe("readDungeonExpeditionRegion", () => {
  it("遗迹任务缺省为 ruins", () => {
    expect(
      readDungeonExpeditionRegion({ questDistribution: { questId: "quest:p001" } as never }),
    ).toBe("ruins");
  });

  it("怪物池 location=weald 时在无 Weald 任务时可识别地点", () => {
    expect(
      readDungeonExpeditionRegion({
        questDistribution: { questId: "quest:p001" } as never,
        monsterPool: { location: "weald" } as never,
      }),
    ).toBe("weald");
  });
});

describe("wealdBattleCreationEnabled", () => {
  const dungeon = {
    contentPacks: ["core", "weald"] as const,
    monsterPool: { location: "weald" as const },
    questDistribution: { questId: "quest:p001" },
  } as unknown as Pick<
    import("../../dungeon").DungeonState,
    "contentPacks" | "monsterPool" | "questDistribution"
  >;

  it("选包且 Weald 地点时开启", () => {
    expect(wealdBattleCreationEnabled(dungeon, tileThree)).toBe(true);
  });

  it("未选 Weald 包时不开启", () => {
    expect(wealdBattleCreationEnabled({ ...dungeon, contentPacks: ["core"] }, tileThree)).toBe(
      false,
    );
  });

  it("遗迹出征时不开启", () => {
    expect(
      wealdBattleCreationEnabled(
        {
          contentPacks: ["core", "weald"],
          questDistribution: { questId: "quest:p001" },
        } as unknown as Pick<
          import("../../dungeon").DungeonState,
          "contentPacks" | "monsterPool" | "questDistribution"
        >,
        tileThree,
      ),
    ).toBe(false);
  });
});

describe("applyWealdBattleSetup", () => {
  it("核准真菌区放置实体并打开 wealdMechanics", () => {
    const result = applyWealdBattleSetup(minimalSetup(), tileThree, true);
    expect(result.wealdMechanics).toBe(true);
    expect(
      result.entities
        .filter((e) => e.necroticFungus)
        .map((e) => e.areaId)
        .sort(),
    ).toEqual(["B", "G"]);
    expect(result.monsters?.some((m) => m.id === NECROTIC_FUNGUS_MONSTER_CARD_ID)).toBe(true);
    expect(result.areas.find((a) => a.id === "B")?.zeroCapacity).toBeUndefined();
  });

  it("无真菌标记的板块不放置", () => {
    const result = applyWealdBattleSetup(minimalSetup(), tileOne, true);
    expect(result.entities.every((e) => !e.necroticFungus)).toBe(true);
    expect(result.monsters?.some((m) => m.id === NECROTIC_FUNGUS_MONSTER_CARD_ID)).toBe(false);
  });

  it("未启用机制时不投影零容量、不放真菌", () => {
    const tileFive = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 5)!;
    const result = applyWealdBattleSetup(minimalSetup(), tileFive, false);
    expect(result.wealdMechanics).toBeUndefined();
    expect(result.entities.every((e) => !e.necroticFungus)).toBe(true);
    expect(result.areas.find((a) => a.id === "B")?.zeroCapacity).toBeUndefined();
    expect(result.areas.find((a) => a.id === "I")?.zeroCapacity).toBeUndefined();
  });

  it("启用机制时零容量区投影 W-03", () => {
    const tileFive = WEALD_APPROVED_ROOM_TILES.find((t) => t.number === 5)!;
    const result = applyWealdBattleSetup(minimalSetup(), tileFive, true);
    expect(result.areas.find((a) => a.id === "I")?.zeroCapacity).toBe(true);
  });
});
