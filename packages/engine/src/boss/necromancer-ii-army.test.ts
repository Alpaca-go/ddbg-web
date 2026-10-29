import { beforeEach, describe, expect, it } from "vitest";
import layout from "../../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../../data/normalized/corebox/clear_the_path_distribution.json";
import { createDungeonSandbox } from "../dungeon";
import { applyCommand, type Command, type GameState } from "../command";
import { coreParty, coreQuestSources as sources } from "../test-helpers/core-quest";
import { dungeonMonsterPoolThrough } from "../monster-pool-runtime";
import {
  ensureNecromancerIIBossScriptRegistered,
  NECROMANCER_II_SCRIPT_ID,
} from "./necromancer-ii";

function setup(seed = 3): GameState {
  const heroes = coreParty.map((hero, i) => {
    const stat = sources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      ...hero,
      id: `h${i}`,
      level: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: true,
    };
  });
  const state = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "standard",
    "S",
    heroes,
    sources.resolveCards,
    { dungeonLevel: 2, light: 5, provisions: [] },
    sources.curios,
    sources.rooms,
    sources.monsters,
    sources.catalog,
  );
  return {
    ...state,
    dungeon: {
      ...state.dungeon!,
      campaignLevel: 2,
      phase: "awaitingRoom",
      position: state.dungeon!.rooms.find((r) => r.kind === "lair")!.id,
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
    },
  };
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
function deploy(state: GameState) {
  return ok(ok(state, { type: "prepareDungeonBattle" }).state, { type: "prepareDungeonMonsters" });
}

describe("C-019 · Army of the Dead 首场真实生成", () => {
  beforeEach(ensureNecromancerIIBossScriptRegistered);

  it.each([1, 3, 40, 100])(
    "seed %i：Captain 首位生成、填满四姿态，53 张真实实例守恒且不额外掷骰",
    (seed) => {
      const initial = setup(seed),
        before = structuredClone(initial);
      const prepared = ok(initial, { type: "prepareDungeonBattle" }).state;
      const result = ok(prepared, { type: "prepareDungeonMonsters" });
      expect(result).toEqual(ok(prepared, { type: "prepareDungeonMonsters" }));
      expect(initial).toEqual(before);
      const pool = result.state.dungeon!.monsterPool!;
      expect(pool.active!.monsters[0]).toMatchObject({
        instanceId: "monster-deck:p012",
        cardId: "monster_large:p001",
        stance: "aggressive",
        stanceSlots: 2,
      });
      expect(pool.active!.monsters.reduce((n, m) => n + m.stanceSlots, 0)).toBe(4);
      const instances = [
        ...pool.remaining!,
        ...pool.discarded,
        ...pool.active!.monsters.map((m) => m.instanceId),
      ];
      expect(instances.sort()).toEqual(
        dungeonMonsterPoolThrough(pool, 2)
          .map((m) => m.instanceId)
          .sort(),
      );
      expect(instances).toHaveLength(53);
      expect(result.state.dungeon!.cursor).toBe(prepared.dungeon!.cursor + 52);
      expect(result.state.dungeon!.necromancerIIArmyUsed).toBeUndefined();
      expect(applyCommand(result.state, { type: "prepareDungeonMonsters" }).state).toBe(
        result.state,
      );
    },
  );

  it("入场拒绝不消费首战；成功入场后标记一次，JSON 重放不重复生成或抽骰", () => {
    const deployed = deploy(setup()).state;
    const invalid: GameState = {
      ...deployed,
      dungeon: {
        ...deployed.dungeon!,
        heroes: deployed.dungeon!.heroes.map((h, i) => (i === 0 ? { ...h, skillIds: [] } : h)),
      },
    };
    expect(applyCommand(invalid, { type: "startDungeonBattle" }).state).toBe(invalid);
    expect(invalid.dungeon!.necromancerIIArmyUsed).toBeUndefined();
    const entered = ok(deployed, { type: "startDungeonBattle" });
    expect(entered.state.dungeon!.necromancerIIArmyUsed).toBe(true);
    expect(
      entered.state.battle!.entities.filter((e) => e.monsterCardId === "monster_large:p001"),
    ).toHaveLength(1);
    expect(entered).toEqual(
      ok(JSON.parse(JSON.stringify(deployed)), { type: "startDungeonBattle" }),
    );
    expect(applyCommand(entered.state, { type: "startDungeonBattle" }).state).toBe(entered.state);
    expect(entered.state.dungeon!.cursor).toBe(deployed.dungeon!.cursor);
  });

  it("首战已用后按原牌序生成，与无此威胁的同种子部署一致", () => {
    const initial = setup(40);
    const { activeBossThreatScriptId: _active, ...without } = initial.dungeon!;
    void _active;
    const ordinary = deploy({ ...initial, dungeon: without });
    const later = deploy({
      ...initial,
      dungeon: { ...initial.dungeon!, necromancerIIArmyUsed: true },
    });
    expect(later.state.dungeon!.monsterPool).toEqual(ordinary.state.dungeon!.monsterPool);
    expect(later.state.dungeon!.cursor).toBe(ordinary.state.dungeon!.cursor);
    expect(
      later.events.some(
        (e) => e.type === "dungeonUpdated" && e.message.includes("Army of the Dead"),
      ),
    ).toBe(false);
  });

  it("真实 Captain 实例被移出时明确拒绝，不虚构卡、不改输入或 RNG", () => {
    const initial = setup();
    const state: GameState = {
      ...initial,
      dungeon: {
        ...initial.dungeon!,
        monsterPool: {
          ...initial.dungeon!.monsterPool!,
          permanentlyRemovedCombatCardIds: ["monster_large:p001"],
        },
      },
    };
    const prepared = ok(state, { type: "prepareDungeonBattle" }).state;
    const result = applyCommand(prepared, { type: "prepareDungeonMonsters" });
    expect(result.state).toBe(prepared);
    expect(result.events).toContainEqual(
      expect.objectContaining({
        type: "commandRefused",
        message: expect.stringContaining("Army of the Dead"),
      }),
    );
    expect(result.state.dungeon!.necromancerIIArmyUsed).toBeUndefined();
  });
});
