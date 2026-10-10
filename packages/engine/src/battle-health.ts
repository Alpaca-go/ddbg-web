import type { BattleEntity, BattleState } from "./battle";
import type { GameEvent } from "./command";
import type { SkillEffectsResolution } from "./hero-skill";
import { resolveSkillHeroHealth } from "./skill-hero-health";

/** R20、R29：生命以原实体和有序效果结算，不从净伤口差倒推。 */
export function applySkillHealth(
  battle: BattleState,
  entities: readonly BattleEntity[],
  skill: SkillEffectsResolution,
  seed: number,
  rngCursor: number,
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly entities: readonly BattleEntity[];
      readonly rngCursor: number;
      readonly events: readonly GameEvent[];
    } {
  // 保留旧无 Life 测试沙盒；它不代表完整的英雄生命规则。
  if (!battle.entities.some((entry) => entry.side === "hero" && entry.life !== undefined))
    return { status: "resolved", entities, rngCursor, events: [] };
  const ids = new Set(
    skill.healthEffects.filter((effect) => effect.side === "hero").map((effect) => effect.entityId),
  );
  const heroes = battle.entities.filter((entry) => ids.has(entry.id));
  if (heroes.some((entry) => entry.side !== "hero" || entry.life === undefined))
    return { status: "refused", reason: "生命效果接收者缺少已核实 Life（R-048）" };
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
  return {
    status: "resolved",
    entities: entities.map((entry) => {
      const health = result.heroes.find((hero) => hero.id === entry.id);
      return health ? { ...entry, wounds: health.wounds, dead: health.dead } : entry;
    }),
    rngCursor: result.rngCursor,
    events: result.steps.map((step) => ({
      type: "heroHealthResolved",
      message: "已按有序生命效果结算英雄伤口与死门",
      entityId: step.effect.entityId,
      effect: step.effect.effect,
      resolution: step.resolution,
    })),
  };
}
