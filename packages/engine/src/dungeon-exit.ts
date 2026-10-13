import type { ApplyResult, GameState } from "./command";

/** R14：探索阶段、掷骰前，全员同意离开；不能跳过已开始的结算。 */
export function canLeaveDungeon(state: GameState): boolean {
  const d = state.dungeon;
  return !!(
    d &&
    !state.battle &&
    !d.pending &&
    !d.heroes.some((h) => h.dead) &&
    d.layout.nodes.some((n) => n.id === d.position) &&
    (d.phase === "ready" ||
      (d.phase === "awaitingHazards" && d.exploration && !d.exploration.rolls))
  );
}

export function leaveDungeon(
  state: GameState,
  command:
    | { readonly type: "leaveDungeon" }
    | { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon!;
  const refuse = (): ApplyResult => ({
    state,
    events: [{ type: "commandRefused", message: "离开须在探索掷骰前且全员同意（R14）" }],
  });
  if (command.type === "leaveDungeon") {
    if (!canLeaveDungeon(state)) return refuse();
    const pending = {
      id: `dungeon-exit:${d.decision}`,
      prompt: "离开地牢需要全员同意；按已完成目标结算，任务 XP 与回村接口尚未接线（R14）",
      options: [
        { id: "agree", label: "全员同意离开" },
        { id: "decline", label: "取消离开" },
      ],
    };
    return {
      state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending } },
      events: [{ type: "dungeonUpdated", message: "等待全员同意离开；未移动、未掷骰" }],
      pendingChoice: pending,
    };
  }
  if (
    !d.pending?.id.startsWith("dungeon-exit:") ||
    command.choiceId !== d.pending.id ||
    !d.pending.options.some((o) => o.id === command.optionId) ||
    !canLeaveDungeon({ ...state, dungeon: { ...d, pending: null } })
  )
    return refuse();
  const agreed = command.optionId === "agree";
  return {
    state: { ...state, dungeon: { ...d, pending: null, phase: agreed ? "exited" : d.phase } },
    events: [
      {
        type: "dungeonUpdated",
        message: agreed
          ? `全员同意：从 ${d.position} 离开地牢；保留金币与英雄状态，等待任务 XP / 回村接口（R14）`
          : "取消离开，恢复原探索窗口；未消耗骰子或补给",
      },
    ],
  };
}
