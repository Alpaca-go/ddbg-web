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
