import { resolveHeroHealth, resolveSeededHeroHealth } from "./hero-health";
import type { HeroHealthState, HeroHealthResolution } from "./hero-health";
import type { SkillEffectsResolution, SkillHealthEffect } from "./hero-skill";

export type SkillHeroHealth = HeroHealthState & { readonly id: string };
export type SkillHeroHealthResult =
  | { readonly status: "refused"; readonly reason: string; readonly rngCursor: number }
  | {
      readonly status: "resolved";
      readonly heroes: readonly SkillHeroHealth[];
      readonly rngCursor: number;
      readonly steps: readonly {
        readonly effect: SkillHealthEffect;
        readonly resolution: Extract<HeroHealthResolution, { status: "resolved" }>;
      }[];
    };

/**
 * R20 自身效果先结算，R21 伤害 / 反击，R29 生命与死门，R-005 / R-048。
 * 输入为已结算技能的效果视图与已核实英雄生命；cursor 是技能骰之后的游标。
 * 只消费真正需要的死门骰。不写战斗、姿态、Shuffle 或回合，也不判战役失败。
 */
export function resolveSkillHeroHealth(
  skill: SkillEffectsResolution,
  heroes: readonly SkillHeroHealth[],
  seed: number,
  rngCursor: number,
): SkillHeroHealthResult {
  const refuse = (reason: string): SkillHeroHealthResult => ({
    status: "refused",
    reason,
    rngCursor,
  });
  if (skill.resolution.status !== "resolved")
    return refuse(skill.resolution.reason ?? "技能未完成结算");
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(rngCursor) || rngCursor < 0)
    return refuse("种子 / RNG 游标无效");
  const states = new Map<string, SkillHeroHealth>();
  for (const hero of heroes) {
    if (!hero.id || states.has(hero.id)) return refuse("英雄生命身份缺失或重复");
    const validation = resolveHeroHealth(hero, { type: "heal", amount: 0 });
    if (validation.status !== "resolved")
      return refuse(validation.status === "refused" ? validation.reason : "英雄生命状态无效");
    states.set(hero.id, { ...hero });
  }
  const steps: Extract<SkillHeroHealthResult, { status: "resolved" }>["steps"][number][] = [];
  let cursor = rngCursor;
  for (const effect of skill.healthEffects) {
    // 怪物生命仍由既有技能结果结算，不能误用英雄死门。
    if (effect.side === "monster") continue;
    if (effect.side !== "hero") return refuse("生命效果阵营无效");
    const hero = states.get(effect.entityId);
    if (!hero) return refuse("缺少生命效果接收者的已核实 Life（R-048）");
    // 本次技能已令其死亡并移除；后续反弹不能再次伤害或复活该英雄（R9、R24–25）。
    if (hero.dead) {
      const validation = resolveHeroHealth({ ...hero, dead: false }, effect.effect);
      if (validation.status === "refused") return refuse(validation.reason);
      continue;
    }
    const result = resolveSeededHeroHealth(hero, effect.effect, seed, cursor);
    if (result.status !== "resolved")
      return refuse(result.status === "refused" ? result.reason : "死门骰未完成");
    cursor = result.rngCursor;
    states.set(hero.id, { ...hero, ...result.state });
    steps.push({ effect, resolution: result });
  }
  return { status: "resolved", heroes: [...states.values()], rngCursor: cursor, steps };
}
