import { runTrinketCommand } from "./trinket-reactions";
import type { ApplyResult, Command, GameState, PendingChoice } from "./command";
import type { BattleState } from "./battle";
import { rejectBattleCommand } from "./battle";
import { finishTurn } from "./encounter";
import { finishQuestProvisionFlow } from "./dungeon-starting-provisions";
import { isQuestProvisionId } from "./quest-provisions";
import { PROVISION_FACES, PROVISION_LABELS } from "./loot";

export type InventoryOverflowResume =
  | { readonly type: "result" }
  | { readonly type: "finishTurn"; readonly actorId: string }
  | { readonly type: "questProvisionFlow" };
export type InventoryOverflowHold = {
  readonly location: "battle" | "dungeon";
  readonly choice: PendingChoice;
  readonly resume: InventoryOverflowResume;
  readonly battlePending: BattleState["pending"];
  readonly dungeonPending: PendingChoice | null;
  readonly pendingChoice?: PendingChoice;
};
export function withInventoryOverflow(state: GameState): GameState {
  return {
    ...state,
    inventoryOverflow: true,
    ...(state.trinketChoice
      ? {
          trinketChoice: {
            ...state.trinketChoice,
            original: {
              ...state.trinketChoice.original,
              inventoryOverflow: true,
              ...(state.trinketChoice.original.dungeon
                ? { dungeon: { ...state.trinketChoice.original.dungeon, inventoryOverflow: true } }
                : {}),
            },
          },
        }
      : {}),
    ...(state.dungeon ? { dungeon: { ...state.dungeon, inventoryOverflow: true } } : {}),
  };
}

/** R-266：全部取得后，从新旧补给共同选择弃置；任务道具仍遵循不可弃置限制。 */
export function settleInventoryOverflow(
  result: ApplyResult,
  resume: InventoryOverflowResume = { type: "result" },
): ApplyResult {
  const state = result.state;
  if (
    !state.inventoryOverflow ||
    state.inventoryOverflowHold ||
    result.events.some((e) => e.type === "commandRefused")
  )
    return result;
  // Wild 先选齐骰面，再比较全部所得，不重复掷骰。
  if (
    result.pendingChoice?.options.length &&
    result.pendingChoice.options.every((o) =>
      PROVISION_FACES.includes(o.id as (typeof PROVISION_FACES)[number]),
    )
  )
    return result;
  const location = state.battle ? "battle" : "dungeon";
  const pool =
    location === "battle" ? state.battle?.provisions : state.dungeon?.explorationSetup?.provisions;
  if (!pool || pool.length <= 16) return result;
  if (new Set(pool.map((p) => p.id)).size !== pool.length)
    return rejectBattleCommand(state, "超额补给实例重复，不能丢弃（R-048）");
  const decision = state.inventoryOverflowDecision ?? 0;
  const choice: PendingChoice = {
    id: `inventory-overflow:${decision}`,
    prompt: `已取得全部补给：${pool.length}/16，选择丢弃 ${pool.length - 16} 颗超额补给`,
    options: pool
      .filter((p) => !isQuestProvisionId(p.id))
      .map((p, i) => ({
        id: p.id,
        label: `丢弃${PROVISION_LABELS[p.face]}（${i + 1}）`,
      })),
  };
  if (!choice.options.length) return rejectBattleCommand(state, "没有可丢弃的普通补给（R-205）");
  return {
    state: {
      ...state,
      inventoryOverflowDecision: decision + 1,
      inventoryOverflowHold: {
        location,
        choice,
        resume,
        battlePending: state.battle?.pending ?? null,
        dungeonPending: state.dungeon?.pending ?? null,
        ...(result.pendingChoice ? { pendingChoice: result.pendingChoice } : {}),
      },
      ...(location === "battle"
        ? { battle: { ...state.battle!, pending: { type: "inventoryOverflow", choice } } }
        : { dungeon: { ...state.dungeon!, pending: choice } }),
    },
    events: result.events,
    pendingChoice: choice,
  };
}
export function chooseInventoryOverflow(state: GameState, command: Command): ApplyResult {
  const hold = state.inventoryOverflowHold!;
  if (
    command.type !== "resolveChoice" ||
    command.choiceId !== hold.choice.id ||
    !hold.choice.options.some((o) => o.id === command.optionId)
  )
    return rejectBattleCommand(state, "请先选择丢弃超出容量的补给（R-266）");
  const pool =
    hold.location === "battle"
      ? state.battle?.provisions
      : state.dungeon?.explorationSetup?.provisions;
  if (!pool || pool.length <= 16 || !pool.some((p) => p.id === command.optionId))
    return rejectBattleCommand(state, "超额补给选择已失效");
  const provisions = pool.filter((p) => p.id !== command.optionId);
  const { inventoryOverflowHold: _hold, ...base } = state;
  void _hold;
  const next: GameState =
    hold.location === "battle"
      ? { ...base, battle: { ...state.battle!, provisions, pending: hold.battlePending } }
      : {
          ...base,
          dungeon: {
            ...state.dungeon!,
            pending: hold.dungeonPending,
            explorationSetup: { ...state.dungeon!.explorationSetup!, provisions },
          },
        };
  const result: ApplyResult = {
    state: next,
    events: [
      {
        type: "dungeonUpdated",
        message: `补给超额：丢弃 ${PROVISION_LABELS[pool.find((p) => p.id === command.optionId)!.face]}（R-266）`,
      },
    ],
    ...(hold.pendingChoice ? { pendingChoice: hold.pendingChoice } : {}),
  };
  if (provisions.length > 16) return settleInventoryOverflow(result, hold.resume);
  if (hold.resume.type === "finishTurn") {
    const resumed = finishInventoryOverflowTurn(
      { ...next, inventoryOverflowTurn: hold.resume.actorId },
      command,
    );
    return { ...resumed, events: [...result.events, ...resumed.events] };
  }
  if (hold.resume.type === "questProvisionFlow")
    return finishQuestProvisionFlow(next, [...result.events]);
  return result;
}

/** 最后一行动的拾取，弃置完成才结束回合；保留既有饰品待选重试机制。 */
export function finishInventoryOverflowTurn(state: GameState, command: Command): ApplyResult {
  return runTrinketCommand(state, command, (current) => {
    const { inventoryOverflowTurn: actorId, ...ready } = current;
    if (!actorId) return rejectBattleCommand(current, "补给超额后的回合续接缺失");
    return finishTurn(ready, actorId, []);
  });
}
