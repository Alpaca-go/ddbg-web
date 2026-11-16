import type { ApplyResult, GameState, PendingChoice } from "../../../command";
import type { BattleState } from "../../../battle";
import { rejectBattleCommand } from "../../../battle";
import { isQuestProvisionId } from "../../../quest-provisions";
import { PROVISION_LABELS, type ProvisionFace } from "../../../loot";

type Provision = { readonly id: string; readonly face: ProvisionFace };
export type ShriekerTheft = {
  readonly side: "reserve" | "dungeon" | "battle";
  readonly queue: readonly Provision[];
  readonly dungeonPending: PendingChoice | null;
  readonly battlePending: BattleState["pending"];
};

export function shriekerIThreatActive(state: GameState): boolean {
  const d = state.dungeon;
  return (
    d?.shriekerBossBattles === true &&
    (d.campaignLevel ?? 1) === 1 &&
    d.contentPacks?.includes("weald") === true &&
    d.activeBossThreatScriptId === "boss:weald:shrieker:1" &&
    d.imminentThreatDescriptionCardId === "boss_ability:weald:p001" &&
    d.bossCombatThreatCeased !== "boss:weald:shrieker:1"
  );
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
  const choice: PendingChoice = {
    id: `shrieker-theft:${d.decision}`,
    actorId: "party",
    prompt:
      theft.side === "reserve"
        ? "Murder of Magpies：全部补给骰结束，选择弃一枚储备补给"
        : "Where Did It Go?：获得补给后选择弃一枚公共补给",
    options,
  };
  const state = {
    ...result.state,
    dungeon: { ...d, shriekerTheft: theft, pending: choice, decision: d.decision + 1 },
    ...(result.state.battle
      ? { battle: { ...result.state.battle, pending: { type: "shriekerTheft" as const, choice } } }
      : {}),
  };
  return { ...result, state, pendingChoice: choice };
}

/** R-261：只在所有 supply dice（含 Wild 自选）完成后触发一次。 */
export function beginShriekerReserveTheft(result: ApplyResult): ApplyResult {
  if (
    !shriekerIThreatActive(result.state) ||
    !result.state.dungeon?.explorationSetup?.provisions.some((p) => !isQuestProvisionId(p.id))
  )
    return result;
  return present(result, {
    side: "reserve",
    queue: [],
    dungeonPending: result.state.dungeon.pending,
    battlePending: null,
  });
}

/** R-262：命令成功后逐枚加入／弃置；暂存后续获得物，不能提前丢弃尚未获得者。 */
export function beginShriekerDungeonTheft(before: GameState, result: ApplyResult): ApplyResult {
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
  if (theft.queue.length) {
    next = writePool(next, theft.side, [...provisions, theft.queue[0]!]);
    return present({ state: next, events }, { ...theft, queue: theft.queue.slice(1) });
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
  const pending = theft.battlePending?.choice ?? theft.dungeonPending;
  return { state: next, events, ...(pending ? { pendingChoice: pending } : {}) };
}
