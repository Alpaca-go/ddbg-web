import {
  ATTACK_TRINKET_RULES,
  readAttackTrinketRule,
} from "../../../../data/src/core/trinkets/attack-trinket-rules";
import { battleTrinketHolders } from "./battle-hero-card-holders";
import { HERO_SKILL_TRINKET_IDS } from "../../../../data/src/core/heroes/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../../../data/src/core/heroes/hero-skill-trinkets";
import { playHeroSkill, rejectBattleCommand } from "./battle";
import type { PlayHeroSkillCommand } from "./battle";
import { playHeroSkillTargets } from "./battle-hero-targets";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { ApplyResult, GameState } from "../core/command";
import type { HeroSkillResolution } from "../../core/heroes/hero-skill";
import { hasHeroSkillRoll } from "../../core/heroes/hero-skill";
import type { HeroTrinketAttack } from "./battle-trinket-ability";
import { nextBattleRoll } from "./battle-roll";
import { trinketPoolProblem } from "../trinkets/trinket-acquisition";

type Attack = PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
type Offer = {
  cardId: HeroSkillTrinketId;
  face: "upright" | "inverted";
  name: string;
  crit: number;
  accuracy: number;
  noDamage?: true;
  damage?: number;
};
function modifiersFor(
  offers: readonly Offer[],
  selected: readonly HeroSkillTrinketId[],
): HeroTrinketAttack["modifiers"] {
  const used = offers.filter((o) => selected.includes(o.cardId));
  return {
    crit: used.reduce((sum, o) => sum + o.crit, 0),
    accuracy: used.reduce((sum, o) => sum + o.accuracy, 0),
    ...(used.some((o) => o.damage)
      ? { damage: used.reduce((sum, o) => sum + (o.damage ?? 0), 0) }
      : {}),
    ...(used.some((o) => o.noDamage) ? { dealNoDamage: true } : {}),
  };
}
function readOffers(
  state: GameState,
  command: Attack,
  roll: number,
  selected: readonly HeroSkillTrinketId[] = [],
): { offers: Offer[] } | { problem: string } {
  const b = state.battle!,
    ids = command.trinketWindow,
    actor = b.entities.find((e) => e.id === command.actorId);
  if (
    !ids ||
    ids === true ||
    !Array.isArray(ids) ||
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !HERO_SKILL_TRINKET_IDS.includes(id)) ||
    !actor ||
    actor.dead
  )
    return { problem: "饰品能力名单或持有者无效，未掷骰 / 翻面（R-048）" };
  const held =
    b.trinkets?.held.filter(
      (h) => h.heroId === actor.id && ids.includes(h.cardId as HeroSkillTrinketId),
    ) ?? [];
  if (!held.length) return { offers: [] };
  const problem = trinketPoolProblem(b.trinkets!, battleTrinketHolders(b));
  if (problem) return { problem };
  const skill = b.skills.find((s) => s.id === command.skillId)!;
  const offers: Offer[] = [];
  const requested: readonly HeroSkillTrinketId[] = ids;
  for (const id of requested) {
    const item = held.find((h) => h.cardId === id);
    if (!item) continue;
    const card = b.trinkets!.cards.find((c) => c.id === id);
    const rule = readAttackTrinketRule(card, id);
    if (!rule)
      return { problem: `${ATTACK_TRINKET_RULES[id].name} 缺少已核准攻击效果规则（R-048）` };
    if (
      b.usedTrinketIds?.includes(id) ||
      (item.face === "inverted" && (rule.freeInverted || rule.damage)) ||
      (item.face === "upright" && rule.stance && actor.stance !== rule.stance) ||
      (item.face === "inverted" && actor.stance === rule.invertedNotInStance)
    )
      continue;
    if (rule.light) {
      // p021：正面≤3、反面≥3；p026相反；光照3两面都适用。
      const low = (rule.light === "dark") === (item.face === "upright");
      if (low ? b.light > 3 : b.light < 3) continue;
    }

    if (
      !rule.damage &&
      !(rule.freeInverted
        ? hasHeroSkillRoll(skill, "Crit") || hasHeroSkillRoll(skill, "Acc")
        : hasHeroSkillRoll(skill, item.face === "upright" && rule.crit ? "Crit" : "Acc"))
    )
      continue;
    offers.push({
      cardId: id,
      face: item.face,
      name: rule.name,
      ...(rule.damage ? { damage: rule.damage } : {}),
      crit: item.face === "upright" ? rule.crit : 0,
      accuracy: item.face === "upright" ? rule.accuracy : rule.penalty,
      ...(rule.light && item.face === "inverted" ? { noDamage: true as const } : {}),
    });
  }
  if (selected.some((id) => !offers.some((o) => o.cardId === id)))
    return { problem: "已选饰品不再适用，未翻面或结算技能" };
  const hasDamageHit = (chosen: readonly HeroSkillTrinketId[]) => {
    const attack: HeroTrinketAttack = {
      roll,
      modifiers: modifiersFor(offers, chosen),
      preview: true,
    };
    const preview =
      command.type === "playHeroSkill"
        ? playHeroSkill(state, command, undefined, attack)
        : playHeroSkillTargets(state, command, undefined, attack);
    return preview.events.some((e) =>
      e.type === "heroSkillResolved"
        ? e.resolution.effect === "damage" &&
          (e.resolution.outcome === "hit" || e.resolution.outcome === "crit")
        : e.type === "heroSkillTargetsResolved" &&
          e.resolutions.some(
            (r) => r.effect === "damage" && (r.outcome === "hit" || r.outcome === "crit"),
          ),
    );
  };
  const selectedNoDamage = offers.some(
    (o) => (o.noDamage || o.damage) && selected.includes(o.cardId),
  );
  if (selectedNoDamage && !hasDamageHit(selected))
    return { problem: "伤害饰品需要技能命中目标，未翻面或结算技能" };
  return {
    offers: offers.filter(
      (o) =>
        selected.includes(o.cardId) ||
        !(o.noDamage || o.damage || selectedNoDamage) ||
        hasDamageHit([...selected, o.cardId]),
    ),
  };
}
function present(
  state: GameState,
  command: Attack,
  roll: number,
  offers: Offer[],
  selected: readonly HeroSkillTrinketId[],
): ApplyResult {
  const b = state.battle!;
  const choice = {
    id: `hero-attack-trinkets:${b.choiceCursor}`,
    actorId: command.actorId,
    prompt: `技能骰 d10=${roll}，尚未结算。${selected.length ? `已选：${selected.map((id) => ATTACK_TRINKET_RULES[id].name).join("、")}。` : ""}可依次选择适用饰品。`,
    options: [
      { id: "continue", label: "结算技能，不再使用饰品" },
      ...offers
        .filter((o) => !selected.includes(o.cardId))
        .map((o) => ({
          id: o.cardId,
          label: `${o.name}：${o.noDamage ? "命中目标但不造成伤害" : [o.damage ? `伤害+${o.damage}` : "", o.accuracy ? `Acc${o.accuracy > 0 ? "+" : ""}${o.accuracy}` : "", o.crit ? `Crit+${o.crit}` : ""].filter(Boolean).join("、")}（${o.face === "upright" ? "正面→反面" : "反面→正面"}）`,
        })),
    ],
  };
  return {
    state: {
      ...state,
      battle: {
        ...b,
        choiceCursor: b.choiceCursor + 1,
        pending: {
          type: "heroAttackTrinkets",
          command,
          roll,
          offers: offers.map(({ cardId, face }) => ({ cardId, face })),
          selected,
          choice,
        },
      },
    },
    events: [],
    pendingChoice: choice,
  };
}
export function beginAttackTrinketWindow(
  state: GameState,
  command: Attack,
  roll: number,
  resolution: HeroSkillResolution,
): ApplyResult | null {
  const b = state.battle!;
  if (
    b.encounter?.turn.type !== "hero" ||
    b.encounter.turn.actorId !== command.actorId ||
    resolution.outcome === null
  )
    return null;
  const available = readOffers(state, command, roll);
  if ("problem" in available) return rejectBattleCommand(state, available.problem);
  return available.offers.length ? present(state, command, roll, available.offers, []) : null;
}
/** 所有选择暂存为计划；最终技能成功才一次提交翻面、次数与技能效果。 */
export function chooseAttackTrinkets(state: GameState, optionId: string): ApplyResult {
  const b = state.battle!,
    p = b.pending;
  if (p?.type !== "heroAttackTrinkets") return rejectBattleCommand(state, "缺少饰品使用计划");
  const available = readOffers(state, p.command, p.roll, p.selected);
  if (
    "problem" in available ||
    p.roll !== nextBattleRoll(state.seed, b.rngCursor) ||
    JSON.stringify(p.offers) !==
      JSON.stringify(available.offers.map(({ cardId, face }) => ({ cardId, face }))) ||
    new Set(p.selected).size !== p.selected.length ||
    p.selected.some((id) => !available.offers.some((o) => o.cardId === id)) ||
    (optionId !== "continue" &&
      !available.offers.some((o) => o.cardId === optionId && !p.selected.includes(o.cardId))) ||
    !p.choice.options.some((o) => o.id === optionId)
  )
    return rejectBattleCommand(state, "饰品使用计划已失效，未翻面或结算技能");
  const selected =
    optionId === "continue" ? p.selected : [...p.selected, optionId as HeroSkillTrinketId];
  const planned =
    optionId === "continue" ? available : readOffers(state, p.command, p.roll, selected);
  if ("problem" in planned) return rejectBattleCommand(state, planned.problem);
  if (optionId !== "continue" && planned.offers.some((o) => !selected.includes(o.cardId)))
    return present(state, p.command, p.roll, planned.offers, selected);
  const used = planned.offers.filter((o) => selected.includes(o.cardId));
  const attack: HeroTrinketAttack = {
    roll: p.roll,
    modifiers: modifiersFor(used, selected),
  };
  const next = {
    ...state,
    battle: {
      ...b,
      pending: null,
      ...(used.length
        ? {
            usedTrinketIds: [...(b.usedTrinketIds ?? []), ...selected],
            trinkets: {
              ...b.trinkets!,
              held: b.trinkets!.held.map((h) =>
                selected.includes(h.cardId as HeroSkillTrinketId)
                  ? {
                      ...h,
                      face: h.face === "upright" ? ("inverted" as const) : ("upright" as const),
                    }
                  : h,
              ),
            },
          }
        : {}),
    },
  };
  const result =
    p.command.type === "playHeroSkill"
      ? playHeroSkill(next, p.command, undefined, attack)
      : playHeroSkillTargets(next, p.command, undefined, attack);
  return {
    ...result,
    events: [
      ...used.map((o) => ({
        type: "trinketUsed" as const,
        actorId: p.command.actorId,
        cardId: o.cardId,
        face: o.face,
        message: `${o.name}：使用${o.face === "upright" ? "正面" : "反面"}并翻面（R26）`,
      })),
      ...result.events,
    ],
  };
}
