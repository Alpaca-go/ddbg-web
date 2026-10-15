import type { BattleEntity, BattleState } from "./battle";
import type { HeroSkillResolution } from "./hero-skill";
import { addStatusStack, STATUS_KINDS, statusProjection } from "./status";
import type { StatusEffect, StatusKind } from "./status";
import { applyPassiveHero, applyPassiveStatus } from "./passive-runtime";
import { resolveSeededHeroHealth } from "./hero-health";
import type { GameEvent } from "./command";
import type { PassiveDefence } from "./passive-runtime";
import { ancestorGlory, ANCESTOR_CONDITIONS, clearAncestorConditions } from "./battle-ancestor";
import { hasQuirk, passivePlan, passiveStress } from "./passive";
import {
  approvedHeroConditionDefences,
  heroConditionDefenceSchema,
} from "../../data/src/normalize/hero-stat";
import { readHigherHeroDefence } from "../../data/src/normalize/hero-higher-defence";

type HeroRuntimeDefence = PassiveDefence & {
  readonly shuffleResistant?: boolean;
  readonly shuffleImmune?: boolean;
  readonly diseaseImmune?: boolean;
};

export function readHeroPassiveDefence(
  battle: Pick<BattleState, "heroStats"> & Partial<Pick<BattleState, "areas">>,
  entity: Pick<BattleEntity, "heroStatId"> & Partial<Pick<BattleEntity, "side" | "areaId">>,
): HeroRuntimeDefence | undefined {
  const hero = battle.heroStats?.find((h) => h.id === entity.heroStatId);
  if (hero && hero.level !== 1) {
    const higher = readHigherHeroDefence(hero);
    if (!higher) return undefined;
    const persistent = (kinds: readonly string[]) =>
      STATUS_KINDS.filter((kind) => kinds.includes(kind));
    return {
      resistances: persistent(higher.resistances),
      immunities: [
        ...new Set([
          ...persistent(higher.immunities),
          ...(ancestorGlory(battle.areas ?? [], entity) ? ANCESTOR_CONDITIONS : []),
        ]),
      ],
      shuffleResistant: higher.resistances.includes("shuffle"),
      shuffleImmune: higher.immunities.includes("shuffle"),
      diseaseImmune: higher.immunities.includes("disease"),
    };
  }
  const defence = hero?.verified_condition_defence;
  const expected = hero && approvedHeroConditionDefences[hero.id];
  if (
    !hero?.attributesVerified ||
    hero.level !== 1 ||
    !expected ||
    hero.name !== expected.name ||
    !heroConditionDefenceSchema.safeParse(defence).success ||
    defence?.resistances[0] !== expected.kind
  )
    return undefined;
  return {
    resistances: defence.resistances,
    immunities: ancestorGlory(battle.areas ?? [], entity)
      ? [...new Set([...defence.immunities, ...ANCESTOR_CONDITIONS])]
      : defence.immunities,
  };
}

/** 自身只施加一次；目标逐个施加。调用方先以 probe 验证，再在生命结果上应用。 */
export function applyBattleSkillStatuses(
  battle: BattleState,
  entities: readonly BattleEntity[],
  actorId: string,
  resolutions: readonly HeroSkillResolution[],
  seed?: number,
  initialCursor = battle.rngCursor,
  selfStatusEffects?: readonly StatusEffect[],
):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly entities: readonly BattleEntity[];
      readonly light: number;
      readonly rngCursor: number;
      readonly events: readonly GameEvent[];
    } {
  let next = [...entities];
  let rngCursor = initialCursor;
  const events: GameEvent[] = [];
  const apply = (
    id: string,
    effects: readonly StatusEffect[],
    scope: "self" | "target",
  ): string | null => {
    const entity = next.find((entry) => entry.id === id);
    const stat = battle.heroStats?.find((card) => card.id === entity?.heroStatId);
    if (
      scope === "target" &&
      entity?.side === "hero" &&
      stat &&
      stat.level !== 1 &&
      !readHeroPassiveDefence(battle, entity)
    )
      return "英雄条件防御不符合限定审批（R-081），整次未提交";
    if (!effects.length) return null;
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
        const defence = hero?.verified_condition_defence;
        if (defence || (hero && hero.level !== 1)) {
          const approved = readHeroPassiveDefence(battle, entity);
          if (!approved) return "英雄条件防御不符合限定审批（R-048）";
          resistances = [...approved.resistances];
          immunities = [...approved.immunities];
        } else {
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
        }
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
            // 已命名Shuffle抗性是即时位移防御，不是持久状态堆；不能因此拒绝Bleed。
            if (
              icon.key === "shuffle_resist" &&
              ["confirmed", "confirmed_rulebook"].includes(icon.naming)
            )
              continue;
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
      if (entity.side === "hero") {
        const applied = applyPassiveStatus(
          { ...next.find((e) => e.id === id)!, statusStacks: stacks },
          effect,
          scope,
          scope === "self" ? readHeroPassiveDefence(battle, entity) : { resistances, immunities },
        );
        if (applied.status === "refused") return applied.reason;
        stacks = applied.hero.statusStacks ?? [];
        let hero = applied.hero;
        if (applied.wounds.length) {
          if (hero.life === undefined) return "疾病追加伤口缺少已核实 Life（R-048）";
          if (seed !== undefined) {
            const woundEffect = { type: "wounds" as const, amounts: applied.wounds };
            const health = resolveSeededHeroHealth(
              { life: hero.life, wounds: hero.wounds, dead: hero.dead },
              woundEffect,
              seed,
              rngCursor,
            );
            if (health.status !== "resolved")
              return health.status === "refused" ? health.reason : "疾病死门未完成";
            hero = { ...hero, ...health.state };
            rngCursor = health.rngCursor;
            events.push({
              type: "heroHealthResolved",
              entityId: id,
              effect: woundEffect,
              resolution: health,
              message: "状态施加的疾病追加伤口已合并（R-063）",
            });
          }
        }
        next = next.map((e) => (e.id === id ? hero : e));
        if (hero.dead) break;
      } else {
        const applied = addStatusStack(stacks, effect, scope, { resistances, immunities });
        if (applied.status === "refused") return applied.reason;
        stacks = applied.stacks;
      }
    }
    next = [
      ...clearAncestorConditions(
        battle.areas,
        next.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                statusStacks: stacks,
                ...statusProjection(stacks, entry.innateProtection),
              }
            : entry,
        ),
      ),
    ];
    return null;
  };
  const selfProblem = apply(
    actorId,
    selfStatusEffects ?? resolutions[0]?.actorStatusEffects ?? [],
    "self",
  );
  if (selfProblem) return { status: "refused", reason: selfProblem };
  for (const resolution of resolutions) {
    const problem = apply(resolution.targetId, resolution.targetStatusEffects ?? [], "target");
    if (problem) return { status: "refused", reason: problem };
  }
  let light = Math.max(0, Math.min(5, battle.light + (resolutions[0]?.actorLightDelta ?? 0)));
  const deltas = [
    resolutions[0]?.actorLightDelta ?? 0,
    ...resolutions.map((r) => r.targetLightDelta ?? 0),
  ];
  light = battle.light;
  for (const delta of deltas) {
    const before = light;
    light = Math.max(0, Math.min(5, light + delta));
    if (light === before) continue;
    for (const entity of next.filter((e) => e.side === "hero" && !e.dead)) {
      const actor = next.find((e) => e.id === actorId);
      if (
        seed !== undefined &&
        actor?.side === "hero" &&
        resolutions.some((r) => r.outcome === "crit") &&
        entity.areaId === actor.areaId
      ) {
        const plan = passivePlan(entity, light > before ? "lightRaised" : "lightLowered");
        const refund = 1 + Number(hasQuirk(entity, "Resilient"));
        if (
          plan.stress.some(
            (amount) =>
              amount > 0 &&
              (entity.stress ?? 0) + refund + passiveStress(entity, amount, light).amount >= 10,
          )
        )
          return {
            status: "refused",
            reason:
              "光照被动与暴击压力恢复触及意志 / 死亡先后；该复合事件续接尚未实现（R20、R28），整次未提交",
          };
      }
      const applied = applyPassiveHero(
        entity,
        light > before ? "lightRaised" : "lightLowered",
        seed ?? 0,
        rngCursor,
        light,
        battle.provisions,
        readHeroPassiveDefence(battle, entity),
        { probe: seed === undefined },
      );
      if (applied.status === "refused") return applied;
      next = next.map((e) => (e.id === entity.id ? applied.hero : e));
      if (seed !== undefined) {
        rngCursor = applied.cursor;
        events.push(...applied.events);
      }
    }
  }
  return { status: "resolved", entities: next, light, rngCursor, events };
}
