import { moveMonsterToRange } from "./battle-monster-movement";
import { prepareMonsterAction } from "./battle-monster-action";
import { playMonsterSkill } from "./battle-monster";
import { rejectBattleCommand } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";

export type AutoMonsterTurnCommand = {
  readonly type: "autoMonsterTurn";
  readonly actorId: string;
};

/**
 * Phase 6 / Q-158：中途 Boss 的自动回合。
 * 只组合已有公开步骤：按姿态 d10 选招 → 定位 → 按目标优先级选目标 → 施放。
 * 需要玩家决定的地方（例如怪物落点、位移方向）不替玩家选：原样返回 `pendingChoice`。
 */
export function autoMonsterTurn(state: GameState, command: AutoMonsterTurnCommand): ApplyResult {
  const battle = state.battle;
  const turn = battle?.encounter?.turn;
  if (!battle || turn?.type !== "monster" || turn.actorId !== command.actorId)
    return rejectBattleCommand(state, "自动回合只能由当前怪物回合的使用者发起（R-015）");
  const events: GameEvent[] = [];
  let current = state;

  const action = battle.monsterAction?.actorId === command.actorId ? battle.monsterAction : null;
  if (!action) {
    const prepared = prepareMonsterAction(current, {
      type: "prepareMonsterAction",
      actorId: command.actorId,
    });
    if (prepared.events.some((event) => event.type === "commandRefused")) return prepared;
    events.push(...prepared.events);
    current = prepared.state;
    // 纯自身技能（例如 Mammoth Revivify）在选招时已结算并结束回合。
    if (!current.battle?.monsterAction) return { state: current, events };
    if (current.battle.pending)
      return { state: current, events, pendingChoice: current.battle.pending.choice };
  }

  const selected = current.battle!.monsterAction!;
  if (!selected.positioned) {
    const moved = moveMonsterToRange(current, {
      type: "moveMonsterToRange",
      actorId: command.actorId,
    });
    if (moved.events.some((event) => event.type === "commandRefused")) return moved;
    events.push(...moved.events);
    current = moved.state;
    if (current.battle?.pending)
      return { state: current, events, pendingChoice: current.battle.pending.choice };
  }

  const action2 = current.battle!.monsterAction;
  if (!action2) return rejectBattleCommand(current, "自动回合缺少已保存的选招 / 目标（R-015）");
  const played = playMonsterSkill(current, {
    type: "playMonsterSkill",
    actorId: command.actorId,
    skillSlot: action2.skillSlot,
    targetId: action2.targetId,
  });
  return {
    state: played.state,
    events: [...events, ...played.events],
    ...(played.pendingChoice ? { pendingChoice: played.pendingChoice } : {}),
  };
}
