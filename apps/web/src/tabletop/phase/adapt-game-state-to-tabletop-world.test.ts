import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { BattleEntity, GameState, MonsterCardView, SkillStance } from "@ddbg/engine";
import { createBattleState } from "@ddbg/engine";

vi.mock("virtual:battle-data", () => {
  const soldier = (
    JSON.parse(
      readFileSync(
        new URL(
          "../../../../../packages/data/normalized/corebox/monster_medium.json",
          import.meta.url,
        ),
        "utf8",
      ),
    ) as { cards: MonsterCardView[] }
  ).cards.find((card) => card.id === "monster_medium:p001" && "skills" in card)!;
  return {
    battleData: {
      monsters: [
        {
          id: soldier.id,
          name: "Bone Soldier",
          life: soldier.life,
          skills: soldier.skills.map((skill) => ({
            slot: skill.slot,
            name: skill.name ?? `技能位 ${skill.slot}`,
          })),
        },
      ],
      heroStats: [],
      skills: [],
    },
  };
});

import { adaptGameStateToTabletopWorld } from "./adapt-game-state-to-tabletop-world";

const soldierCard = (
  JSON.parse(
    readFileSync(
      new URL(
        "../../../../../packages/data/normalized/corebox/monster_medium.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as { cards: MonsterCardView[] }
).cards.find((card) => card.id === "monster_medium:p001" && "skills" in card)!;

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
  it("T4：区域只读，怪物回合不借用英雄，翻牌记录在新轮清空", () => {
    const base = battleGame();
    const game: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: {
          round: 2,
          deck: ["hero", "monster"],
          actedIds: ["hero-0"],
          turn: { type: "monster", actorId: "m0" },
        },
      },
    };
    const events = [
      { type: "turnStarted" as const, message: "", round: 1, side: "hero" as const },
      { type: "roundStarted" as const, message: "", round: 2 },
      { type: "turnStarted" as const, message: "", round: 2, side: "monster" as const },
      { type: "initiativeDiscarded" as const, message: "", round: 2, side: "hero" as const },
    ];
    const patch = adaptGameStateToTabletopWorld(game, { events });
    expect(patch?.battle).toMatchObject({
      turnActorId: "m0",
      turnLabel: "怪物回合",
      actionsRemaining: 0,
      initiativeDeckHero: 1,
      initiativeDeckMonster: 1,
      initiativeRevealed: ["monster", "hero"],
      nextHeroId: "hero-1",
      roomCardId: null,
    });
    expect(patch?.battle?.areas).toBe(game.battle!.areas);
    expect(
      adaptGameStateToTabletopWorld(game, {
        events: [...events, { type: "roundStarted", message: "", round: 3 }],
      })?.battle?.initiativeRevealed,
    ).toEqual([]);
  });

  it("T4：无先攻记录时不混入 mock，结束战斗后没有下一名候选", () => {
    const base = battleGame();
    expect(adaptGameStateToTabletopWorld(base)?.battle).toMatchObject({
      turnLabel: "尚未开始战斗",
      initiativeRevealed: [],
      nextHeroId: null,
    });
    const game: GameState = {
      ...base,
      battle: {
        ...base.battle!,
        encounter: {
          round: 4,
          deck: [],
          actedIds: [],
          turn: { type: "finished", outcome: "retreat" },
        },
      },
    };
    expect(adaptGameStateToTabletopWorld(game)?.battle).toMatchObject({
      turnLabel: "第 4 轮结束 · 撤退",
      nextHeroId: null,
      nextMonsterId: null,
    });
  });
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

  it("战斗怪物与 monsterAction 只读投影", () => {
    const card = soldierCard;
    const game = battleGame();
    const withMonster: GameState = {
      ...game,
      battle: {
        ...game.battle!,
        entities: [
          ...game.battle!.entities,
          {
            id: "m0",
            side: "monster",
            hero: null,
            skillIds: [],
            areaId: "A",
            stance: "aggressive",
            stanceSlots: 1,
            monsterCardId: card.id,
            wounds: 2,
            life: card.life,
            dodge: 0,
            guard: false,
            dead: false,
            bleed: [],
            blight: [],
            statusStacks: [{ kind: "mark", remaining: 1 }],
          },
        ],
        monsters: [card],
        monsterAction: {
          actorId: "m0",
          skillSlot: 1,
          targetId: "hero-0",
          selectionRoll: 6,
        },
      },
    };
    const patch = adaptGameStateToTabletopWorld(withMonster);
    expect(patch?.monsters).toHaveLength(1);
    expect(patch?.monsters![0]).toMatchObject({
      id: "m0",
      wounds: 2,
      preparedSkill: { skillSlot: 1, targetId: "hero-0", selectionRoll: 6 },
    });
    const monster = patch?.monsters?.[0];
    expect(monster?.preparedSkill?.targetPriority).toBeNull();
  });
});
