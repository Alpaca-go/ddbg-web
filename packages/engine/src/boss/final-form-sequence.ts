import type { ApplyResult, GameState } from "../command";
import { rejectBattleCommand } from "../battle";
import { readFinalBattlePlanAfterDarkestVictory } from "./darkest-content";

export type FinalFormId = "ancestor1" | "ancestor2" | "gestatingHeart" | "heartOfDarkness";
export type FinalFormSequence = {
  readonly completedForms: readonly FinalFormId[];
  readonly status: "awaitingDeployment" | "fighting" | "complete";
};

/** 已部署且处于 inBattle；仍保留 hamletReturn 供形态计划读取，但须放行遭遇战命令。 */
export function finalBattleCombatActive(state: GameState): boolean {
  const d = state.dungeon;
  return (
    d?.finalFormSequence?.status === "fighting" &&
    d.phase === "inBattle" &&
    state.battle !== undefined
  );
}

/** 进度只能是任务派生形态序列的前缀；不能跳过Heart或调换形态。 */
export function readFinalFormSequence(state: GameState) {
  const d = state.dungeon,
    progress = d?.finalFormSequence;
  const plan = d && readFinalBattlePlanAfterDarkestVictory(d);
  if (!plan || !progress || !Array.isArray(progress.completedForms)) return undefined;
  const forms = plan.forms;
  if (
    progress.completedForms.length > forms.length ||
    progress.completedForms.some((id, i) => id !== forms[i]?.id) ||
    !["awaitingDeployment", "fighting", "complete"].includes(progress.status) ||
    (progress.status === "complete") !== (progress.completedForms.length === forms.length)
  )
    return undefined;
  return { ...plan, progress, current: forms[progress.completedForms.length] };
}

/** 仅建立形态流程，仍等待获批部署；不伪造BattleState。 */
export function prepareFinalBattleForms(state: GameState): ApplyResult {
  const d = state.dungeon;
  if (
    !d ||
    state.battle ||
    d.pending ||
    d.finalBattleProvisions !== "ready" ||
    d.finalFormSequence ||
    !d.hamlet?.finalPreparation ||
    d.hamlet.phase !== "preparationComplete" ||
    !readFinalBattlePlanAfterDarkestVictory(d)
  )
    return rejectBattleCommand(state, "须完成最终战补给后准备形态流程，不能重复或跳过准备（R36）");
  return {
    state: {
      ...state,
      dungeon: { ...d, finalFormSequence: { completedForms: [], status: "awaitingDeployment" } },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: "最终战形态流程已建立；等待已核实Boss与房间部署，不开始战斗（R36、R-048）",
      },
    ],
  };
}

/** R36/R-035：真实本形态胜利后暂停，保留同一战场及全部英雄状态。 */
export function finishFinalBattleForm(state: GameState): ApplyResult {
  const d = state.dungeon,
    b = state.battle,
    sequence = readFinalFormSequence(state);
  const turn = b?.encounter?.turn;
  const bosses =
    b?.entities.filter(
      (e) => e.side === "monster" && e.monsterCardId === sequence?.current?.actor.cardId,
    ) ?? [];
  if (
    !d ||
    !b ||
    !sequence?.current ||
    sequence.progress.status !== "fighting" ||
    d.finalBattleProvisions !== "ready" ||
    d.pending ||
    b.pending ||
    d.deathTrinketChoice ||
    b.shuffleIntents?.length ||
    turn?.type !== "finished" ||
    turn.outcome !== "victory" ||
    !bosses.length ||
    bosses.some((e) => !e.dead) ||
    !b.entities.some((e) => e.side === "hero" && !e.dead)
  )
    return rejectBattleCommand(
      state,
      "须确认当前最终战形态实际被击败；不能凭普通战胜利推进（R36）",
    );
  const completedForms = [...sequence.progress.completedForms, sequence.current.id];
  const complete = completedForms.length === sequence.forms.length;
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        finalFormSequence: {
          completedForms,
          status: complete ? "complete" : "awaitingDeployment",
        },
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: complete
          ? "Heart of Darkness已击败，最终战全部形态完成（R36）"
          : "当前形态已击败，战斗暂停等待下一形态部署；不休息、不恢复、不重排姿态（R36、R-035）",
      },
    ],
  };
}
