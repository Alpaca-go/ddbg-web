import { describe, expect, it } from "vitest";
import type { BattleState } from "./battle";
import {
  destroyedNecroticFungusCount,
  fungalResearchProgressFromBattle,
  fungalResearchXpFromBroughtBack,
} from "./expansions/weald/fungal-research-quest";

const fungusEntity = (id: string, dead: boolean, wounds = 0) => ({
  id,
  side: "monster" as const,
  hero: null,
  areaId: "A",
  stance: "aggressive" as const,
  stanceSlots: 1 as const,
  wounds,
  dodge: 0,
  skillIds: [],
  guard: false,
  dead,
  bleed: [],
  blight: [],
  necroticFungus: true as const,
  monsterCardId: "weald:necrotic-fungus",
  life: 1,
});

const battleStub = (entities: ReturnType<typeof fungusEntity>[]): BattleState =>
  ({
    entities,
    wealdMechanics: true,
    areas: [],
    skills: [],
    light: 5,
  }) as unknown as BattleState;

const dungeonStub = (broughtBack = 0) =>
  ({
    questDistribution: {
      questId: "quest:weald:p001",
      counts: [{ kind: "objective", count: 3 }],
    },
    necroticFungusBroughtBackCount: broughtBack,
  }) as import("./dungeon").DungeonState;

describe("Fungal Research brought back / objective（R-246、R-038）", () => {
  it("统计已砸毁真菌，living 不计入", () => {
    const b = battleStub([
      fungusEntity("f1", true),
      fungusEntity("f2", false, 1),
      fungusEntity("f3", false),
    ]);
    expect(destroyedNecroticFungusCount(b)).toBe(2);
  });

  it("目标房清房：留未砸毁可得 objective，砸毁累加 brought back", () => {
    const b = battleStub([fungusEntity("f1", true), fungusEntity("f2", false)]);
    const next = fungalResearchProgressFromBattle(dungeonStub(1), b, "objective");
    expect(next.necroticFungusBroughtBackCount).toBe(2);
    expect(next.fungalResearchObjectiveMet).toBe(true);
  });

  it("目标房全砸：仍计 brought back，不得 objective", () => {
    const b = battleStub([fungusEntity("f1", true), fungusEntity("f2", true)]);
    const next = fungalResearchProgressFromBattle(dungeonStub(), b, "objective");
    expect(next.necroticFungusBroughtBackCount).toBe(2);
    expect(next.fungalResearchObjectiveMet).toBeUndefined();
  });

  it("回村 XP 封顶 3", () => {
    expect([0, 1, 2, 3, 4, 9].map((n) => fungalResearchXpFromBroughtBack(n, 1))).toEqual([
      0, 1, 2, 3, 3, 3,
    ]);
  });
});
