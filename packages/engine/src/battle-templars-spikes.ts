import { rejectBattleCommand } from "./battle";
import type { BattleEntity } from "./battle";
import type { ApplyResult, GameEvent, GameState } from "./command";
import type { HeroSkillResolution } from "./hero-skill";
import { resolveAttackDamage } from "./attack-damage";
import { passiveDamageWounds } from "./passive";
import { applySkillHealth } from "./battle-health";
import { applyBattleSkillStatuses } from "./battle-skill-status";
import { resolveBattlePressure } from "./pressure";
import { endAfterCasualties, newlyDefeatedIds, removeCasualties } from "./encounter";

export type TemplarsSpikesTriggerReason = "shuffleIntoSpikes" | "endHeroMoveTurn";

/** 环境原语；不是攻击命令，不产生反击（类比 Spiked Pit）。 */
function templarsSpikesResolution(entity: BattleEntity): HeroSkillResolution {
  return {
    skillId: "area:templarsSpikes",
    targetId: entity.id,
    status: "resolved",
    reason: null,
    outcome: null,
    effect: null,
    printedAmount: null,
    damageDealt: null,
    riposteDamage: null,
    wounds: entity.wounds,
    actorWounds: null,
    targetDead: false,
    targetBleedCleared: false,
    targetBlightCleared: false,
    actorBleedCleared: false,
    actorBlightCleared: false,
    actorShuffle: null,
    targetShuffle: null,
    targetProtectionIgnored: false,
    actorStunMarkCleared: false,
    targetStunMarkCleared: false,
    actorForm: null,
    actorStress: null,
    targetStress: null,
    besideActorStress: null,
    untargetedBesideTargetStress: null,
    skipped: [],
  };
}

function heroStandingOnTemplarsSpikes(state: GameState, entityId: string): boolean {
  const battle = state.battle;
  const entity = battle?.entities.find((e) => e.id === entityId);
  if (!battle || !entity || entity.dead || entity.side !== "hero") return false;
  return !!battle.areas.find((a) => a.id === entity.areaId)?.templarsSpikes;
}

/**
 * R-193：Templars Room 橙星尖刺区（room:p022 / room_tile:p013:front）。
 * 仅对英雄结算；5 伤 + Bleed 3（3t），抗性/免疫走常规栏。
 */
export function applyTemplarsSpikes(
  state: GameState,
  entityId: string,
  context: { readonly reason: TemplarsSpikesTriggerReason; readonly dedupeKey: string },
): ApplyResult | null {
  if (!heroStandingOnTemplarsSpikes(state, entityId)) return null;
  const battle = state.battle!;
  const entity = battle.entities.find((e) => e.id === entityId)!;
  if (!Number.isSafeInteger(entity.life) || entity.life! <= 0)
    return rejectBattleCommand(state, "Templars 尖刺伤害需要已核实 Life（R-048）");
  const key = `${entityId}:${context.reason}:${context.dedupeKey}`;
  if (battle.templarsSpikesResolvedThisTurn?.has(key)) return null;
  const resolution = templarsSpikesResolution(entity);
  const damage = resolveAttackDamage(entity, 5, false, entity.protection === true).damageDealt;
  const health = applySkillHealth(
    battle,
    battle.entities,
    {
      resolution,
      healthEffects:
        damage > 0
          ? [
              {
                entityId,
                side: "hero",
                source: "attack",
                effect: {
                  type: "wounds",
                  amounts: [damage, ...passiveDamageWounds(entity)],
                },
              },
            ]
          : [],
    },
    state.seed,
    battle.rngCursor,
  );
  if (health.status === "refused") return rejectBattleCommand(state, health.reason);
  const pressure = resolveBattlePressure({
    state: {
      ...state,
      battle: {
        ...battle,
        entities: health.entities,
        rngCursor: health.rngCursor,
        templarsSpikesResolvedThisTurn: new Set([
          ...(battle.templarsSpikesResolvedThisTurn ?? []),
          key,
        ]),
      },
    },
    events: [
      {
        type: "passiveTriggered",
        entityId,
        trigger: "templarsSpikes",
        message: `Templars Spikes（${context.reason}）：5 伤，存活后 Bleed 3·3t（R-193）`,
      },
      ...health.events,
    ],
  });
  if (pressure.events.some((event) => event.type === "commandRefused")) return pressure;
  const live = pressure.state.battle!.entities.find((entry) => entry.id === entityId)!;
  if (live.dead) return pressure;
  const statuses = applyBattleSkillStatuses(
    pressure.state.battle!,
    pressure.state.battle!.entities,
    "",
    [{ ...resolution, targetStatusEffects: [{ kind: "bleed", amount: 3, duration: 3 }] }],
    state.seed,
    pressure.state.battle!.rngCursor,
  );
  if (statuses.status === "refused") return rejectBattleCommand(state, statuses.reason);
  return {
    state: {
      ...pressure.state,
      battle: {
        ...pressure.state.battle!,
        entities: statuses.entities,
        rngCursor: statuses.rngCursor,
      },
    },
    events: [...pressure.events, ...statuses.events],
  };
}

/** 英雄回合开始时清除本回合尖刺去重键（新回合可再次结算，R-193）。 */
export function clearTemplarsSpikesTurnTracking(
  battle: NonNullable<GameState["battle"]>,
): NonNullable<GameState["battle"]> {
  if (!battle.templarsSpikesResolvedThisTurn?.size) return battle;
  const { templarsSpikesResolvedThisTurn: _tracked, ...rest } = battle;
  void _tracked;
  return rest;
}

export function finishTurnWithTemplarsSpikes(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
  dedupeKey: string,
): ApplyResult | null {
  const spikes = applyTemplarsSpikes(state, actorId, {
    reason: "endHeroMoveTurn",
    dedupeKey,
  });
  if (!spikes) return null;
  if (spikes.events.some((e) => e.type === "commandRefused")) return spikes;
  const removed = removeCasualties(
    { ...spikes, events: [...events, ...spikes.events] },
    newlyDefeatedIds(state.battle!, spikes.state.battle!.entities),
  );
  return endAfterCasualties(removed) ?? removed;
}
