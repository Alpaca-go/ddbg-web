import { passiveHeal } from "./passive";
import { healingTrinketReaction, damageTrinketReaction } from "./trinket-reactions";
import type { BattleEntity, BattleState } from "./battle";
import type { GameEvent } from "./command";
import type { SkillEffectsResolution } from "./hero-skill";
import { healingForbidden } from "./battle-healing";
import { resolveSkillHeroHealth } from "./skill-hero-health";
import { triggerBattlePassive } from "./battle-passive";

/** R20、R29：生命以原实体和有序效果结算，不从净伤口差倒推。 */
export function applySkillHealth(
  battle: BattleState,
  entities: readonly BattleEntity[],
  skill: SkillEffectsResolution,
  seed: number,
  rngCursor: number,
  actorId?: string,
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly entities: readonly BattleEntity[];
      readonly rngCursor: number;
      readonly events: readonly GameEvent[];
      readonly cancelled?: true;
    } {
  const originalEffects = skill.healthEffects;
  const prevented = new Set(
    originalEffects
      .filter(
        (e) =>
          e.side === "hero" &&
          e.effect.type === "heal" &&
          (healingForbidden(battle, e.entityId) ||
            (e.source === "targetHeal" && healingForbidden(battle, actorId))),
      )
      .map((e) => e.entityId),
  );
  skill = {
    ...skill,
    healthEffects: originalEffects.filter(
      (e) => !(e.side === "hero" && e.effect.type === "heal" && prevented.has(e.entityId)),
    ),
  };
  if (battle.trinketRuntime)
    skill = {
      ...skill,
      healthEffects: skill.healthEffects.map((e) =>
        e.side !== "hero"
          ? e
          : e.effect.type === "heal"
            ? {
                ...e,
                effect: {
                  ...e.effect,
                  amount: (() => {
                    const amount = healingTrinketReaction(
                      battle,
                      e.source === "selfHeal" ? e.entityId : actorId,
                      e.entityId,
                      e.rawHealing ?? (e.effect.type === "heal" ? e.effect.amount : 0),
                    );
                    return e.rawHealing === undefined
                      ? amount
                      : passiveHeal(
                          battle.entities.find((h) => h.id === e.entityId)!,
                          amount,
                        );
                  })(),
                },
              }
            : ["attack", "riposte"].includes(e.source)
              ? {
                  ...e,
                  effect: {
                    ...e.effect,
                    amounts: damageTrinketReaction(battle, e.entityId, e.effect.amounts),
                  },
                }
              : e,
      ),
    };
  const preventionEvents: GameEvent[] = [...prevented].map((entityId) => ({
    type: "healingPrevented",
    entityId,
    message: "Unholy Aura：技能附带治疗已阻止（R-067）",
  }));
  // R-069：有序生命效果先结算，技能收尾再为存活英雄处理压力10。
  // 保留旧无 Life 测试沙盒；它不代表完整的英雄生命规则。
  if (!battle.entities.some((entry) => entry.side === "hero" && entry.life !== undefined))
    return prevented.size
      ? { status: "refused", reason: "禁疗接收者缺已核实 Life（R-048）" }
      : { status: "resolved", entities, rngCursor, events: [] };
  const ids = new Set(
    originalEffects.filter((effect) => effect.side === "hero").map((effect) => effect.entityId),
  );
  let heroes = battle.entities.filter((entry) => ids.has(entry.id));
  if (heroes.some((entry) => entry.side !== "hero" || entry.life === undefined))
    return { status: "refused", reason: "生命效果接收者缺少已核实 Life（R-048）" };
  const rollEffects = skill.healthEffects.filter((e) => e.rollPassive);
  const rollEvents: GameEvent[] = [];
  if (rollEffects.length) {
    const rolled = resolveSkillHeroHealth(
      { ...skill, healthEffects: rollEffects },
      heroes.map((h) => ({ id: h.id, life: h.life!, wounds: h.wounds, dead: h.dead })),
      seed,
      rngCursor,
    );
    if (rolled.status === "refused") return rolled;
    rngCursor = rolled.rngCursor;
    heroes = heroes.map((h) => ({ ...h, ...rolled.heroes.find((e) => e.id === h.id)! }));
    rollEvents.push(
      ...rolled.steps.map((step): GameEvent => ({
        type: "heroHealthResolved",
        entityId: step.effect.entityId,
        effect: step.effect.effect,
        resolution: step.resolution,
        message: "Bad Gambler：掷出 10，技能效果前结算伤口（R26）",
      })),
    );
    if (rollEffects.some((e) => heroes.find((h) => h.id === e.entityId)?.dead))
      return {
        status: "resolved",
        cancelled: true,
        rngCursor,
        events: rollEvents,
        entities: battle.entities.map((e) => heroes.find((h) => h.id === e.id) ?? e),
      };
    skill = { ...skill, healthEffects: skill.healthEffects.filter((e) => !e.rollPassive) };
  }
  const result = resolveSkillHeroHealth(
    skill,
    heroes.map((entry) => ({
      id: entry.id,
      life: entry.life!,
      wounds: entry.wounds,
      dead: entry.dead,
    })),
    seed,
    rngCursor,
  );
  if (result.status === "refused") return result;
  let next: BattleState = {
    ...battle,
    rngCursor: result.rngCursor,
    entities: entities.map((entry) => {
      const health = result.heroes.find((hero) => hero.id === entry.id);
      return health ? { ...entry, wounds: health.wounds, dead: health.dead } : entry;
    }),
  };
  const passiveEvents: GameEvent[] = [];
  for (const effect of skill.healthEffects) {
    if (
      effect.side !== "hero" ||
      !["attack", "riposte"].includes(effect.source) ||
      effect.effect.type !== "wounds" ||
      !effect.effect.amounts[0]
    )
      continue;
    for (const trigger of [
      "damageTaken" as const,
      ...(effect.critical ? ["criticalDamage" as const] : []),
    ]) {
      const applied = triggerBattlePassive(next, seed, [effect.entityId], trigger, {
        omitStress: effect.critical === true,
      });
      if (applied.status === "refused") return applied;
      next = applied.battle;
      passiveEvents.push(...applied.events);
    }
  }
  return {
    status: "resolved",
    entities: next.entities,
    rngCursor: next.rngCursor,
    events: [
      ...preventionEvents,
      ...rollEvents,
      ...result.steps.map((step): GameEvent => ({
        type: "heroHealthResolved",
        message: "已按有序生命效果结算英雄伤口与死门",
        entityId: step.effect.entityId,
        effect: step.effect.effect,
        resolution: step.resolution,
      })),
      ...passiveEvents,
    ],
  };
}
