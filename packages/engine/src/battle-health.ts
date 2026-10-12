import type { BattleEntity, BattleState } from "./battle";
import type { GameEvent } from "./command";
import type { SkillEffectsResolution } from "./hero-skill";
import { resolveSkillHeroHealth } from "./skill-hero-health";
import { triggerBattlePassive } from "./battle-passive";
import { hasDisease, hasQuirk, passiveStress } from "./passive";

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
  skill = { ...skill, healthEffects: skill.healthEffects.filter((e) => !e.deferred) };
  const actor = battle.entities.find((e) => e.id === actorId && e.side === "hero");
  if (actor && skill.resolution.actorShuffle && hasDisease(actor, "Vertigo")) {
    const shiftedStress = passiveStress(actor, 2, battle.light);
    if (
      (actor.stress ?? 0) + shiftedStress.amount >= 10 ||
      (shiftedStress.wounds.length > 0 &&
        (actor.wounds === actor.life ||
          skill.healthEffects.some((e) => e.source === "riposte" && e.entityId === actor.id)))
    )
      return {
        status: "refused",
        reason:
          "自身位移的疾病被动必须先于攻击 / 反击完成生命或意志收尾；该复合续接尚未实现（R20），整次未提交",
      };
  }
  if (skill.healthEffects.some((e) => e.pressureBoundary))
    return { status: "refused", reason: "压力被动的伤口 / 压力10复合顺序待 Q-66 确认" };
  // 保留旧无 Life 测试沙盒；它不代表完整的英雄生命规则。
  if (!battle.entities.some((entry) => entry.side === "hero" && entry.life !== undefined))
    return { status: "resolved", entities, rngCursor, events: [] };
  const ids = new Set(
    skill.healthEffects.filter((effect) => effect.side === "hero").map((effect) => effect.entityId),
  );
  let heroes = battle.entities.filter((entry) => ids.has(entry.id));
  if (heroes.some((entry) => entry.side !== "hero" || entry.life === undefined))
    return { status: "refused", reason: "生命效果接收者缺少已核实 Life（R-048）" };
  for (const effect of skill.healthEffects) {
    const hero = battle.entities.find((e) => e.id === effect.entityId);
    if (
      effect.source === "attack" &&
      effect.critical &&
      hero &&
      (hasQuirk(hero, "Off Guard") || hasQuirk(hero, "Weak Grip")) &&
      (battle.light <= 2 ||
        hasQuirk(hero, "Nervous") ||
        hasQuirk(hero, "Soft") ||
        hasDisease(hero, "The Worries"))
    )
      return { status: "refused", reason: "同次暴击附加压力的事件合并待 Q-67 确认，整次未提交" };
  }
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
      const applied = triggerBattlePassive(next, seed, [effect.entityId], trigger);
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
