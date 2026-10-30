import type { ApplyResult, GameState } from "../command";
import { distance, rejectBattleCommand, skillTargetView } from "../battle";
import { fixedDamageResolution } from "../battle-spiked-pit";
import { resolveAttackDamage } from "../attack-damage";
import { passiveDamageWounds } from "../passive";
import { applySkillHealth } from "../battle-health";
import { applyBattleSkillStatuses } from "../battle-skill-status";
import { defenceTrinketReaction } from "../trinket-reactions";
import { finishTurn, endAfterCasualties, removeCasualties, newlyDefeatedIds } from "../encounter";
import { resolveBattlePressure } from "../pressure";

export function isPyreCard(id: string | undefined): boolean {
  return ["monster_large:p011", "monster_large:p012", "monster_large:p013"].includes(id ?? "");
}

/** 本聊天裁定：自动命中、不掷攻击骰；99 Damage 仍经防护、被动和死门。 */
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
  const skill = card?.skills[0];
  const signature = skill?.effect_lines.map((l) =>
    l
      .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s/g, ""),
  );
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
    slot !== 1 ||
    skill?.target !== "Closest" ||
    signature?.length !== 1 ||
    signature[0] !== "{damage}99" ||
    skill.printed_labels.length ||
    distance(b.areas, actor.areaId, target.areaId) !== 0 ||
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
  const damage = resolveAttackDamage(view, 99, false, target.protection === true, defence.halve);
  const riposte = target.riposte ? Math.ceil(damage.beforeProtection / 2) : 0;
  const resolution = {
    ...fixedDamageResolution(target, `${card.id}:skill1`),
    outcome: "hit" as const,
    printedAmount: 99,
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
        message: `${actorId} Burn the Heretic：同区自动命中，99 Damage，无攻击骰`,
      },
      ...health.events,
      ...status.events,
    ],
  });
  if (pressure.events.some((e) => e.type === "commandRefused")) return pressure;
  const removed = removeCasualties(pressure, newlyDefeatedIds(b, pressure.state.battle!.entities));
  return endAfterCasualties(removed) ?? finishTurn(removed.state, actorId, removed.events);
}
