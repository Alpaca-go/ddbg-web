import { describe, expect, it } from "vitest";
import medium from "../../../data/normalized/extension/weald/monster_medium.json";
import large from "../../../data/normalized/extension/weald/monster_large.json";
import curios from "../../../data/normalized/extension/weald/curio.json";
import { wealdCurioFileSchema } from "../../../data/src/curio";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { applyCommand, type GameState } from "../../src/shared/core/command";
import { createBattleState } from "../../src/shared/battle/battle";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../helpers/core-quest";
import { rebuildLocationQuestDecks } from "../../src/shared/quest/location-quest-sources";

const sources = {
  ...coreQuestSources,
  weald: { medium, large, curios: wealdCurioFileSchema.parse(curios).cards },
};
const packs = ["core", "weald"] as const;
const command = { type: "startBattle", wealdWhisperingWoods: true } as const;

/** 受控已部署检查点，不是初始种子的高等级任务出征或完整存档。 */
function fixture(stress = 0): GameState {
  let base = createCoreDungeonQuest(
    0,
    "quest:weald:p005",
    "radiant",
    coreParty,
    sources,
    true,
    "full",
    packs,
  );
  base = applyCommand(base, { type: "rollDungeonProvisions" }).state;
  for (let i = 0; base.dungeon?.pending && i < 100; i++) {
    const pending = base.dungeon.pending;
    base = applyCommand(base, {
      type: "resolveChoice",
      choiceId: pending.id,
      optionId: pending.options[0]!.id,
    }).state;
  }
  const pool = rebuildLocationQuestDecks(sources, "weald", 3, packs, "weald-higher-v1").monsterPool;
  const entities = (["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
    id: `h${i}`,
    side: "hero" as const,
    hero: "CRUSADER",
    skillIds: [],
    areaId: "a",
    stance,
    wounds: 0,
    stress,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const battle = createBattleState(0, {
    entities: [
      ...entities,
      {
        areaId: "a",
        stance: "aggressive",
        skillIds: [],
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: "neutral",
        life: 30,
        stanceSlots: 1,
      },
    ],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [],
    monsters: [
      {
        id: "neutral",
        life: 30,
        verification: { unverified: false },
        skills: [],
        type_position_tags: ["Beast"],
      },
    ],
    light: 5,
    resolveCards: coreQuestSources.resolveCards,
  });
  return {
    ...base,
    battle: { ...battle.battle!, wealdMechanics: true },
    dungeon: {
      ...base.dungeon!,
      phase: "inBattle",
      questDistribution: { ...base.dungeon!.questDistribution!, questId: "quest:weald:p015" },
      monsterPool: pool,
    },
  };
}

describe("R-264 Whispering Woods 轮开始压力", () => {
  it("首轮触发，抽先攻不重复；受控第二轮检查点与JSON回放一致", () => {
    const state = fixture();
    const before = structuredClone(state);
    const started = applyCommand(state, command);
    expect(started.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(
      started.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
    ).toEqual([1, 1, 1, 1]);
    expect(
      applyCommand(started.state, { type: "drawInitiative" }).state.battle!.entities.map(
        (e) => e.stress,
      ),
    ).toEqual(started.state.battle!.entities.map((e) => e.stress));
    const checkpoint: GameState = {
      ...started.state,
      battle: {
        ...started.state.battle!,
        encounter: {
          ...started.state.battle!.encounter!,
          deck: [],
          actedIds: [],
          turn: { type: "awaitingInitiative" },
        },
      },
    };
    const next = applyCommand(checkpoint, { type: "drawInitiative" });
    expect(next.state.battle!.whisperingWoodsRound).toBe(2);
    expect(
      next.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
    ).toEqual([2, 2, 2, 2]);
    expect(
      applyCommand(JSON.parse(JSON.stringify(checkpoint)) as GameState, { type: "drawInitiative" }),
    ).toEqual(next);
    expect(state).toEqual(before);
  });
  it("压力9走真实意志检定；已有意志卡时走心脏病及全灭终局", () => {
    const tested = applyCommand(fixture(9), command);
    expect(tested.events.filter((e) => e.type === "resolveTested")).toHaveLength(4);
    const state = fixture(9);
    const withCards = {
      ...state,
      battle: {
        ...state.battle!,
        resolveDecks: tested.state.battle!.resolveDecks!,
        entities: tested.state.battle!.entities.map((e) =>
          e.side === "hero" ? { ...e, stress: 9 } : e,
        ),
      },
    };
    const dead = applyCommand(withCards, command);
    expect(dead.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(dead.events.filter((e) => e.type === "heartAttack")).toHaveLength(4);
    expect(dead.state.battle!.encounter!.turn.type).toBe("halted");
  });
  it("旧无标记不升级；跨任务或缺版本原子拒绝，严格schema保留显式标记", () => {
    expect(savedCommandSchema.parse(command)).toEqual(command);
    expect(savedCommandSchema.safeParse({ ...command, wealdWhisperingWoods: false }).success).toBe(
      false,
    );
    const legacy = applyCommand(fixture(), { type: "startBattle" });
    expect(legacy.state.battle).not.toHaveProperty("whisperingWoodsRound");
    expect(legacy.state.battle!.entities[0]!.stress).toBe(0);
    const state = fixture();
    const wrong = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        questDistribution: { ...state.dungeon!.questDistribution!, questId: "quest:weald:p005" },
      },
    };
    expect(applyCommand(wrong, command).state).toBe(wrong);
    expect(applyCommand(wrong, command).events.some((e) => e.type === "commandRefused")).toBe(true);
    const noVersion: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        monsterPool: {
          ...state.dungeon!.monsterPool!,
          wealdInstances: state.dungeon!.monsterPool!.wealdInstances!,
        },
      },
    };
    const { wealdSourceVersion: _version, ...unmarked } = noVersion.dungeon!.monsterPool!;
    void _version;
    const invalid = { ...noVersion, dungeon: { ...noVersion.dungeon!, monsterPool: unmarked } };
    expect(applyCommand(invalid, command).state).toBe(invalid);
    const noCards = {
      ...state,
      battle: {
        ...state.battle!,
        resolveCards: [] as typeof coreQuestSources.resolveCards,
        entities: state.battle!.entities.map((e) => (e.side === "hero" ? { ...e, stress: 9 } : e)),
      },
    };
    expect(applyCommand(noCards, command).state).toBe(noCards);
  });
});
