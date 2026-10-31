import type { ApplyResult, GameEvent, GameState } from "../command";
import { rejectBattleCommand, type BattleEntity, type BattleState } from "../battle";
import { healingForbidden } from "../battle-healing";
import { readHeroPassiveDefence } from "../battle-skill-status";
import { resolveSeededHeroHealth } from "../hero-health";
import type { HeroSkillResolution } from "../hero-skill";
import { passiveHeal } from "../passive";
import { applyPassiveStatus } from "../passive-runtime";
import { statusProjection } from "../status";
import { readFinalFormSequence } from "./final-form-sequence";

/** boss_ability:p036 · Gestating Heart 主体。 */
export const GESTATING_HEART_MONSTER_CARD_ID = "monster_large:p019" as const;

const ICHOR_HEAL = 2;
const ICHOR_BLIGHT_AMOUNT = 2;
const ICHOR_BLIGHT_DURATION = 3;

function ichorActive(state: GameState): boolean {
  const sequence = readFinalFormSequence(state);
  return sequence?.current?.id === "gestatingHeart" && sequence.progress.status === "fighting";
}

function collectHeroSkillResolutions(
  result: ApplyResult,
  actorId: string,
): readonly HeroSkillResolution[] {
  const multi = result.events.find((event) => event.type === "heroSkillTargetsResolved");
  if (multi && multi.type === "heroSkillTargetsResolved" && multi.actorId === actorId)
    return multi.resolutions;
  const single = result.events.find((event) => event.type === "heroSkillResolved");
  if (single && single.type === "heroSkillResolved" && single.actorId === actorId)
    return [single.resolution];
  return [];
}

function heartDamageTriggerCount(
  beforeEntities: readonly BattleEntity[],
  resolutions: readonly HeroSkillResolution[],
): number {
  const heart = beforeEntities.find(
    (entity) =>
      entity.side === "monster" &&
      entity.monsterCardId === GESTATING_HEART_MONSTER_CARD_ID &&
      !entity.dead,
  );
  if (!heart) return 0;
  return resolutions.filter(
    (resolution) =>
      resolution.targetId === heart.id &&
      resolution.damageDealt !== null &&
      resolution.damageDealt > 0,
  ).length;
}

function applyIchorOnce(
  battle: BattleState,
  seed: number,
  actorId: string,
):
  | { readonly ok: true; readonly battle: BattleState; readonly events: readonly GameEvent[] }
  | { readonly ok: false; readonly reason: string } {
  const entity = battle.entities.find((entry) => entry.id === actorId && entry.side === "hero");
  if (!entity || entity.dead || entity.life === undefined || entity.wounds === undefined)
    return { ok: true, battle, events: [] };

  const events: GameEvent[] = [];
  let rngCursor = battle.rngCursor;
  let hero: BattleEntity = entity;

  if (healingForbidden(battle, actorId)) {
    events.push({
      type: "healingPrevented",
      entityId: actorId,
      message: "Ichor：当前区域禁止治疗（boss_ability:p036、R-067）",
    });
  } else {
    const healEffect = {
      type: "heal" as const,
      amount: passiveHeal(hero, ICHOR_HEAL),
    };
    const health = resolveSeededHeroHealth(
      { life: hero.life!, wounds: hero.wounds!, dead: hero.dead },
      healEffect,
      seed,
      rngCursor,
    );
    if (health.status !== "resolved")
      return {
        ok: false,
        reason: health.status === "refused" ? health.reason : "Ichor 治疗未完成死门骰（R-048）",
      };
    rngCursor = health.rngCursor;
    hero = { ...hero, ...health.state };
    events.push({
      type: "heroHealthResolved",
      entityId: actorId,
      effect: healEffect,
      resolution: health,
      message: "Ichor：英雄治疗 2（boss_ability:p036）",
    });
  }

  const defence = readHeroPassiveDefence(battle, hero);
  if (!defence) return { ok: false, reason: "Ichor Blight 缺少获批英雄抗性 / 免疫（R-048）" };
  const blight = applyPassiveStatus(
    hero,
    { kind: "blight", amount: ICHOR_BLIGHT_AMOUNT, duration: ICHOR_BLIGHT_DURATION },
    "target",
    defence,
  );
  if (blight.status === "refused") return { ok: false, reason: blight.reason };
  hero = blight.hero;
  if (blight.wounds.length) {
    const woundEffect = { type: "wounds" as const, amounts: blight.wounds };
    const health = resolveSeededHeroHealth(
      { life: hero.life!, wounds: hero.wounds, dead: hero.dead },
      woundEffect,
      seed,
      rngCursor,
    );
    if (health.status !== "resolved")
      return {
        ok: false,
        reason: health.status === "refused" ? health.reason : "Ichor 疾病追加伤口未完成死门骰",
      };
    rngCursor = health.rngCursor;
    hero = { ...hero, ...health.state };
    events.push({
      type: "heroHealthResolved",
      entityId: actorId,
      effect: woundEffect,
      resolution: health,
      message: "Ichor Blight 疾病追加伤口（R-063）",
    });
  }

  const stacks = hero.statusStacks ?? [];
  hero = {
    ...hero,
    statusStacks: stacks,
    ...statusProjection(stacks, hero.innateProtection),
  };

  const entities = battle.entities.map((entry) => (entry.id === actorId ? hero : entry));
  return {
    ok: true,
    battle: { ...battle, entities, rngCursor },
    events,
  };
}

/** 对 Gestating Heart 的每次实际伤害（resolution 粒度）触发一次 Ichor。 */
export function applyGestatingHeartIchor(
  state: GameState,
  actorId: string,
  triggerCount: number,
): ApplyResult {
  if (!ichorActive(state) || triggerCount <= 0) return { state, events: [] };
  const battle = state.battle;
  if (!battle?.encounter) return { state, events: [] };

  let nextBattle = battle;
  const events: GameEvent[] = [];
  for (let index = 0; index < triggerCount; index++) {
    const step = applyIchorOnce(nextBattle, state.seed, actorId);
    if (!step.ok) return rejectBattleCommand(state, step.reason);
    nextBattle = step.battle;
    events.push(...step.events);
    const actor = nextBattle.entities.find((entry) => entry.id === actorId);
    if (!actor || actor.dead) break;
  }

  return {
    state: { ...state, battle: nextBattle },
    events: [
      {
        type: "dungeonUpdated",
        message: `Gestating Heart · Ichor：${actorId} 对心造成伤害 → 治疗 ${ICHOR_HEAL}、Blight ${ICHOR_BLIGHT_AMOUNT}/${ICHOR_BLIGHT_DURATION}t（boss_ability:p036）`,
      },
      ...events,
    ],
  };
}

/** 英雄技能结算后链接 Ichor（单目标与多目标共用 resolution 粒度）。 */
export function chainGestatingHeartIchorAfterHeroSkill(
  result: ApplyResult,
  beforeEntities: readonly BattleEntity[],
  heroActorId: string,
): ApplyResult {
  if (result.events.some((event) => event.type === "commandRefused")) return result;
  if (!ichorActive(result.state)) return result;
  const battle = result.state.battle;
  if (!battle?.encounter) return result;

  const resolutions = collectHeroSkillResolutions(result, heroActorId);
  const triggerCount = heartDamageTriggerCount(beforeEntities, resolutions);
  if (triggerCount === 0) return result;

  const ichor = applyGestatingHeartIchor(result.state, heroActorId, triggerCount);
  if (ichor.events.some((event) => event.type === "commandRefused")) return ichor;
  return {
    state: ichor.state,
    events: [...result.events, ...ichor.events],
  };
}
