import type { ApplyResult, GameState } from "./command";
import type { DungeonCommand } from "./dungeon";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { triggerDungeonPassive } from "./dungeon-passive";

const refuse = (state: GameState, message: string): ApplyResult => ({
  state,
  events: [{ type: "commandRefused", message }],
});

/** R14：R-068：每条已走过的边独立收费，含起点、灰点与岔路换边。 */
export function applyDungeonBacktracking(
  state: GameState,
  command:
    | DungeonCommand
    | { readonly type: "resolveChoice"; readonly choiceId: string; readonly optionId: string },
): ApplyResult {
  const d = state.dungeon!;
  if (d.phase !== "ready" || d.heroes.some((h) => h.dead))
    return refuse(state, "先完成当前结算 / 英雄替换，才能原路返回");
  const routes = d.layout.edges
    .flatMap(([a, b]) => (a === d.position ? [b] : b === d.position ? [a] : []))
    .filter(
      (id) =>
        d.layout.nodes.some((n) => n.id === d.position && n.kind !== "unresolved") &&
        d.layout.nodes.some((n) => n.id === id && n.kind !== "unresolved") &&
        (d.visited ?? []).includes(id) &&
        d.traversedCorridors?.some(
          ([a, b]) => (a === d.position && b === id) || (b === d.position && a === id),
        ),
    );
  if (command.type === "beginDungeonBacktrack") {
    if (d.pending) return refuse(state, "请先完成待选决定");
    if (!routes.length) return refuse(state, "没有已走过的相邻边可原路返回（R-068）");
    const pending = {
      id: `dungeon-backtrack:${d.decision}`,
      prompt: "原路返回：不掷探索骰，每名英雄压力 +1（R14）",
      options: [
        ...routes.map((id) => ({ id, label: `返回 ${id}（全员压力 +1）` })),
        { id: "cancel", label: "取消返回" },
      ],
    };
    return {
      state: { ...state, dungeon: { ...d, decision: d.decision + 1, pending } },
      events: [{ type: "dungeonUpdated", message: "等待选择原路返回，尚未支付压力" }],
      pendingChoice: pending,
    };
  }
  if (
    command.type !== "resolveChoice" ||
    !d.pending?.id.startsWith("dungeon-backtrack:") ||
    command.choiceId !== d.pending.id ||
    !d.pending.options.some((o) => o.id === command.optionId) ||
    (command.optionId !== "cancel" && !routes.includes(command.optionId))
  )
    return refuse(state, "返回选择不存在、已过期或路线无效");
  if (command.optionId === "cancel")
    return {
      state: { ...state, dungeon: { ...d, pending: null } },
      events: [{ type: "dungeonUpdated", message: "取消返回，未支付压力" }],
    };
  if (d.heroes.some((h) => !Number.isInteger(h.stress) || h.stress < 0 || h.stress > 9))
    return refuse(state, "英雄压力无效，保持返回选择");
  const passive = triggerDungeonPassive(
    d,
    state.seed,
    d.heroes.map((h) => h.id),
    { type: "stress", amount: 1 },
  );
  if (passive.status === "refused") return refuse(state, passive.reason);
  const paid: GameState = {
    ...state,
    dungeon: {
      ...passive.dungeon,
      pending: null,
      exploration: null,
      backtracking: { from: d.position, to: command.optionId },
      pressureSource: "backtracking",
      phase: "blockedPressure",
    },
  };
  const next = paid.dungeon!.heroes.some((h) => h.dead)
    ? {
        state: { ...paid, dungeon: { ...paid.dungeon!, phase: "awaitingReplacement" as const } },
        events: [],
      }
    : paid.dungeon!.heroes.some((h) => h.stress === 10)
      ? resolveDungeonPressure(paid)
      : completeDungeonBacktrack(paid);
  return {
    ...next,
    events: [
      ...passive.events,
      {
        type: "dungeonUpdated",
        message: "沿一条图上边返回，全员压力 +1；没有掷探索骰（R14、R-068）",
      },
      ...next.events,
    ],
  };
}

/** 压力恢复只完成已支付的返回，不重扣、不送侦察揭示或减骰。 */
export function completeDungeonBacktrack(state: GameState): ApplyResult {
  const d = state.dungeon!;
  if (!d.backtracking || d.position !== d.backtracking.from)
    return refuse(state, "缺失返回续接位置，保持停点");
  const to = d.backtracking.to;
  const node = d.layout.nodes.find((n) => n.id === to);
  if (!node || node.kind === "unresolved") return refuse(state, "返回节点缺失或未核实");
  const room = node.kind === "room" ? d.rooms.find((r) => r.id === to) : undefined;
  if (node.kind === "room" && !room) return refuse(state, "返回房间代币记录缺失");
  const cleared = !!room && (room.cleared || room.kind === "empty");
  return {
    state: {
      ...state,
      dungeon: {
        ...d,
        position: to,
        mustLeaveRoomId: undefined,
        phase: !room || cleared ? "ready" : "awaitingRoom",
        pending: null,
        backtracking: null,
        visited: [...new Set([...(d.visited ?? []), to])],
        rooms: d.rooms.map((r) =>
          r.id === to ? { ...r, revealed: true, ...(cleared ? { cleared: true } : {}) } : r,
        ),
      },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: !room
          ? `已返回 ${to}：${node.kind === "start" ? "起点" : "灰点"}；本边压力已支付，无房间效果（R-068）`
          : cleared
            ? `已返回 ${to}：无房间代币，不重复发奖励；侦察减骰仍留给下一次探索（R14–15）`
            : `已返回 ${to}：等待 ${room!.kind} 房间效果，未清理代币（R15）`,
      },
    ],
  };
}
