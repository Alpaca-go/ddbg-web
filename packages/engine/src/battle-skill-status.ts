import type { BattleEntity, BattleState } from "./battle";
import type { HeroSkillResolution } from "./hero-skill";
import { addStatusStack, STATUS_KINDS, statusProjection } from "./status";
import type { StatusEffect, StatusKind } from "./status";

/** 自身只施加一次；目标逐个施加。调用方先以 probe 验证，再在生命结果上应用。 */
export function applyBattleSkillStatuses(
  battle: BattleState,
  entities: readonly BattleEntity[],
  actorId: string,
  resolutions: readonly HeroSkillResolution[],
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly entities: readonly BattleEntity[];
      readonly light: number;
    } {
  let next = [...entities];
  const apply = (
    id: string,
    effects: readonly StatusEffect[],
    scope: "self" | "target",
  ): string | null => {
    if (!effects.length) return null;
    const entity = next.find((entry) => entry.id === id);
    if (!entity) return "状态效果接收者不存在";
    if (entity.dead) return null;
    if (
      entity.statusStacks === undefined &&
      (entity.bleed.length ||
        entity.blight.length ||
        entity.buffStacks ||
        entity.debuffStacks ||
        entity.markStacks ||
        entity.guard ||
        entity.riposte ||
        (entity.protection && !entity.innateProtection))
    )
      return "已有状态缺少 duration，不能伪造堆叠迁移（R-048）";
    let resistances: StatusKind[] = [];
    let immunities: StatusKind[] = [];
    if (scope === "target") {
      const hero = battle.heroStats?.find((entry) => entry.id === entity.heroStatId);
      const buff = hero?.verified_buff_defence;
      if (entity.side === "hero") {
        if (
          !hero?.attributesVerified ||
          !buff ||
          buff.source !== "print_front" ||
          typeof buff.resistant !== "boolean" ||
          typeof buff.immune !== "boolean" ||
          effects.some((effect) => effect.kind !== "buff")
        )
          return "英雄目标缺少该状态的已核实抗性 / 免疫栏（R-048）";
        resistances = buff.resistant ? ["buff"] : [];
        immunities = buff.immune ? ["buff"] : [];
      } else {
        const card = battle.monsters?.find((entry) => entry.id === entity.monsterCardId);
        if (
          entity.side !== "monster" ||
          card?.verification.unverified !== false ||
          card.resistances === undefined ||
          card.immunities === undefined
        )
          return "目标缺少已核实抗性 / 免疫栏（R-048）";
        const read = (icons: NonNullable<typeof card.resistances>): StatusKind[] | null => {
          const kinds: StatusKind[] = [];
          for (const icon of icons) {
            const kind = STATUS_KINDS.find(
              (kind) => icon.key === kind || icon.key === `${kind}_resist`,
            );
            if (!kind || !["confirmed", "confirmed_rulebook"].includes(icon.naming)) return null;
            kinds.push(kind);
          }
          return kinds;
        };
        const resistance = read(card.resistances);
        const immunity = read(card.immunities);
        if (resistance === null || immunity === null)
          return "目标抗性 / 免疫图标未确认或未支持（R-048）";
        resistances = resistance;
        immunities = immunity;
      }
    }
    let stacks = entity.statusStacks ?? [];
    for (const effect of effects) {
      const applied = addStatusStack(stacks, effect, scope, { resistances, immunities });
      if (applied.status === "refused") return applied.reason;
      stacks = applied.stacks;
    }
    next = next.map((entry) =>
      entry.id === id
        ? { ...entry, statusStacks: stacks, ...statusProjection(stacks, entry.innateProtection) }
        : entry,
    );
    return null;
  };
  const selfProblem = apply(actorId, resolutions[0]?.actorStatusEffects ?? [], "self");
  if (selfProblem) return { status: "refused", reason: selfProblem };
  for (const resolution of resolutions) {
    const problem = apply(resolution.targetId, resolution.targetStatusEffects ?? [], "target");
    if (problem) return { status: "refused", reason: problem };
  }
  let light = Math.max(0, Math.min(5, battle.light + (resolutions[0]?.actorLightDelta ?? 0)));
  for (const resolution of resolutions)
    light = Math.max(0, Math.min(5, light + (resolution.targetLightDelta ?? 0)));
  return { status: "resolved", entities: next, light };
}
