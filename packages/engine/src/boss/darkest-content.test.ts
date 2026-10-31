import { expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import type { GameState } from "../command";
import type { DungeonState } from "../dungeon";
import {
  darkestBossVictoryAfterEncounter,
  readDarkestBossEncounter,
  readFinalBattlePlanAfterDarkestVictory,
} from "./darkest-content";

const initial = createCoreDungeonQuest(1, "quest:p016", "radiant", coreParty, coreQuestSources);
const battle = createBattleState(1, {
  entities: [],
  areas: [{ id: "logical", adjacent: [], capacity: 8, elevation: "normal" }],
  skills: [],
  light: 5,
}).battle!;
const monster: BattleEntity = {
  id: "probe",
  side: "monster",
  hero: null,
  areaId: "logical",
  life: 1,
  wounds: 1,
  dodge: 0,
  guard: false,
  dead: true,
  bleed: [],
  blight: [],
  skillIds: [],
  stance: "aggressive",
  stanceSlots: 1,
};
/** 仅测试胜利边界谓词；不冒称已核实部署或完成最暗Boss战。 */
function victory(questId: "quest:p016" | "quest:p017" | "quest:p018"): GameState {
  return {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      questDistribution: { ...initial.dungeon!.questDistribution!, questId },
    },
    battle: {
      ...battle,
      entities: readDarkestBossEncounter(questId)!.actors.map((a, i) => ({
        ...monster,
        id: `boss-${i}`,
        monsterCardId: a.cardId,
        dead: true,
      })),
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
}

it("三任务目标Boss均死亡才算胜利；Templars漏一只、同卡仍有活体或撤退均不算", () => {
  for (const q of ["quest:p016", "quest:p017", "quest:p018"] as const)
    expect(darkestBossVictoryAfterEncounter(victory(q))).toBe(true);
  const state = victory("quest:p017");
  expect(
    darkestBossVictoryAfterEncounter({
      ...state,
      battle: {
        ...state.battle!,
        entities: [
          ...state.battle!.entities,
          { ...state.battle!.entities[0]!, id: "duplicate", dead: false },
        ],
      },
    }),
  ).toBe(false);
  expect(
    darkestBossVictoryAfterEncounter({
      ...state,
      battle: { ...state.battle!, entities: state.battle!.entities.slice(0, 1) },
    }),
  ).toBe(false);
  expect(
    darkestBossVictoryAfterEncounter({
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((e, i) => (i ? { ...e, dead: false } : e)),
      },
    }),
  ).toBe(false);
  expect(
    darkestBossVictoryAfterEncounter({
      ...state,
      battle: {
        ...state.battle!,
        encounter: { ...state.battle!.encounter!, turn: { type: "finished", outcome: "retreat" } },
      },
    }),
  ).toBe(false);
  expect(
    darkestBossVictoryAfterEncounter({
      ...state,
      battle: {
        ...state.battle!,
        entities: [{ ...monster, monsterCardId: "monster_medium:p063", dead: true }],
      },
    }),
  ).toBe(false);
});

it("只有已胜利、已发XP并完成回村才提供最终战准备计划；数据不能解锁战斗", () => {
  const d = initial.dungeon!;
  expect(readFinalBattlePlanAfterDarkestVictory(d)).toBeUndefined();
  const ready: DungeonState = {
    ...d,
    phase: "inHamlet",
    bossQuestVictory: true,
    questSummary: {
      questId: "quest:p016",
      name: "We Are The Flame",
      clearedRoomIds: [],
      xpPerHero: 3,
      stagecoachXp: 3,
      awarded: true,
    },
    hamletReturn: { phase: "complete" } as NonNullable<DungeonState["hamletReturn"]>,
  };
  const plan = readFinalBattlePlanAfterDarkestVictory(ready)!;
  expect(plan.forms.map((f) => f.id)).toEqual(["ancestor1", "gestatingHeart", "heartOfDarkness"]);
  expect(plan.forms.every((f) => !f.combatReady)).toBe(true);
  expect(
    readFinalBattlePlanAfterDarkestVictory({
      ...ready,
      questSummary: { ...ready.questSummary!, awarded: false },
    }),
  ).toBeUndefined();
  const card = readDarkestBossEncounter("quest:p016")!;
  card.actors.length = 0;
  expect(readDarkestBossEncounter("quest:p016")!.actors).toHaveLength(1);
});
