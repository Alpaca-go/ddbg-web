import type { BattleState } from "./battle";
import { resolveSkillStress } from "./battle";
import { resolveHeroSkillEffects } from "./hero-skill";
import { resolveMonsterSkillEffects } from "./monster-skill";
import { multiTargetHealthEffects } from "./skill-actor-health";

/** R20、R-031：每个目标保留原骰面 / 数值，按最终区域重建并去重暴击压力。 */
export function correctMultiTargetStress(
  battle: BattleState,
  continuation: Exclude<
    NonNullable<BattleState["shuffleContinuation"]>,
    { type: "heroSkillEmptyAreaResolved" }
  >,
) {
  const critical = continuation.criticalContext!;
  const original = critical.entities;
  const actor = battle.entities.find((e) => e.id === continuation.actorId)!;
  const ids = new Set(continuation.targetIds);
  const nearby = (areaId: string) =>
    battle.entities
      .filter(
        (e) =>
          e.side === "hero" &&
          !e.dead &&
          e.id !== actor.id &&
          !ids.has(e.id) &&
          e.areaId === areaId,
      )
      .map((e) => ({ ...e, stress: original.find((before) => before.id === e.id)!.stress! }));
  const effects =
    continuation.type === "heroSkillResolved"
      ? continuation.criticalContext!.combats!.map((combat) => {
          const target = battle.entities.find((e) => e.id === combat.target.id)!;
          return resolveHeroSkillEffects(
            battle.skills.find((s) => s.id === continuation.resolution.skillId)!,
            {
              ...combat,
              heroesBesideActor: nearby(actor.areaId),
              untargetedHeroesBesideTarget:
                actor.areaId === target.areaId ? [] : nearby(target.areaId),
              targetInActorArea: target.side === "hero" && target.areaId === actor.areaId,
            },
            continuation.roll!,
          );
        })
      : continuation.criticalContext!.combats!.map((combat) => {
          const target = battle.entities.find((e) => e.id === combat.target.id)!;
          const result = resolveMonsterSkillEffects(
            battle.monsters!.find((c) => c.id === actor.monsterCardId)!,
            continuation.skillSlot,
            { ...combat, untargetedHeroesBesideTarget: nearby(target.areaId) },
            continuation.roll,
          );
          return result.status === "resolved"
            ? result
            : {
                resolution: {
                  ...continuation.resolution,
                  status: "refused" as const,
                  reason: result.reason,
                },
                healthEffects: [],
              };
        });
  const results = effects.map((e) => e.resolution);
  const failure = results.find((r) => r.status === "refused");
  if (failure) return { status: "refused" as const, reason: failure.reason! };
  const representative = results.find((r) => r.outcome === "crit") ?? results[0]!;
  return {
    status: "resolved" as const,
    representative,
    deferredHealthEffects: multiTargetHealthEffects(effects).filter((e) => e.deferred),
    entities: battle.entities.map((entity) => {
      const baseline = original.find((e) => e.id === entity.id)!;
      const targetResult = results.find((r) => r.targetId === entity.id);
      const resolution = targetResult
        ? {
            ...targetResult,
            actorStress: representative.actorStress,
            targetStress:
              continuation.type === "heroSkillResolved" &&
              representative.outcome === "crit" &&
              targetResult.outcome !== "crit" &&
              entity.id !== actor.id &&
              entity.areaId === actor.areaId &&
              targetResult.targetStress !== null
                ? Math.max(0, targetResult.targetStress - 1)
                : targetResult.targetStress,
          }
        : representative;
      const nearbyStress = results
        .flatMap((r) => r.untargetedBesideTargetStress ?? [])
        .find((e) => e.id === entity.id && e.stress !== baseline.stress);
      const stress =
        nearbyStress?.stress ??
        resolveSkillStress(baseline, actor.id, resolution.targetId, resolution, false);
      return stress === undefined ? entity : { ...entity, stress };
    }),
  };
}
