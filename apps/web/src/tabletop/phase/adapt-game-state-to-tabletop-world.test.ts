import { describe, expect, it } from "vitest";
import type { BattleEntity, GameState, SkillStance } from "@ddbg/engine";
import { createBattleState } from "@ddbg/engine";
import { adaptGameStateToTabletopWorld } from "./adapt-game-state-to-tabletop-world";

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

function battleGame(heroOverrides: Partial<BattleEntity>[] = []): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `hero-${index}`,
    side: "hero",
    hero: ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"][index]!,
    heroLevel: 1,
    areaId: "A",
    stance,
    skillIds: [],
    wounds: 0,
    stress: 0,
    dodge: 5,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...heroOverrides[index],
  }));
  return createBattleState(1, {
    entities: heroes,
    areas: [{ id: "A", elevation: "normal", adjacent: [] }],
    light: 5,
    skills: [],
  });
}

function dungeonGame(heroes: NonNullable<GameState["dungeon"]>["heroes"]): GameState {
  return {
    seed: 1,
    notes: [],
    dungeon: {
      layout: {
        id: "test",
        source: { file: "t", page: 1, face: "front" },
        review: "pending",
        nodes: [],
        edges: [],
      },
      mode: "standard",
      cursor: 0,
      position: "S",
      heroes,
      resolveCards: [],
      resolveDecks: {},
      gold: 10,
      rooms: [],
      scoutBonus: false,
      phase: "ready",
      pending: null,
      decision: 0,
      exploration: null,
    },
  } as unknown as GameState;
}

describe("adaptGameStateToTabletopWorld", () => {
  it("初始建队：地牢四名英雄与等级、饰品槽", () => {
    const heroes = stances.map((stance, i) => ({
      id: `hero-${i}`,
      stress: 0,
      stance,
      level: i === 2 ? 2 : 1,
      life: 12,
      wounds: 0,
      heroStatId: `hero_stat:p00${i + 1}:front`,
    }));
    const patch = adaptGameStateToTabletopWorld(dungeonGame(heroes), {
      heroDisplayName: (h) => h.heroStatId?.split(":")[0] ?? h.id,
    });
    expect(patch?.heroes).toHaveLength(4);
    const highway = patch!.heroes.find((h) => h.id === "hero-2");
    expect(highway?.trinketSlotCount).toBe(2);
    expect(highway?.heroLevel).toBe(2);
  });

  it("受伤与压力：战斗实体投影伤口与压力轨", () => {
    const patch = adaptGameStateToTabletopWorld(battleGame([{ wounds: 2, stress: 7 }, {}, {}, {}]));
    const crusader = patch!.heroes.find((h) => h.id === "hero-0");
    expect(crusader).toMatchObject({ wounds: 2, stress: 7, hero: "CRUSADER" });
    expect(crusader?.stressFace).toBeNull();
  });

  it("有状态：statusStacks 进入左栏", () => {
    const patch = adaptGameStateToTabletopWorld(
      dungeonGame([
        {
          id: "hero-0",
          stress: 0,
          stance: "aggressive",
          statusStacks: [{ kind: "bleed", remaining: 2, amount: 1 }],
        },
      ]),
    );
    expect(patch!.heroes.find((h) => h.id === "hero-0")?.statusStacks).toEqual([
      { kind: "bleed", remaining: 2, amount: 1 },
    ]);
  });

  it("死亡与缺位：阵亡标记并补齐空席", () => {
    const patch = adaptGameStateToTabletopWorld(
      battleGame([{ dead: true, wounds: 0 }, {}, {}, {}]),
    );
    const dead = patch!.heroes.find((h) => h.id === "hero-0");
    expect(dead?.dead).toBe(true);
    const twoHeroDungeon = dungeonGame([
      { id: "hero-0", stress: 0, stance: "aggressive" },
      { id: "hero-1", stress: 0, stance: "defensive" },
    ]);
    const padded = adaptGameStateToTabletopWorld(twoHeroDungeon);
    expect(padded!.heroes.filter((h) => h.isEmpty)).toHaveLength(2);
    expect(padded!.heroes).toHaveLength(4);
  });

  it("无战斗也无队伍时返回 null", () => {
    expect(adaptGameStateToTabletopWorld({ seed: 1, notes: [] })).toBeNull();
  });
});
