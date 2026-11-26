import { coreQuestSources } from "../../../helpers/core-quest";
import { expect, it } from "vitest";
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
    resolveCards: coreQuestSources.resolveCards,
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
      resolveDecks: {},
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
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

const fire = { type: "applyPounderIFireInTheHole", actorId: "m" } as const;
function atEight(): GameState {
  const state = fixture();
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => (e.side === "hero" ? { ...e, stress: 8 } : e)),
    },
  };
}

it("R28／R-258 两目标炮击到10压力各检定一次，结果确定且只结束Matchman回合", () => {
  const state = atEight();
  const before = structuredClone(state);
  const result = applyCommand(state, fire);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(2);
  const heroes = result.state.battle!.entities.filter((e) => e.side === "hero");
  expect(
    heroes.every((e) => e.stress === 0 && e.resolveTested && e.resolveCardId && e.wounds === 9),
  ).toBe(true);
  expect(new Set(heroes.map((e) => e.resolveCardId)).size).toBe(2);
  const roles = new Set(
    heroes.map((e) => coreQuestSources.resolveCards.find((c) => c.id === e.resolveCardId)!.role),
  );
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1 + 2 + 4 * roles.size);
  expect(result.state.battle!.encounter!.actedIds).toEqual(["m"]);
  expect(result.state.battle!.pounderFire).toBeUndefined();
  expect(applyCommand(state, fire)).toEqual(result);
  expect(state).toEqual(before);
});

it("缺少完整意志卡目录时整条炮击回滚伤害、压力、骰序和触发上下文", () => {
  const base = atEight();
  const state = {
    ...base,
    battle: { ...base.battle!, resolveCards: coreQuestSources.resolveCards.slice(0, 9) },
  };
  const result = applyCommand(state, fire);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toEqual(state);
});

it("已有意志卡再次到10压力直接心脏病；双方英雄死亡的终局清理炮击上下文", () => {
  const base = atEight();
  const cards = coreQuestSources.resolveCards;
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e, index) =>
        e.side === "hero" ? { ...e, resolveTested: true, resolveCardId: cards[index]!.id } : e,
      ),
    },
  };
  const result = applyCommand(state, fire);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.events.filter((e) => e.type === "heartAttack")).toHaveLength(2);
  expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(0);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1 + 4);
  expect(result.state.battle!.encounter!.turn).toMatchObject({
    type: "halted",
    reason: "heroesDefeated",
  });
  expect(result.state.battle!.pounderFire).toBeUndefined();
});

it("炮击抽到Selfish后，后续英雄回合消耗补给待选不重放炮击", () => {
  const base = fixture();
  const cards = coreQuestSources.resolveCards;
  const selfish = cards.find((c) => c.name === "Selfish")!;
  const state: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      // 独立机制夹具：显式从游标1开始，保持seed17；不属于自然战役日志。
      rngCursor: 1,
      resolveDecks: {
        affliction: [
          selfish.id,
          ...cards.filter((c) => c.role === "affliction" && c.id !== selfish.id).map((c) => c.id),
        ],
      },
      provisions: [
        { id: "food", face: "food" },
        { id: "torch", face: "torch" },
      ],
      entities: base.battle!.entities.map((e) => (e.id === "h" ? { ...e, stress: 8 } : e)),
    },
  };
  const shot = applyCommand(state, fire);
  expect(shot.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(shot.state.battle!.entities.find((e) => e.id === "h")!.resolveCardId).toBe(selfish.id);
  const turn = applyCommand(shot.state, { type: "drawInitiative" });
  expect(turn.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(turn.state.battle!.pending?.type).toBe("resolveProvision");
  expect(turn.state.battle!.pounderFire).toBeUndefined();
  const choice = turn.pendingChoice!;
  const invalid = applyCommand(turn.state, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "invalid",
  });
  expect(invalid.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(invalid.state).toEqual(turn.state);
  const frozen = applyCommand(turn.state, fire);
  expect(frozen.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(frozen.state).toEqual(turn.state);
  const command = { type: "resolveChoice", choiceId: choice.id, optionId: "food" } as const;
  const resumed = applyCommand(JSON.parse(JSON.stringify(turn.state)) as GameState, command);
  expect(resumed.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(resumed.state.battle!.rngCursor).toBe(turn.state.battle!.rngCursor);
  expect(resumed.state.battle!.entities.find((e) => e.id === "h")!.wounds).toBe(9);
  expect(resumed.state.battle!.provisions).toEqual([{ id: "torch", face: "torch" }]);
  const repeated = applyCommand(resumed.state, command);
  expect(repeated.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(repeated.state).toEqual(resumed.state);
});
