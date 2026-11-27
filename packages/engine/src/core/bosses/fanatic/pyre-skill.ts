import { BURN_THE_HERETIC, isPyreCard } from "../../../../../data/src/core/bosses/fanatic/pyre";
export { isPyreCard } from "../../../../../data/src/core/bosses/fanatic/pyre";
import type { ApplyResult, GameState } from "../../../shared/core/command";
import { distance, rejectBattleCommand, skillTargetView } from "../../../shared/battle/battle";
import { fixedDamageResolution } from "../../../shared/battle/battle-fixed-damage";
import { resolveAttackDamage } from "../../../shared/core/attack-damage";
import { passiveDamageWounds } from "../../../shared/core/passive";
import { applySkillHealth } from "../../../shared/battle/battle-health";
import { applyBattleSkillStatuses } from "../../../shared/battle/battle-skill-status";
import { defenceTrinketReaction } from "../../../shared/trinkets/trinket-reactions";
import {
  finishTurn,
  endAfterCasualties,
  removeCasualties,
  newlyDefeatedIds,
} from "../../../shared/dungeon/encounter";
import { resolveBattlePressure } from "../../../shared/core/pressure";

/** R-136：自动命中、不掷攻击骰；99 Damage 仍经防护、被动和死门（R-048 卡面字段）。 */
export function playPyreSkill(
  state: GameState,
  actorId: string,
  targetId: string,
  slot: number,
): ApplyResult {
  const b = state.battle!;
  const actor = b.entities.find((e) => e.id === actorId),
    target = b.entities.find((e) => e.id === targetId);
  const card = b.monsters?.find((c) => c.id === actor?.monsterCardId);
  const rule = BURN_THE_HERETIC;
  const skill = card?.skills.find(({ slot }) => slot === rule.slot);
  if (
    !actor ||
    actor.dead ||
    !target ||
    target.dead ||
    target.side !== "hero" ||
    !card ||
    !isPyreCard(card.id) ||
    card.verification.unverified ||
    actor.life !== card.life ||
    slot !== rule.slot ||
    skill?.target !== rule.target ||
    distance(b.areas, actor.areaId, target.areaId) !== rule.range ||
    b.encounter?.turn.type !== "monster" ||
    b.encounter.turn.actorId !== actorId
  )
    return rejectBattleCommand(state, "Pyre 自动命中缺完整核图卡或同区英雄目标（R-048）");
  if (
    b.monsterAction &&
    (b.monsterAction.actorId !== actorId ||
      b.monsterAction.targetId !== targetId ||
      b.monsterAction.skillSlot !== slot)
  )
    return rejectBattleCommand(state, "Pyre 必须使用已保存目标");
  const defence = b.trinketRuntime
    ? defenceTrinketReaction(b, targetId, null, null, "hit")
    : { halve: false, statuses: [] };
  const view = skillTargetView(target, b);
  const damage = resolveAttackDamage(
    view,
    rule.damage,
    false,
    target.protection === true,
    defence.halve,
  );
  const riposte = target.riposte ? Math.ceil(damage.beforeProtection / 2) : 0;
  const resolution = {
    ...fixedDamageResolution(target, `${card.id}:skill1`),
    outcome: "hit" as const,
    printedAmount: rule.damage,
    damageDealt: damage.damageDealt,
    riposteDamage: riposte,
    targetTrinketStatusEffects: defence.statuses,
  };
  const entities = b.entities.map((e) =>
    e.id === actorId && riposte
      ? { ...e, wounds: e.wounds + riposte, dead: e.wounds + riposte >= card.life }
      : e,
  );
  const health = applySkillHealth(
    b,
    entities,
    {
      resolution,
      healthEffects: [
        {
          entityId: targetId,
          side: "hero",
          source: "attack",
          effect: { type: "wounds", amounts: [damage.damageDealt, ...passiveDamageWounds(view)] },
        },
      ],
    },
    state.seed,
    b.rngCursor,
    actorId,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const status = applyBattleSkillStatuses(
    b,
    health.entities,
    actorId,
    [resolution],
    state.seed,
    health.rngCursor,
  );
  if (status.status === "refused") return rejectBattleCommand(state, status.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: { ...b, entities: status.entities, rngCursor: status.rngCursor, monsterAction: null },
    },
    events: [
      {
        type: "dungeonUpdated",
        message: `${actorId} Burn the Heretic：同区自动命中，${rule.damage} Damage，无攻击骰`,
      },
      ...health.events,
      ...status.events,
    ],
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(pressure, newlyDefeatedIds(b, pressure.state.battle!.entities));
  return endAfterCasualties(removed) ?? finishTurn(removed.state, actorId, removed.events);
}
