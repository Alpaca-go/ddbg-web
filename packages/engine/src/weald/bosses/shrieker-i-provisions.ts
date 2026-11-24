import {
  settleInventoryOverflow,
  type InventoryOverflowResume,
} from "../../shared/core/inventory-overflow";
import { finishTurn } from "../../shared/dungeon/encounter";
import { readShriekerRuntimeContext } from "./shrieker-runtime-context";
import type { ApplyResult, GameState, PendingChoice } from "../../shared/core/command";
import type { BattleState } from "../../shared/battle/battle";
import { rejectBattleCommand } from "../../shared/battle/battle";
import { isQuestProvisionId } from "../../shared/quest/quest-provisions";
import { PROVISION_LABELS, type ProvisionFace } from "../../shared/trinkets/loot";
import { activeBossThreatMatchesDungeonLocation } from "../../core/bosses/threat-campaign";

type Provision = { readonly id: string; readonly face: ProvisionFace };
export type ShriekerTheft = {
  readonly remainingDiscards?: number;
  readonly discardsPerGain?: number;
  readonly finishTurnActorId?: string;
  readonly side: "reserve" | "dungeon" | "battle";
  readonly queue: readonly Provision[];
  readonly dungeonPending: PendingChoice | null;
  readonly battlePending: BattleState["pending"];
};

export function shriekerIThreatActive(state: GameState): boolean {
  const d = state.dungeon;
  return (
    !!d &&
    activeBossThreatMatchesDungeonLocation(d) &&
    d.shriekerBossBattles === true &&
    (d.campaignLevel ?? 1) === 1 &&
    d.contentPacks?.includes("weald") === true &&
    d.activeBossThreatScriptId === "boss:weald:shrieker:1" &&
    d.imminentThreatDescriptionCardId === "boss_ability:weald:p001" &&
    d.bossCombatThreatCeased !== "boss:weald:shrieker:1"
  );
}

/** R-268：仅显式高等级版本读取新威胁；战斗面翻开后立即停用。R-273：跨地点任务不生效。 */
export function shriekerHigherThreatLevel(state: GameState): 2 | 3 | null {
  const d = state.dungeon;
  if (!d || !activeBossThreatMatchesDungeonLocation(d)) return null;
  const c = readShriekerRuntimeContext(state);
  return c && c.level !== 1 && d.bossCombatThreatCeased !== c.scriptId ? c.level : null;
}
/** 获取与容量先后顺序在同一入口控制；旧 I 级仍走原钩子。 */
export function beginHigherShriekerGain(
  before: GameState,
  result: ApplyResult,
  resume: InventoryOverflowResume = { type: "result" },
): ApplyResult {
  const level = shriekerHigherThreatLevel(before);
  if (
    !level ||
    result.state.dungeon?.shriekerTheft ||
    result.events.some((e) => e.type === "commandRefused") ||
    ["awaitingProvisions", "inHamlet"].includes(before.dungeon!.phase) ||
    !!before.battle !== !!result.state.battle ||
    !result.state.dungeon?.explorationSetup
  )
    return result;
  const side = result.state.battle ? "battle" : "dungeon";
  const old = new Set(pool(before, side).map((p) => p.id));
  const gained = pool(result.state, side).filter(
    (p) => !old.has(p.id) && !isQuestProvisionId(p.id),
  );
  if (!gained.length) return result;
  const hidden = new Set((level === 2 ? gained : gained.slice(1)).map((p) => p.id));
  const state = writePool(
    result.state,
    side,
    pool(result.state, side).filter((p) => !hidden.has(p.id)),
  );
  if (level === 2) return { ...result, state };
  const theft: ShriekerTheft = {
    side,
    queue: gained.slice(1),
    remainingDiscards: 2,
    discardsPerGain: 2,
    dungeonPending: state.dungeon!.pending,
    battlePending: state.battle?.pending ?? null,
    ...(resume.type === "finishTurn" ? { finishTurnActorId: resume.actorId } : {}),
  };
  return stageHigherTheft({ ...result, state }, theft);
}
function stageHigherTheft(result: ApplyResult, theft: ShriekerTheft): ApplyResult {
  const state = { ...result.state, dungeon: { ...result.state.dungeon!, shriekerTheft: theft } };
  const overflow = settleInventoryOverflow({ ...result, state }, { type: "shriekerTheft" });
  return overflow.state.inventoryOverflowHold ? overflow : present(overflow, theft);
}
export function resumeShriekerAfterOverflow(result: ApplyResult): ApplyResult {
  return present(result, result.state.dungeon!.shriekerTheft!);
}

function pool(state: GameState, side: ShriekerTheft["side"]): readonly Provision[] {
  return side === "battle"
    ? (state.battle!.provisions ?? [])
    : state.dungeon!.explorationSetup!.provisions;
}
function writePool(
  state: GameState,
  side: ShriekerTheft["side"],
  provisions: readonly Provision[],
): GameState {
  return side === "battle"
    ? { ...state, battle: { ...state.battle!, provisions } }
    : {
        ...state,
        dungeon: {
          ...state.dungeon!,
          explorationSetup: { ...state.dungeon!.explorationSetup!, provisions },
        },
      };
}
function present(result: ApplyResult, theft: ShriekerTheft): ApplyResult {
  const d = result.state.dungeon!;
  const options = pool(result.state, theft.side)
    .filter((p) => !isQuestProvisionId(p.id))
    .map((p) => ({ id: p.id, label: PROVISION_LABELS[p.face] }));
  if (!options.length) return result;
  const cursor = theft.side === "battle" ? result.state.battle!.choiceCursor : d.decision;
  const choice: PendingChoice = {
    id: `shrieker-theft:${cursor}`,
    actorId: "party",
    prompt:
      theft.side === "reserve"
        ? "Murder of Magpies：全部补给骰结束，选择弃一枚储备补给"
        : "Where Did It Go?：获得补给后选择弃一枚公共补给",
    options,
  };
  const state = {
    ...result.state,
    dungeon: {
      ...d,
      shriekerTheft: theft,
      pending: choice,
      decision: theft.side === "battle" ? d.decision : cursor + 1,
    },
    ...(result.state.battle
      ? {
          battle: {
            ...result.state.battle,
            choiceCursor: theft.side === "battle" ? cursor + 1 : result.state.battle.choiceCursor,
            pending: { type: "shriekerTheft" as const, choice },
          },
        }
      : {}),
  };
  return { ...result, state, pendingChoice: choice };
}

/** R-261：只在所有 supply dice（含 Wild 自选）完成后触发一次。 */
export function beginShriekerReserveTheft(result: ApplyResult): ApplyResult {
  const higher = shriekerHigherThreatLevel(result.state);
  if (higher === 3) return result;
  if (
    !(shriekerIThreatActive(result.state) || higher === 2) ||
    !result.state.dungeon?.explorationSetup?.provisions.some((p) => !isQuestProvisionId(p.id))
  )
    return result;
  return present(result, {
    side: "reserve",
    queue: [],
    ...(higher === 2 ? { remainingDiscards: 3 } : {}),
    dungeonPending: result.state.dungeon.pending,
    battlePending: null,
  });
}

/** R-262：命令成功后逐枚加入／弃置；暂存后续获得物，不能提前丢弃尚未获得者。 */
export function beginShriekerDungeonTheft(before: GameState, result: ApplyResult): ApplyResult {
  if (shriekerHigherThreatLevel(before)) return beginHigherShriekerGain(before, result);
  if (
    !shriekerIThreatActive(before) ||
    result.events.some((e) => e.type === "commandRefused") ||
    result.state.dungeon?.shriekerTheft ||
    before.dungeon?.phase === "awaitingProvisions" ||
    before.dungeon?.phase === "inHamlet"
  )
    return result;
  if (!!before.battle !== !!result.state.battle) return result;
  const side = result.state.battle ? "battle" : "dungeon";
  if (!result.state.dungeon?.explorationSetup) return result;
  const oldIds = new Set(pool(before, side).map((p) => p.id));
  const gained = pool(result.state, side).filter(
    (p) => !oldIds.has(p.id) && !isQuestProvisionId(p.id),
  );
  if (!gained.length) return result;
  const queuedIds = new Set(gained.slice(1).map((p) => p.id));
  const state = writePool(
    result.state,
    side,
    pool(result.state, side).filter((p) => !queuedIds.has(p.id)),
  );
  return present(
    { ...result, state },
    {
      side,
      queue: gained.slice(1),
      dungeonPending: result.state.dungeon.pending,
      battlePending: result.state.battle?.pending ?? null,
    },
  );
}

export function chooseShriekerTheft(
  state: GameState,
  choiceId: string,
  optionId: string,
  resumeReserve: (state: GameState) => ApplyResult,
): ApplyResult {
  const d = state.dungeon,
    theft = d?.shriekerTheft;
  if (
    !d ||
    !theft ||
    d.pending?.id !== choiceId ||
    !d.pending.options.some((o) => o.id === optionId) ||
    isQuestProvisionId(optionId)
  )
    return rejectBattleCommand(state, "Shrieker 弃补给选择失效（R-262）");
  const provisions = pool(state, theft.side).filter((p) => p.id !== optionId);
  if (provisions.length === pool(state, theft.side).length)
    return rejectBattleCommand(state, "补给不在公共池");
  let next = writePool(state, theft.side, provisions);
  const events = [
    { type: "dungeonUpdated" as const, message: `Shrieker：玩家弃置 ${optionId}（R-261／R-262）` },
  ];
  if ((theft.remainingDiscards ?? 1) > 1 && provisions.some((p) => !isQuestProvisionId(p.id)))
    return present(
      { state: next, events },
      { ...theft, remainingDiscards: theft.remainingDiscards! - 1 },
    );
  if (theft.queue.length) {
    next = writePool(next, theft.side, [...provisions, theft.queue[0]!]);
    const queued = {
      ...theft,
      queue: theft.queue.slice(1),
      ...(theft.discardsPerGain ? { remainingDiscards: theft.discardsPerGain } : {}),
    };
    return theft.discardsPerGain
      ? stageHigherTheft({ state: next, events }, queued)
      : present({ state: next, events }, queued);
  }
  const { shriekerTheft: _theft, ...rest } = next.dungeon!;
  void _theft;
  next = {
    ...next,
    dungeon: { ...rest, pending: theft.dungeonPending },
    ...(next.battle ? { battle: { ...next.battle, pending: theft.battlePending } } : {}),
  };
  if (theft.side === "reserve") {
    const result = resumeReserve(next);
    return { ...result, events: [...events, ...result.events] };
  }
  if (theft.finishTurnActorId) return finishTurn(next, theft.finishTurnActorId, events);
  const pending = theft.battlePending?.choice ?? theft.dungeonPending;
  return { state: next, events, ...(pending ? { pendingChoice: pending } : {}) };
}
