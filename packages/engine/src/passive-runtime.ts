import { resolveSeededHeroHealth } from "./hero-health";
import { addStatusStack, statusProjection } from "./status";
import type { StatusEffect, StatusKind, StatusStack } from "./status";
import {
  hasDisease,
  hasQuirk,
  passiveLevel,
  passiveDuration,
  passiveHeal,
  passivePlan,
  passiveStress,
} from "./passive";
import type { PassiveHolder, PassiveTrigger } from "./passive";
import type { GameEvent } from "./command";
import type { ProvisionFace } from "./loot";

export type PassiveHero = PassiveHolder & {
  readonly id: string;
  readonly dead?: boolean;
  readonly life?: number;
  readonly wounds?: number;
  readonly stress?: number;
  readonly statusStacks?: readonly StatusStack[];
  readonly innateProtection?: boolean;
};
export type PassiveDefence = {
  readonly resistances: readonly StatusKind[];
  readonly immunities: readonly StatusKind[];
};
export type PassiveInput =
  | PassiveTrigger
  | { readonly type: "stress"; readonly amount: number; readonly woundAmounts?: readonly number[] };
export function applyPassiveStatus<T extends PassiveHero>(
  hero: T,
  effect: StatusEffect,
  scope: "self" | "target",
  defence?: PassiveDefence,
):
  | { status: "refused"; reason: string }
  | { status: "resolved"; hero: T; wounds: readonly number[] } {
  if (scope === "target" && !defence)
    return { status: "refused", reason: "被动状态缺少获批完整抗性 / 免疫（R-048）" };
  let stacks = hero.statusStacks ?? [];
  const wounds: number[] = [],
    triggered = new Set<string>();
  const queue = [{ effect, scope }];
  while (queue.length) {
    const item = queue.shift()!;
    if (item.scope === "target" && !defence)
      return { status: "refused", reason: "追加状态缺少获批完整抗性 / 免疫（R-063、R-048）" };
    const duration = passiveDuration(hero, item.effect);
    if (duration <= 0) continue;
    const applied = addStatusStack(
      stacks,
      { ...item.effect, duration },
      item.scope,
      defence ?? { resistances: [], immunities: [] },
    );
    if (applied.status === "refused") return applied;
    const added = applied.stacks.length > stacks.length;
    stacks = applied.stacks;
    if (!added) continue;
    const bleed = item.effect.kind === "bleed",
      blight = item.effect.kind === "blight";
    if (!bleed && !blight) continue;
    for (const [name, present, duration, wound] of [
      ["quirk", hasQuirk(hero, bleed ? "Anemic" : "Thin Blooded"), 3, false],
      ["disease", hasDisease(hero, bleed ? "Hemophilia" : "Black Plague"), 2, true],
    ] as const) {
      const key = `${name}:${item.effect.kind}`;
      if (!present || triggered.has(key)) continue;
      triggered.add(key);
      queue.push({ effect: { kind: item.effect.kind, duration, amount: 1 }, scope: "target" });
      if (wound) wounds.push(2 * passiveLevel(hero));
    }
  }
  return {
    status: "resolved",
    hero: { ...hero, statusStacks: stacks, ...statusProjection(stacks, hero.innateProtection) },
    wounds,
  };
}
/** 调用方发送实际原因；不从净压力 / 伤口差推断事件。R-002 / R-026。 */
export function applyPassiveHero<T extends PassiveHero>(
  original: T,
  input: PassiveInput,
  seed: number,
  cursor: number,
  light: number,
  provisions: readonly { readonly id: string; readonly face: ProvisionFace }[] = [],
  defence?: PassiveDefence,
  options: {
    readonly probe?: boolean;
    readonly healingForbidden?: boolean;
    readonly omitStress?: boolean;
    readonly healingReaction?: (amount: number) => number;
  } = {},
):
  | { status: "refused"; reason: string }
  | {
      status: "resolved";
      hero: T;
      cursor: number;
      provisions: typeof provisions;
      events: readonly GameEvent[];
    } {
  if (original.dead) return { status: "resolved", hero: original, cursor, provisions, events: [] };
  const plan = typeof input === "string" ? passivePlan(original, input) : null;
  let hero = original,
    nextCursor = cursor,
    pool = provisions;
  const events: GameEvent[] = [];
  const woundAmounts = [
    ...(plan?.wounds ?? []),
    ...(typeof input === "string" ? [] : (input.woundAmounts ?? [])),
  ];
  const stresses = options.omitStress
    ? []
    : (plan?.stress ?? [typeof input === "string" ? 0 : input.amount]);
  let stress = original.stress;
  for (const amount of stresses) {
    if (!amount) continue;
    if (
      !Number.isSafeInteger(stress) ||
      stress! < 0 ||
      stress! > 10 ||
      !Number.isSafeInteger(light) ||
      light < 0 ||
      light > 5
    )
      return { status: "refused", reason: "被动压力缺少有效英雄压力 / 光照" };
    const modified = passiveStress(original, amount, light);
    woundAmounts.push(...modified.wounds);
    stress = Math.max(0, Math.min(10, stress! + modified.amount));
  }
  // R-069：先压力与追加伤口／死门；调用方仅对存活压力10英雄续接意志。
  if (stress !== undefined) hero = { ...hero, stress };
  if (plan?.heal && options.healingForbidden)
    events.push({
      type: "healingPrevented",
      entityId: hero.id,
      message: "Unholy Aura：被动治疗已阻止（R-067）",
    });
  const healthEffects = [
    ...(plan?.heal && !options.healingForbidden
      ? [
          {
            type: "heal" as const,
            amount: passiveHeal(original, options.healingReaction?.(plan.heal) ?? plan.heal),
          },
        ]
      : []),
    ...(woundAmounts.length ? [{ type: "wounds" as const, amounts: woundAmounts }] : []),
  ];
  for (const effect of healthEffects) {
    if (hero.dead) break;
    if (hero.life === undefined || hero.wounds === undefined)
      return { status: "refused", reason: "被动伤口 / 治疗缺少已核实 Life" };
    const health = resolveSeededHeroHealth(
      { life: hero.life, wounds: hero.wounds, dead: hero.dead ?? false },
      effect,
      seed,
      nextCursor,
    );
    if (health.status !== "resolved")
      return {
        status: "refused",
        reason: health.status === "refused" ? health.reason : "被动死门未完成",
      };
    hero = { ...hero, ...health.state };
    nextCursor = health.rngCursor;
    events.push({
      type: "heroHealthResolved",
      entityId: hero.id,
      effect,
      resolution: health,
      message: "官方疾病 / 怪癖被动伤口与死门已结算（R26–29）",
    });
  }
  for (const effect of plan?.statuses ?? []) {
    if (hero.dead) break;
    const applied = applyPassiveStatus(hero, effect, "target", defence);
    if (applied.status === "refused") return applied;
    hero = applied.hero;
    if (applied.wounds.length) {
      if (hero.life === undefined || hero.wounds === undefined)
        return { status: "refused", reason: "疾病追加伤口缺少已核实 Life" };
      const effect = { type: "wounds" as const, amounts: applied.wounds };
      const health = resolveSeededHeroHealth(
        { life: hero.life, wounds: hero.wounds, dead: hero.dead ?? false },
        effect,
        seed,
        nextCursor,
      );
      if (health.status !== "resolved")
        return {
          status: "refused",
          reason: health.status === "refused" ? health.reason : "疾病死门未完成",
        };
      hero = { ...hero, ...health.state };
      nextCursor = health.rngCursor;
      events.push({
        type: "heroHealthResolved",
        entityId: hero.id,
        effect,
        resolution: health,
        message: "同次状态施加的疾病追加伤口已合并结算（R-063、R29）",
      });
    }
  }
  if (plan?.discardFood) {
    const food = pool.find((p) => p.face === "food");
    if (food) {
      pool = pool.filter((p) => p.id !== food.id);
      events.push({
        type: "provisionConsumed",
        entityId: hero.id,
        provisionId: food.id,
        face: "food",
        effect: "discard",
        message: "Bulimic 弃掉另一 Food（R27），弃置不算消耗 Food",
      });
    }
  }
  if (
    plan &&
    (plan.stress.length ||
      plan.statuses.length ||
      plan.wounds.length ||
      plan.heal ||
      plan.discardFood)
  )
    events.push({
      type: "passiveTriggered",
      entityId: hero.id,
      trigger: typeof input === "string" ? input : "stress",
      message: `疾病 / 怪癖触发：${typeof input === "string" ? input : "stress"}（R26–28）`,
    });
  return { status: "resolved", hero, cursor: nextCursor, provisions: pool, events };
}
