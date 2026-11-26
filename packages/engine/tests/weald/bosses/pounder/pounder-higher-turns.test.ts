import { describe, expect, it } from "vitest";
import stats from "../../../../../data/normalized/corebox/hero_stat.json";
import {
  createBattleState,
  type BattleEntity,
  type BattleSetup,
} from "../../../../src/shared/battle/battle";
import { applyCommand, type GameState, type Command } from "../../../../src/shared/core/command";
import {
  pounderIInitialDeployment,
  createPounderIEntity,
} from "../../../../src/weald/bosses/pounder/pounder-i-projection";
import { pounderContextForLevel } from "../../../../src/weald/bosses/pounder/pounder-runtime-context";
import { removeCasualties } from "../../../../src/shared/dungeon/encounter";

function fixture(level: 2 | 3, matchman = false): GameState {
  const context = pounderContextForLevel(level);
  const original = pounderIInitialDeployment();
  const face = (index: number, id: string, stance: "aggressive" | "defensive") => ({
    ...createPounderIEntity(index ? "matchman" : "pounder", id, stance),
    monsterCardId: context.catalog[index]!.id,
    life: context.catalog[index]!.life!,
    dodge: context.catalog[index]!.dodge!,
    areaId: "B",
  });
  const stat = stats.cards.find(
    (s) => s.name === "CRUSADER" && s.level === 3 && s.attributesVerified,
  )!;
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    life: stat.life,
    heroStatId: stat.id,
    wounds: 0,
    stress: 0,
    dodge: 0,
    areaId: "L",
    stance: "aggressive",
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    skillIds: [],
  };
  const state = createBattleState(17, {
    ...original,
    monsters: [...context.catalog, context.companion],
    entities: [
      face(0, "boss:pounder", "aggressive"),
      hero,
      { ...hero, id: "h2", stance: "defensive" },
      ...(matchman ? [face(1, "m", "defensive")] : []),
    ],
    heroStats: stats.cards as NonNullable<BattleSetup["heroStats"]>,
    skills: [],
    light: 5,
  });
  return {
    ...state,
    dungeon: {
      phase: "inBattle",
      heroes: [],
      contentPacks: ["core", "weald"],
      mode: "standard",
      campaignLevel: level,
      wealdHigherBosses: true,
      pounderBossBattles: true,
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
      activeBossThreatScriptId: context.scriptId,
      imminentThreatDescriptionCardId: context.description,
      roomCards: { active: { tileId: "room_tile:weald:12" } },
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: matchman ? "m" : "boss:pounder" },
      },
    },
  };
}
function run(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}

describe.each([2, 3] as const)("R-268 Pounder %i 级回合", (level) => {
  it("按真实组成增援，Bloodletter占相邻两姿态与两格容量，逐只洗入先攻", () => {
    const state = fixture(level);
    const before = structuredClone(state);
    const result = run(state, { type: "prepareMonsterAction", actorId: "boss:pounder" });
    const summoned = result.state.battle!.entities.filter((e) =>
      e.id.startsWith("pounder-summon:"),
    );
    expect(summoned.map((e) => [e.monsterCardId, e.stanceSlots])).toEqual(
      level === 2
        ? [
            ["monster_medium:weald:p024", 1],
            ["monster_large:p002", 2],
          ]
        : [
            ["monster_medium:weald:p025", 1],
            ["monster_medium:p056", 1],
            ["monster_medium:p056", 1],
          ],
    );
    expect(summoned.map((e) => e.stance)).toEqual(
      level === 2 ? ["defensive", "ranged"] : ["defensive", "ranged", "support"],
    );
    expect(result.state.battle!.rngCursor - state.battle!.rngCursor).toBe(level === 2 ? 2 : 3);
    expect(state).toEqual(before);
    expect(
      run(JSON.parse(JSON.stringify(state)) as GameState, {
        type: "prepareMonsterAction",
        actorId: "boss:pounder",
      }),
    ).toEqual(result);
  });

  it("增援区域挤占待选可JSON恢复，不重复Matchman或召唤先攻", () => {
    const initial = fixture(level);
    const crowded: GameState = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((e) =>
          e.id === "h" || (level === 3 && e.id === "h2") ? { ...e, areaId: "I" } : e,
        ),
      },
    };
    const offered = run(crowded, { type: "prepareMonsterAction", actorId: "boss:pounder" });
    expect(offered.pendingChoice).toBeDefined();
    const command: Command = {
      type: "resolveChoice",
      choiceId: offered.pendingChoice!.id,
      optionId: offered.pendingChoice!.options[0]!.id,
    };
    const resumed = run(JSON.parse(JSON.stringify(offered.state)) as GameState, command);
    expect(resumed).toEqual(run(offered.state, command));
    const summons = resumed.state.battle!.entities.filter((e) =>
      e.id.startsWith("pounder-summon:"),
    );
    expect(summons).toHaveLength(level === 2 ? 2 : 3);
    expect(resumed.state.battle!.rngCursor - initial.battle!.rngCursor).toBe(level === 2 ? 2 : 3);
    expect(summons.filter((e) => e.monsterCardId?.includes(":weald:"))).toHaveLength(1);
  });

  it("Matchman在场不补同伴，不能直接让Pounder自行炮击", () => {
    const state = fixture(level, true);
    const cannonTurn: GameState = {
      ...state,
      battle: {
        ...state.battle!,
        encounter: {
          ...state.battle!.encounter!,
          turn: { type: "monster", actorId: "boss:pounder" },
        },
      },
    };
    expect(
      applyCommand(cannonTurn, {
        type: "playMonsterSkill",
        actorId: "boss:pounder",
        skillSlot: 1,
        targetId: "h",
      }).state,
    ).toBe(cannonTurn);
    const result = run(cannonTurn, { type: "prepareMonsterAction", actorId: "boss:pounder" });
    expect(result.state.battle!.entities).toEqual(cannonTurn.battle!.entities);
    expect(result.state.battle!.rngCursor).toBe(cannonTurn.battle!.rngCursor);
  });

  it("同区Matchman以本级炮击共享骰攻击英雄；结束的是Matchman回合", () => {
    const state = fixture(level, true);
    const result = run(state, { type: "applyPounderIFireInTheHole", actorId: "m" });
    const event = result.events.find((e) => e.type === "monsterSkillTargetsResolved");
    expect(event).toMatchObject({ actorId: "boss:pounder", skillSlot: 1 });
    if (event?.type !== "monsterSkillTargetsResolved") throw new Error("缺少共享炮击事件");
    expect(event.resolutions.map((r) => r.targetId)).toEqual(["h", "h2"]);
    expect(
      event.resolutions.every(
        (r) => r.damageDealt === (level === 2 ? 12 : 17) && r.targetStress === 2,
      ),
    ).toBe(true);
    expect(result.state.battle!.rngCursor - state.battle!.rngCursor).toBe(1);
    expect(result.state.battle!.encounter!.actedIds).toContain("m");
    expect(result.state.battle!.encounter!.actedIds).not.toContain("boss:pounder");
  });

  it("本体被击败移走所有Brigands，包含II场的I级Bloodletter；不重掷骰", () => {
    const summoned = run(fixture(level), {
      type: "prepareMonsterAction",
      actorId: "boss:pounder",
    }).state;
    const dead: GameState = {
      ...summoned,
      battle: {
        ...summoned.battle!,
        entities: summoned.battle!.entities.map((e) =>
          e.id === "boss:pounder" ? { ...e, dead: true } : e,
        ),
      },
    };
    const result = removeCasualties({ state: dead, events: [] }, ["boss:pounder"]);
    expect(result.state.battle!.entities.filter((e) => e.side === "monster" && !e.dead)).toEqual(
      [],
    );
    expect(result.state.battle!.rngCursor).toBe(dead.battle!.rngCursor);
  });
});

it("旧无标记日志保留Q-189技术停点，不判定召唤失败或提交部分增援", () => {
  const source = fixture(2),
    state: GameState = {
      ...source,
      battle: {
        ...source.battle!,
        entities: source.battle!.entities.map((e) =>
          e.side === "hero" ? { ...e, areaId: "I" } : e,
        ),
      },
    };
  const before = structuredClone(state),
    result = applyCommand(state, { type: "prepareMonsterAction", actorId: "boss:pounder" });
  expect(result.events).toEqual([
    expect.objectContaining({ type: "commandRefused", message: expect.stringContaining("Q-189") }),
  ]);
  expect(result.events[0]).toMatchObject({
    message: expect.stringContaining("后续规则未定义；技术停点，不判定召唤失败"),
  });
  expect(result.state).toBe(state);
  expect(state).toEqual(before);
});

it("R-271：正式Pounder II增援连锁挤走两名英雄，严格保留旧无标记版本", () => {
  const source = fixture(2);
  const state: GameState = {
    ...source,
    battle: {
      ...source.battle!,
      entities: source.battle!.entities.map((e) => (e.side === "hero" ? { ...e, areaId: "I" } : e)),
    },
  };
  const command: Command = {
    type: "prepareMonsterAction",
    actorId: "boss:pounder",
    chainCrowding: true,
  };
  const before = structuredClone(state);
  const result = run(state, command);
  expect(result.state.chainCrowding).toBe(true);
  expect(
    result.state
      .battle!.entities.filter((e) => !e.dead && e.areaId === "I")
      .map((e) => e.stanceSlots),
  ).toEqual([2]);
  expect(
    result.state.battle!.entities.filter((e) => e.side === "hero").every((e) => e.areaId !== "I"),
  ).toBe(true);
  expect(state).toEqual(before);
  expect(applyCommand(JSON.parse(JSON.stringify(state)) as GameState, command)).toEqual(result);
  expect(result.state.battle!.pending).toBeNull();
});
it("R-271：挤占无解仅使Bloodletter召唤无效，Matchman不回滚", () => {
  const source = fixture(2);
  const state: GameState = {
    ...source,
    battle: {
      ...source.battle!,
      areas: source.battle!.areas.map((a) => (a.id === "I" ? { ...a, capacity: 1 } : a)),
    },
  };
  const result = run(state, {
    type: "prepareMonsterAction",
    actorId: "boss:pounder",
    chainCrowding: true,
  });
  expect(
    result.state.battle!.entities.some(
      (e) => e.monsterCardId === pounderContextForLevel(2).matchmanCardId,
    ),
  ).toBe(true);
  expect(
    result.state.battle!.entities.some(
      (e) => e.monsterCardId === pounderContextForLevel(2).companionCardId,
    ),
  ).toBe(false);
});
