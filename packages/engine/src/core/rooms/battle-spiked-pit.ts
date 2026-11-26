import { rejectBattleCommand } from "../../shared/battle/battle";
import type { ApplyResult, GameEvent, GameState } from "../../shared/core/command";
import { resolveAttackDamage } from "../../shared/core/attack-damage";
import { passiveDamageWounds } from "../../shared/core/passive";
import { fixedDamageResolution } from "../../shared/battle/battle-fixed-damage";
import { applySkillHealth } from "../../shared/battle/battle-health";
import { applyBattleSkillStatuses } from "../../shared/battle/battle-skill-status";
import { resolveBattlePressure } from "../../shared/core/pressure";
import {
  endAfterCasualties,
  newlyDefeatedIds,
  removeCasualties,
} from "../../shared/dungeon/encounter";

/** R-065/067/069/071/072：实际落点／回合结束站立；完整坑效果先于Vertigo。 */
export function applySpikedPit(state: GameState, entityId: string): ApplyResult | null {
  const battle = state.battle;
  const entity = battle?.entities.find((entry) => entry.id === entityId);
  const area = battle?.areas.find((a) => a.id === entity?.areaId);
  if (
    !battle ||
    !entity ||
    entity.dead ||
    !area?.spikedPit ||
    (area.spikedPitHeroesOnly && entity.side !== "hero")
  )
    return null;
  if (!Number.isSafeInteger(entity.life) || entity.life! <= 0)
    return rejectBattleCommand(state, "Spiked Pit伤害需要已核实Life（R-048）");
  const resolution = fixedDamageResolution(entity, "area:spikedPit");
  const damage = resolveAttackDamage(entity, 3, false, entity.protection === true).damageDealt;
  const entities =
    entity.side === "monster"
      ? battle.entities.map((entry) =>
          entry.id === entityId
            ? {
                ...entry,
                wounds: entry.wounds + damage,
                dead: entry.wounds + damage >= entry.life!,
              }
            : entry,
        )
      : battle.entities;
  const health = applySkillHealth(
    battle,
    entities,
    {
      resolution,
      healthEffects:
        damage > 0
          ? [
              {
                entityId,
                side: entity.side,
                source: "attack",
                effect: {
                  type: "wounds",
                  amounts: [damage, ...(entity.side === "hero" ? passiveDamageWounds(entity) : [])],
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
      battle: { ...battle, entities: health.entities, rngCursor: health.rngCursor },
    },
    events: [
      {
        type: "passiveTriggered",
        entityId,
        trigger: "spikedPit",
        message: "Spiked Pit：伤害3，存活后施加Bleed 1·3t（R-071/072）",
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
    [{ ...resolution, targetStatusEffects: [{ kind: "bleed", amount: 1, duration: 3 }] }],
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

export function endTurnSpikedPit(
  state: GameState,
  actorId: string,
  events: readonly GameEvent[],
): ApplyResult | null {
  const battle = state.battle!,
    actor = battle.entities.find((entry) => entry.id === actorId)!;
  if (actor.dead) return null;
  const area = battle.areas.find((area) => area.id === actor.areaId);
  if (actor.side === "monster" && area?.circleOfPower) {
    const amount = area.circleOfPowerHeal ?? 4;
    return {
      state: {
        ...state,
        battle: {
          ...battle,
          entities: battle.entities.map((entry) =>
            entry.id === actorId ? { ...entry, wounds: Math.max(0, entry.wounds - amount) } : entry,
          ),
        },
      },
      events: [
        ...events,
        {
          type: "passiveTriggered",
          entityId: actorId,
          trigger: "circleOfPower",
          message: `Circle of Power：怪物在本区结束回合治疗${amount}（R-065/067）`,
        },
      ],
    };
  }
  const pit = applySpikedPit(state, actorId);
  if (!pit) return null;
  if (pit.events.some((event) => event.type === "commandRefused")) return pit;
  const removed = removeCasualties(
    { ...pit, events: [...events, ...pit.events] },
    newlyDefeatedIds(battle, pit.state.battle!.entities),
  );
  return endAfterCasualties(removed) ?? removed;
}
