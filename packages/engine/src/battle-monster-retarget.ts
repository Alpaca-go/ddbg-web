import { isCollectedVestalCard, isBoneBearerRally } from "./boss/collected-vestal";
import { isPyreCard } from "./boss/pyre-skill";
import { distance, rejectBattleCommand } from "./battle";
import type { BattleEntity, BattleState } from "./battle";
import type { PreparedMonsterAction } from "./battle-monster-action";
import { playMonsterSkill } from "./battle-monster";
import type { ApplyResult, GameEvent, GameState, PendingChoice } from "./command";
import {
  applyEncounterCommand,
  endAfterCasualties,
  finishTurn,
  newlyDefeatedIds,
  removeCasualties,
} from "./encounter";
import { readPrintedRange, readPrintedTargets } from "./hero-skill";
import { readMonsterAttackView } from "./monster-skill";
import type { SkillPrefix } from "./battle-own-effects";

const LEGACY_REFUSAL = "怪物已定目标死亡续接尚未接通";

export type MonsterRetargetPending = {
  readonly type: "monsterRetarget";
  readonly choice: PendingChoice;
  readonly skillPrefix: SkillPrefix | null;
  readonly allTrinkets: true;
};

/** 已定怪物目标、仍存活队友且免费能力已结算后，列出可重选的合法英雄目标（R26、R-048）。 */
export function legalMonsterRetargetHeroIds(
  battle: BattleState,
  action: PreparedMonsterAction,
):
  | { readonly status: "ok"; readonly ids: readonly string[] }
  | { readonly status: "refused"; readonly reason: string } {
  const actor = battle.entities.find((entry) => entry.id === action.actorId);
  const card = battle.monsters?.find((entry) => entry.id === actor?.monsterCardId);
  if (!actor || actor.side !== "monster" || actor.dead || !card)
    return { status: "refused", reason: "怪物或关联卡不可用（R-048）" };
  if (
    isPyreCard(card.id) ||
    isCollectedVestalCard(card.id) ||
    isBoneBearerRally(card.id, action.skillSlot)
  )
    return { status: "refused", reason: "该怪物攻击不支持重选目标（R-048）" };
  const attack = readMonsterAttackView(card, action.skillSlot);
  if (attack.status === "refused") return { status: "refused", reason: attack.reason };
  const range = readPrintedRange(attack.view);
  const targetSpec = readPrintedTargets(attack.view);
  if ((range.kind !== "exact" && range.kind !== "interval") || targetSpec.kind !== "exact")
    return { status: "refused", reason: "重选目标需要已核实射程与目标数量（R-048）" };
  const minRange = range.kind === "exact" ? range.distance : range.min;
  const maxRange = range.kind === "exact" ? range.distance : range.max;
  const actorArea = battle.areas.find((area) => area.id === actor.areaId);
  if (!actorArea) return { status: "refused", reason: "怪物区域无效（R-048）" };
  const heights = { low: 0, normal: 1, high: 2 };
  const living = battle.entities.filter((entry) => entry.side === "hero" && !entry.dead);
  const inRange = (hero: BattleEntity) => {
    const targetArea = battle.areas.find((area) => area.id === hero.areaId);
    if (!targetArea) return false;
    const steps = distance(battle.areas, actor.areaId, hero.areaId);
    const maxWithHigh =
      maxRange + (heights[actorArea.elevation] > heights[targetArea.elevation] ? 1 : 0);
    return steps !== null && steps <= maxWithHigh && steps >= minRange;
  };
  let ids = living.filter(inRange).map((entry) => entry.id);
  if (targetSpec.max > 1) {
    ids = ids.filter((id) => {
      const areaId = living.find((hero) => hero.id === id)!.areaId;
      return living.filter((hero) => hero.areaId === areaId).length >= targetSpec.max;
    });
  }
  return { status: "ok", ids: [...new Set(ids)].sort() };
}

function monsterTargetDeadWithLivingAllies(state: GameState): boolean {
  const battle = state.battle;
  const action = battle?.monsterAction;
  const turn = battle?.encounter?.turn;
  if (turn?.type !== "monster" || !action?.positioned) return false;
  if (!battle!.entities.some((entry) => entry.id === action.targetId && entry.dead)) return false;
  return battle!.entities.some((entry) => entry.side === "hero" && !entry.dead);
}

function skipMonsterAttackAfterDeadTarget(
  state: GameState,
  events: readonly GameEvent[],
  before: BattleState,
): ApplyResult {
  const battle = state.battle!;
  const action = battle.monsterAction!;
  const actor = battle.entities.find((entry) => entry.id === action.actorId)!;
  const card = battle.monsters!.find((entry) => entry.id === actor.monsterCardId)!;
  const skill = card.skills.find((entry) => entry.slot === action.skillSlot)!;
  const removed = removeCasualties({ state, events }, newlyDefeatedIds(before, battle.entities));
  const ended = endAfterCasualties(removed);
  if (ended) return ended;
  const finished = applyEncounterCommand(
    { ...removed.state, battle: { ...removed.state.battle!, monsterAction: null } },
    { type: "finishMonsterTurn", actorId: action.actorId },
  );
  return {
    ...finished,
    events: [
      ...removed.events,
      {
        type: "monsterActionSkipped",
        actorId: action.actorId,
        skillSlot: action.skillSlot,
        selectionRoll: action.selectionRoll,
        skillId: `${card.id}:skill${action.skillSlot}`,
        targetPriority: skill.target ?? "",
        message: "原攻击目标死亡且无合法重选目标，跳过剩余怪物回合（R26）",
      },
      ...finished.events,
    ],
  };
}

function finishFreeTrinketTurn(
  input: ApplyResult,
  before: BattleState,
  turn: NonNullable<BattleState["encounter"]>["turn"],
): ApplyResult {
  const removed = removeCasualties(input, newlyDefeatedIds(before, input.state.battle!.entities));
  const ended = endAfterCasualties(removed);
  if (ended) return ended;
  return turn.type === "hero" &&
    removed.state.battle!.entities.find((entry) => entry.id === turn.actorId)!.dead
    ? finishTurn(removed.state, turn.actorId, removed.events)
    : removed;
}

/** 免费饰品结算后：旧命令无 allTrinkets 仍原子拒绝；新命令打开重选或按无目标收尾。 */
export function finalizeFreeTrinketDuringMonsterTurn(
  original: GameState,
  input: ApplyResult,
  before: BattleState,
  allTrinkets: boolean | undefined,
): ApplyResult {
  const turn = before.encounter!.turn;
  if (!monsterTargetDeadWithLivingAllies(input.state))
    return finishFreeTrinketTurn(input, before, turn);
  if (!allTrinkets) return rejectBattleCommand(original, LEGACY_REFUSAL);
  const battle = input.state.battle!;
  const action = battle.monsterAction!;
  const legal = legalMonsterRetargetHeroIds(battle, action);
  if (legal.status === "refused") return rejectBattleCommand(input.state, legal.reason);
  if (!legal.ids.length) return skipMonsterAttackAfterDeadTarget(input.state, input.events, before);
  const choice: PendingChoice = {
    id: `monster-retarget:${battle.choiceCursor}:${action.actorId}:${action.skillSlot}:${action.targetId}`,
    actorId: action.targetId,
    prompt: "原攻击目标已死亡：选择新的英雄目标（技能与骰序不变）",
    options: legal.ids.map((id) => ({ id, label: id })),
  };
  const pending: MonsterRetargetPending = {
    type: "monsterRetarget",
    choice,
    skillPrefix: battle.skillPrefix ?? null,
    allTrinkets: true,
  };
  return {
    state: {
      ...input.state,
      battle: {
        ...battle,
        choiceCursor: battle.choiceCursor + 1,
        pending,
      },
    },
    events: input.events,
    pendingChoice: choice,
  };
}

export function chooseMonsterRetargetAfterFreeTrinket(
  state: GameState,
  optionId: string,
): ApplyResult {
  const pending = state.battle?.pending;
  if (!pending || pending.type !== "monsterRetarget")
    return rejectBattleCommand(state, "缺少怪物重选目标续接（R-048）");
  if (!pending.choice.options.some((option) => option.id === optionId))
    return rejectBattleCommand(state, "重选目标无效或已过期");
  const action = state.battle!.monsterAction!;
  const legal = legalMonsterRetargetHeroIds(state.battle!, action);
  if (legal.status === "refused") return rejectBattleCommand(state, legal.reason);
  if (!legal.ids.includes(optionId))
    return rejectBattleCommand(state, "所选英雄不是当前技能的合法目标（R-048）");
  const before = state.battle!;
  const updatedAction = { ...action, targetId: optionId };
  let prefix = pending.skillPrefix;
  if (prefix?.command.type === "playMonsterSkill")
    prefix = { ...prefix, command: { ...prefix.command, targetId: optionId } };
  const cleared: GameState = {
    ...state,
    battle: { ...before, pending: null, monsterAction: updatedAction, skillPrefix: prefix },
  };
  const casualties = newlyDefeatedIds(before, cleared.battle!.entities);
  const removed = removeCasualties({ state: cleared, events: [] }, casualties);
  const playCommand = {
    type: "playMonsterSkill" as const,
    actorId: action.actorId,
    targetId: optionId,
    skillSlot: action.skillSlot,
    allTrinkets: pending.allTrinkets,
  };
  const continued = prefix
    ? playMonsterSkill(removed.state, playCommand, prefix)
    : playMonsterSkill(removed.state, playCommand);
  if (continued.events.some((event) => event.type === "commandRefused")) return continued;
  return { ...continued, events: [...removed.events, ...continued.events] };
}

export { LEGACY_REFUSAL };
