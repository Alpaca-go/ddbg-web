import { nextBattleRoll } from "./battle-roll";
import { rejectBattleCommand, playHeroSkill } from "./battle";
import { playHeroSkillTargets } from "./battle-hero-targets";
import { playMonsterSkill } from "./battle-monster";
import type { ApplyResult, GameState } from "./command";
import type { SkillPrefix } from "./battle-own-effects";
import type { SkillHealthEffect } from "./hero-skill";
import type { HeroTrinketAttack } from "./battle-trinket-ability";
import { trinketPoolProblem } from "./trinket-acquisition";
import { damageStoneFacesMatch } from "./battle-attack-trinkets";

export const DAMAGE_STONE_ID = "trinket:p007";
/** R26 / R-026：正伤害才触发，不把DoT或已有伤口差当成伤害。 */
export function damageStoneHealthEffects(
  prefix: SkillPrefix | undefined,
  effects: readonly SkillHealthEffect[],
): readonly SkillHealthEffect[] {
  const response = prefix?.damageStoneResponse;
  if (!response?.use) return effects;
  let applied = false;
  return effects.map((e) => {
    if (
      applied ||
      e.entityId !== response.heroId ||
      e.side !== "hero" ||
      !["attack", "riposte"].includes(e.source) ||
      e.effect.type !== "wounds" ||
      !e.effect.amounts[0]
    )
      return e;
    applied = true;
    // 与同一时刻的Fragile等追加伤口一起结算；追加2是Wound，不再减伤或递归触发。
    return { ...e, effect: { ...e.effect, amounts: [...e.effect.amounts, 2] } };
  });
}
function eligible(state: GameState, effects: readonly SkillHealthEffect[]): string | null {
  const b = state.battle!,
    pool = b.trinkets;
  const held = pool?.held.find((h) => h.cardId === DAMAGE_STONE_ID && h.face === "inverted");
  if (!held || b.usedTrinketIds?.includes(DAMAGE_STONE_ID)) return null;
  const hero = b.entities.find((e) => e.id === held.heroId && e.side === "hero" && !e.dead);
  if (
    !hero ||
    !effects.some(
      (e) =>
        e.entityId === hero.id &&
        e.side === "hero" &&
        ["attack", "riposte"].includes(e.source) &&
        e.effect.type === "wounds" &&
        e.effect.amounts[0]! > 0,
    )
  )
    return null;
  return hero.id;
}
function poolProblem(state: GameState): string | null {
  const b = state.battle!,
    pool = b.trinkets!;
  if (!pool) return "缺少完整饰品牌池（R-048）";
  const problem = trinketPoolProblem(
    pool,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        dead: e.dead,
        ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
      })),
  );
  if (problem) return problem;
  const card = pool.cards.find((c) => c.id === DAMAGE_STONE_ID);
  return !card ||
    card.verification.unverified ||
    card.name !== "Damage Stone" ||
    card.level !== 1 ||
    card.upright_half.name !== card.name ||
    card.inverted_half.name !== card.name ||
    card.upright_half.level !== 1 ||
    card.inverted_half.level !== 1 ||
    card.upright_half.printed_rotation !== 0 ||
    card.inverted_half.printed_rotation !== 180 ||
    !damageStoneFacesMatch(card)
    ? "Damage Stone卡面变化，保留停点（R-048）"
    : null;
}
export function beginDamageStoneWindow(
  state: GameState,
  command: SkillPrefix["command"],
  roll: number | null,
  effects: readonly SkillHealthEffect[],
  resume?: SkillPrefix,
  trinketAttack?: HeroTrinketAttack,
): ApplyResult | null {
  if (state.battle?.trinketRuntime) return null;
  if (
    !command.damageStoneWindow ||
    roll === null ||
    !state.battle?.encounter ||
    !["hero", "monster"].includes(state.battle.encounter.turn.type)
  )
    return null;
  if (resume?.damageStoneResponse) {
    return eligible(state, effects) === resume.damageStoneResponse.heroId
      ? null
      : rejectBattleCommand(state, "Damage Stone受伤条件已变化");
  }
  const heroId = eligible(state, effects);
  if (!heroId) return null;
  const problem = poolProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  const b = state.battle;
  const choice = {
    id: "damage-stone:" + b.choiceCursor,
    actorId: heroId,
    prompt:
      "技能骰 d10=" + roll + "，伤害尚未结算。使用 Damage Stone 反面，额外承受2伤口并翻回正面？",
    options: [
      { id: "continue", label: "不使用，继续结算" },
      { id: DAMAGE_STONE_ID, label: "承受2伤口，Damage Stone翻回正面" },
    ],
  };
  const prefix: SkillPrefix = resume ?? {
    original: b,
    command,
    roll,
    ...(trinketAttack ? { trinketAttack } : {}),
  };
  return {
    state: {
      ...state,
      battle: {
        ...b,
        choiceCursor: b.choiceCursor + 1,
        pending: { type: "damageStone", choice, prefix, heroId, consumeRoll: !resume },
      },
    },
    events: [],
    pendingChoice: choice,
  };
}
export function chooseDamageStone(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!,
    p = b.pending;
  if (
    p?.type !== "damageStone" ||
    ![DAMAGE_STONE_ID, "continue"].includes(optionId) ||
    !p.choice.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "Damage Stone待选无效");
  const problem = poolProblem(state);
  if (problem) return rejectBattleCommand(state, problem);
  if (
    !b.trinkets!.held.some(
      (h) => h.cardId === DAMAGE_STONE_ID && h.heroId === p.heroId && h.face === "inverted",
    ) ||
    b.usedTrinketIds?.includes(DAMAGE_STONE_ID)
  )
    return rejectBattleCommand(state, "Damage Stone持有状态已变化");
  if (p.prefix.roll !== nextBattleRoll(state.seed, p.prefix.original.rngCursor))
    return rejectBattleCommand(state, "Damage Stone原骰已失效");
  if (
    p.consumeRoll
      ? b.rngCursor !== p.prefix.original.rngCursor
      : b.rngCursor <= p.prefix.original.rngCursor
  )
    return rejectBattleCommand(state, "Damage Stone骰游标已失效");
  const use = optionId === DAMAGE_STONE_ID;
  if (use && b.trinketRuntime) b.trinketRuntime.spent.add(DAMAGE_STONE_ID);
  // 重算技能与原骰，不接受持久化待选中伪造的伤口结果。
  const prefix = { ...p.prefix, damageStoneResponse: { heroId: p.heroId, use } };
  const base = {
    ...state,
    battle: { ...b, pending: null, rngCursor: b.rngCursor + Number(p.consumeRoll) },
  };
  const command = prefix.command;
  const result =
    command.type === "playMonsterSkill"
      ? playMonsterSkill(base, command, prefix)
      : command.type === "playHeroSkill"
        ? playHeroSkill(base, command, prefix)
        : playHeroSkillTargets(base, command, prefix);
  if (result.events.some((e) => e.type === "commandRefused"))
    return rejectBattleCommand(state, "Damage Stone续接失效，未翻面或结算");
  const paid = result.events.some(
    (e) =>
      e.type === "heroHealthResolved" &&
      e.entityId === p.heroId &&
      e.effect.type === "wounds" &&
      e.effect.amounts.includes(2),
  );
  if (use && !paid) return rejectBattleCommand(state, "Damage Stone需要实际正伤害，未翻面或结算");
  if (!use) return result;
  return {
    ...result,
    state: {
      ...result.state,
      battle: {
        ...result.state.battle!,
        usedTrinketIds: [...(result.state.battle!.usedTrinketIds ?? []), DAMAGE_STONE_ID],
        trinkets: {
          ...result.state.battle!.trinkets!,
          held: result.state.battle!.trinkets!.held.map((h) =>
            h.cardId === DAMAGE_STONE_ID ? { ...h, face: "upright" as const } : h,
          ),
        },
      },
    },
    events: [
      {
        type: "trinketUsed",
        actorId: p.heroId,
        cardId: DAMAGE_STONE_ID,
        face: "inverted",
        message: "Damage Stone：受到伤害时承受2伤口并翻回正面（R26）",
      },
      ...result.events,
    ],
  };
}
