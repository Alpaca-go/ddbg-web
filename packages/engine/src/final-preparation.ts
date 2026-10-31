import type { ApplyResult, GameState } from "./command";
import { rejectBattleCommand } from "./battle";
import { readFinalBattlePlanAfterDarkestVictory } from "./boss/darkest-content";

/** R36：最后一次村庄固定四天，不抽取、洗牌或消费村庄事件。 */
export function beginFinalPreparation(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.pending ||
    d.hamlet ||
    d.heroes.length !== 4 ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    d.heroes.some((h) => h.dead) ||
    !readFinalBattlePlanAfterDarkestVictory(d)
  )
    return rejectBattleCommand(state, "须完成最暗Boss胜利、XP与回村后开始最后四天准备（R36）");
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        hamlet: {
          deck: [...(d.hamletMemory?.deck ?? [])],
          permanentlyRemoved: [...(d.hamletMemory?.permanentlyRemoved ?? [])],
          active: null,
          last: "",
          finalPreparation: true,
          phase: "awaitingCaretaker",
          preparationDays: 4,
          remainingDays: 4,
          day: 1,
          noCaretaker: false,
          extraBlock: false,
          caretaker: null,
          blockedBuildings: [],
          heroOrder: [],
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: "最后村庄阶段：固定准备4天，不抽村庄事件；按日进行看守人与英雄行动（R36）",
      },
    ],
  };
}

/** 只准备最终战补给；不生成未获批Boss，不清除已完成任务历史。 */
export function beginFinalBattleProvisions(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.pending ||
    d.finalBattleProvisions ||
    !d.hamlet?.finalPreparation ||
    d.hamlet.phase !== "preparationComplete" ||
    d.hamlet.remainingDays !== 0 ||
    d.hamlet.preparationDays !== 4 ||
    !readFinalBattlePlanAfterDarkestVictory(d) ||
    !d.explorationSetup ||
    d.explorationSetup.provisions.length ||
    d.startingProvisionChoices?.length ||
    d.nextQuestProvisionFaceChoice ||
    d.nextQuestLostShipment ||
    !Number.isSafeInteger(d.cursor) ||
    d.cursor < 0 ||
    d.heroes.some((h) => h.dead)
  )
    return rejectBattleCommand(state, "须完成最后四天准备且补给池为空，才能准备最终战补给（R36）");
  return {
    state: { ...state, dungeon: { ...d, finalBattleProvisions: "awaiting" } },
    events: [
      {
        type: "dungeonUpdated",
        message: "最终战前仍掷补给；补给结算完成后等待最终战部署，不进入探索（R36）",
      },
    ],
  };
}
