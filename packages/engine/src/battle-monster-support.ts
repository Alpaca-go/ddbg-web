import { distance, rejectBattleCommand } from "./battle";
import type { ApplyResult, GameState } from "./command";
import { finishTurn } from "./encounter";
import { resolveDarkestMonsterSupport } from "./darkest-monster-support";
import { addStatusStack, statusProjection, type StatusEffect } from "./status";
import { applyBattleShuffles } from "./battle-shuffle";

export type MonsterSupportResolvedEvent = {
  readonly type: "monsterSupportResolved";
  readonly actorId: string;
  readonly targetId: string;
  readonly skillSlot: number;
  readonly heal: number;
  readonly statuses: readonly StatusEffect[];
  readonly message: string;
};

/** 已核实的最暗友方技能；目标与选招仍由印刷数据决定（R20/R24、R-048）。 */
export function isDarkestSupportSkill(cardId: string | undefined, slot: number): boolean {
  return (
    (cardId === "monster_medium:p069" && slot === 2) ||
    (cardId === "monster_medium:p086" && (slot === 1 || slot === 2))
  );
}

export function playDarkestSupportSkill(
  state: GameState,
  actorId: string,
  targetId: string,
  slot: number,
): ApplyResult {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId);
  const target = b.entities.find((e) => e.id === targetId);
  const card = b.monsters?.find((c) => c.id === actor?.monsterCardId);
  const action = b.monsterAction;
  if (
    !actor ||
    actor.side !== "monster" ||
    actor.dead ||
    !card ||
    actor.life !== card.life ||
    actor.wounds >= card.life ||
    !isDarkestSupportSkill(card.id, slot) ||
    !target ||
    target.side !== "monster" ||
    target.dead ||
    (target.life !== undefined && target.wounds >= target.life) ||
    b.encounter?.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId ||
    (action &&
      (action.actorId !== actorId || action.targetId !== targetId || action.skillSlot !== slot))
  )
    return rejectBattleCommand(state, "最暗友方技能需要当前怪物回合与存活友方目标（R-048）");
  const origin = b.areas.find((a) => a.id === actor.areaId);
  const destination = b.areas.find((a) => a.id === target.areaId);
  const steps = distance(b.areas, actor.areaId, target.areaId);
  if (!origin || !destination || steps === null)
    return rejectBattleCommand(state, "最暗友方目标区域不可达（R-048）");
  const heights = { low: 0, normal: 1, high: 2 };
  const result = resolveDarkestMonsterSupport(card, slot, {
    targetSide: "monster",
    targetWounds: target.wounds,
    areaDistance: steps,
    targetAreaLower: heights[origin.elevation] > heights[destination.elevation],
    ...(actor.shuffleResist === undefined ? {} : { actorShuffleResist: actor.shuffleResist }),
  });
  if (result.status === "refused") return rejectBattleCommand(state, result.reason);
  const event: MonsterSupportResolvedEvent = {
    type: "monsterSupportResolved",
    actorId,
    targetId,
    skillSlot: slot,
    heal: target.wounds - result.targetWounds,
    statuses: result.targetStatusEffects,
    message: `${actorId} → ${targetId}：已结算友方治疗/增益，无攻击骰（R20/R24）`,
  };
  const next = { ...state, battle: { ...b, monsterAction: null } };
  if (!result.actorShuffle?.distance) return completeMonsterSupport(next, event);
  const moved = applyBattleShuffles({
    ...next,
    battle: {
      ...next.battle,
      shuffleContinuation: event,
      shuffleIntents: [{ entityId: actorId, relativeToId: targetId, move: result.actorShuffle }],
    },
  });
  if (moved.events.some((e) => e.type === "commandRefused"))
    return rejectBattleCommand(state, "最暗友方技能自身位移无法完整结算（R-048）");
  return moved;
}

/** R20：自身位移结束后才应用目标效果；分岔存档续接不重复治疗。 */
export function completeMonsterSupport(
  state: GameState,
  event: MonsterSupportResolvedEvent,
): ApplyResult {
  const b = state.battle!;
  const target = b.entities.find((e) => e.id === event.targetId);
  if (!target || target.dead) return finishTurn(state, event.actorId, []);
  let stacks = target.statusStacks ?? [];
  for (const effect of event.statuses) {
    const added = addStatusStack(stacks, effect, "target", { resistances: [], immunities: [] });
    if (added.status === "refused") return rejectBattleCommand(state, added.reason);
    stacks = added.stacks;
  }
  const entities = b.entities.map((e) =>
    e.id === target.id
      ? {
          ...e,
          wounds: Math.max(0, e.wounds - event.heal),
          statusStacks: stacks,
          ...statusProjection(stacks, e.innateProtection),
        }
      : e,
  );
  return finishTurn({ ...state, battle: { ...b, entities } }, event.actorId, [event]);
}
