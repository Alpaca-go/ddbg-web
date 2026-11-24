import type { SkillHealthEffect } from "./hero-skill";

/** R20–21：自身治疗只一次，每名实际受伤目标的 Riposte 分别累计。 */
export function multiTargetHealthEffects(
  effects: readonly { readonly healthEffects: readonly SkillHealthEffect[] }[],
): readonly SkillHealthEffect[] {
  const seen = new Set<string>();
  return effects.flatMap((e, index) =>
    e.healthEffects.filter((effect) => {
      if (effect.source === "passiveStress") {
        const key = `${effect.entityId}:${effect.passiveKey}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return index === 0 || !["selfHeal", "selfWound"].includes(effect.source);
    }),
  );
}

/** 怪物不掷死门骰；英雄稍后由有序生命层覆盖此伤口投影。 */
export function projectActorWounds(
  id: string,
  wounds: number,
  effects: readonly SkillHealthEffect[],
): number {
  return effects
    .filter((e) => e.entityId === id)
    .reduce(
      (total, e) =>
        e.effect.type === "heal"
          ? Math.max(0, total - e.effect.amount)
          : total + e.effect.amounts.reduce((sum, amount) => sum + amount, 0),
      wounds,
    );
}
