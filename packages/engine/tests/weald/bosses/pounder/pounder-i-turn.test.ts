import { expect, it } from "vitest";
import { coreQuestSources } from "../../../helpers/core-quest";
import heroStats from "../../../../../data/normalized/corebox/hero_stat.json";
import coreMedium from "../../../../../data/normalized/corebox/monster_medium.json";
import type { MonsterCardView } from "../../../../src/shared/core/monster-skill";
import { createBattleState, type BattleEntity } from "../../../../src/shared/battle/battle";
import { applyCommand, type GameState } from "../../../../src/shared/core/command";
import {
  ensurePounderIBossScriptRegistered,
  POUNDER_I_SCRIPT_ID,
} from "../../../../src/weald/bosses/pounder/pounder-i";
import {
  pounderIInitialDeployment,
  createPounderIEntity,
} from "../../../../src/weald/bosses/pounder/pounder-i-projection";

function fixture(extra: readonly BattleEntity[] = []): GameState {
  ensurePounderIBossScriptRegistered();
  const setup = pounderIInitialDeployment();
  const hero: BattleEntity = {
    id: "h",
    side: "hero",
    hero: "CRUSADER",
    areaId: "L",
    stance: "aggressive",
    wounds: 0,
    dodge: 0,
    life: 17,
    heroStatId: "hero_stat:core:h01:p001:front",
    stress: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const initial = createBattleState(17, {
    ...setup,
    heroStats: heroStats.cards as NonNullable<
      import("../../../../src/shared/battle/battle").BattleSetup["heroStats"]
    >,
    monsters: [
      ...setup.monsters,
      coreMedium.cards.find((c) => c.id === "monster_medium:p027")! as MonsterCardView,
    ],
    entities: [
      ...setup.entities,
      hero,
      { ...hero, id: "h2", stance: "defensive" },
      { ...createPounderIEntity("matchman", "m", "defensive"), areaId: "B" },
      ...extra,
    ],
    skills: [],
    light: 5,
    wealdMechanics: true,
  });
  return {
    ...initial,
    dungeon: {
      phase: "inBattle",
      contentPacks: ["core", "weald"],
      campaignLevel: 1,
      mode: "standard",
      heroes: [],
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
      pounderBossBattles: true,
      questDistribution: { questId: "quest:p019", campaignLevel: 1 },
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    } as unknown as NonNullable<GameState["dungeon"]>,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}

function run(state: GameState, command: Parameters<typeof applyCommand>[1]): GameState {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
const prepare = { type: "prepareMonsterAction", actorId: "m" } as const;
const move = { type: "moveMonsterToRange", actorId: "m" } as const;

it("页面炮击保留Damage Stone响应窗口；JSON选择续接只结算一次伤害和骰序", () => {
  const base = fixture();
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) => (e.side === "hero" ? { ...e, heroLevel: 1 } : e)),
      trinkets: {
        ...coreQuestSources.catalog.trinkets!,
        held: [{ cardId: "trinket:p007", heroId: "h", face: "inverted" as const }],
      },
    },
  };
  const positioned = run(run(state, prepare), move);
  const command = {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "boss:pounder",
    skillSlot: 1,
    damageStoneWindow: true,
  } as const;
  const opened = applyCommand(positioned, command);
  expect(opened.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(opened.state.battle!.pending?.type).toBe("damageStone");
  expect(opened.state.battle!.entities.find((e) => e.id === "h")!.wounds).toBe(0);
  expect(opened.state.battle!.rngCursor).toBe(positioned.battle!.rngCursor);
  const choice = opened.pendingChoice!;
  const skip = run(opened.state, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "continue",
  });
  const use = run(JSON.parse(JSON.stringify(opened.state)) as GameState, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "trinket:p007",
  });
  expect(use.battle!.entities.find((e) => e.id === "h")!.wounds).toBe(
    skip.battle!.entities.find((e) => e.id === "h")!.wounds + 2,
  );
  expect(use.battle!.entities.find((e) => e.id === "h2")!.wounds).toBe(
    skip.battle!.entities.find((e) => e.id === "h2")!.wounds,
  );
  expect(use.battle!.rngCursor).toBe(skip.battle!.rngCursor);
  expect(use.battle!.pounderFire).toBeUndefined();
  expect(use.battle!.encounter!.actedIds).toEqual(["m"]);
});

it("新版本本体回合无Matchman则增援，有Matchman则结束且不自行炮击", () => {
  const base = fixture();
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      encounter: {
        ...base.battle!.encounter!,
        turn: { type: "monster" as const, actorId: "boss:pounder" },
      },
    },
  };
  const idle = run(state, { type: "prepareMonsterAction", actorId: "boss:pounder" });
  expect(idle.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(idle.battle!.encounter!.actedIds).toContain("boss:pounder");
  expect(idle.battle!.entities).toEqual(state.battle!.entities);
  const absent = {
    ...state,
    battle: { ...state.battle!, entities: state.battle!.entities.filter((e) => e.id !== "m") },
  };
  const summoned = run(absent, { type: "prepareMonsterAction", actorId: "boss:pounder" });
  expect(summoned.battle!.entities.filter((e) => e.id.startsWith("pounder-summon:"))).toHaveLength(
    3,
  );
  expect(summoned.battle!.rngCursor).toBe(absent.battle!.rngCursor + 3);
});

it("Matchman D→A靠近后跳过；下个受控回合A→B同区触发，只有炮击掷骰", () => {
  const base = fixture();
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "D" } : e)),
    },
  };
  const prepared = run(state, prepare);
  expect(prepared.battle!.monsterAction).toMatchObject({
    targetId: "boss:pounder",
    selectionRoll: null,
  });
  const approached = run(prepared, move);
  expect(approached.battle!.entities.find((e) => e.id === "m")!.areaId).toBe("A");
  expect(approached.battle!.encounter!.actedIds).toContain("m");
  expect(approached.battle!.rngCursor).toBe(state.battle!.rngCursor);
  const second = {
    ...approached,
    battle: {
      ...approached.battle!,
      encounter: {
        ...approached.battle!.encounter!,
        actedIds: [],
        turn: { type: "monster" as const, actorId: "m" },
      },
    },
  };
  const positioned = run(run(second, prepare), move);
  expect(positioned.battle!.entities.find((e) => e.id === "m")!.areaId).toBe("B");
  const result = applyCommand(positioned, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "boss:pounder",
    skillSlot: 1,
  });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(
    result.events.some(
      (e) => e.type === "monsterSkillTargetsResolved" && e.actorId === "boss:pounder",
    ),
  ).toBe(true);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
  expect(result.state.battle!.encounter!.actedIds).toEqual(["m"]);
});

it("Pounder区域满员时不瞬移、不无视容量触发，定位不额外耗骰", () => {
  const base = fixture();
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "m" ? { ...e, areaId: "A" } : e.side === "hero" ? { ...e, areaId: "B" } : e,
      ),
    },
  };
  const result = run(run(state, prepare), move);
  expect(result.battle!.entities.find((e) => e.id === "m")!.areaId).toBe("A");
  expect(result.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(result.battle!.encounter!.actedIds).toContain("m");
});

it("旧版本不启用本体回合入口，也不允许Matchman冒用普通移动指向怪物", () => {
  const source = fixture();
  const { pounderBossBattles: _version, ...dungeon } = source.dungeon!;
  void _version;
  const old = {
    ...source,
    dungeon,
    battle: {
      ...source.battle!,
      encounter: {
        ...source.battle!.encounter!,
        turn: { type: "monster" as const, actorId: "boss:pounder" },
      },
    },
  };
  const result = applyCommand(old, { type: "prepareMonsterAction", actorId: "boss:pounder" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toEqual(old);
  const prepared = run(source, prepare);
  const legacy = { ...prepared, dungeon };
  const blocked = applyCommand(legacy, move);
  expect(blocked.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(blocked.state).toEqual(legacy);
});
