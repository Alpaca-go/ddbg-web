import { HERO_SKILL_TRINKET_IDS } from "../../data/src/hero-skill-trinkets";
import type { HeroSkillTrinketId } from "../../data/src/hero-skill-trinkets";
import type { NormalizedTrinketCard } from "../../data/src/normalize/schema";
import { playHeroSkill, rejectBattleCommand } from "./battle";
import type { PlayHeroSkillCommand } from "./battle";
import { playHeroSkillTargets } from "./battle-hero-targets";
import type { PlayHeroSkillTargetsCommand } from "./battle-hero-targets";
import type { ApplyResult, GameState } from "./command";
import type { HeroSkillResolution, SkillStance } from "./hero-skill";
import type { HeroTrinketAttack } from "./battle-trinket-ability";
import { nextBattleRoll } from "./battle-roll";
import { trinketPoolProblem } from "./trinket-acquisition";
import { isFortunateArmlet } from "./battle-fortunate-armlet";

type Attack = PlayHeroSkillCommand | PlayHeroSkillTargetsCommand;
type Definition = {
  name: string;
  level: 1 | 2 | 3;
  positive: string;
  negative: string;
  crit: number;
  accuracy: number;
  penalty: number;
  stance?: SkillStance;
  invertedNotInStance?: SkillStance;
  icon?: string;
  /** p013 姿态图标在 raw 行的 rot 误归，仍须完整卡面与已确认 front_icons 对应。 */
  frontIconId?: string;
  light?: "dark" | "solar";
  freeInverted?: true;
};
const definitions: Record<HeroSkillTrinketId, Definition> = {
  "trinket:p025": {
    name: "Fortunate Armlet",
    level: 2,
    positive: "Acc+1 and Crit+1",
    negative: "",
    crit: 1,
    accuracy: 1,
    penalty: 0,
    freeInverted: true,
  },
  "trinket:p006": {
    name: "Critical Stone",
    level: 1,
    positive: "Crit+2",
    negative: "Acc-2",
    crit: 2,
    accuracy: 0,
    penalty: -2,
  },
  "trinket:p001": {
    name: "Accuracy Stone",
    level: 1,
    positive: "Acc+1",
    negative: "Acc-1",
    crit: 0,
    accuracy: 1,
    penalty: -1,
  },
  "trinket:p002": {
    name: "Archer’s Ring",
    level: 1,
    positive: "Acc+2 when in ",
    negative: "Acc-1",
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "ranged",
    icon: "stance_ranged_lit",
  },
  "trinket:p009": {
    name: "Sage’s Book",
    level: 1,
    positive: "Acc+2 when in ",
    negative: "Acc-1",
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "support",
    icon: "stance_support_lit",
  },
  "trinket:p014": {
    name: "Warrior’s Cap",
    level: 1,
    positive: "Acc+2 when in ",
    negative: "Acc-1",
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "defensive",
    icon: "stance_defensive_lit",
  },
  "trinket:p013": {
    name: "Warrior’s Bracer",
    level: 1,
    positive: "Acc+2 Acc when in",
    negative: "Acc-1",
    crit: 0,
    accuracy: 2,
    penalty: -1,
    stance: "aggressive",
    icon: "stance_aggressive_lit",
    frontIconId: "fe18ec5b80",
  },
  "trinket:p031": {
    name: "Sniper’s Ring",
    level: 3,
    positive: "Crit+4 if in ",
    negative: "Acc-2 if not in ",
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "ranged",
    invertedNotInStance: "ranged",
    icon: "stance_ranged_lit",
  },
  "trinket:p032": {
    name: "Warrior’s Ring",
    level: 3,
    positive: "Crit+4 if in ",
    negative: "Acc-2 if not in ",
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "aggressive",
    invertedNotInStance: "aggressive",
    icon: "stance_aggressive_lit",
  },
  "trinket:p033": {
    name: "Defender’s Ring",
    level: 3,
    positive: "Crit+4 if in ",
    negative: "Acc-2 if not in ",
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "defensive",
    invertedNotInStance: "defensive",
    icon: "stance_defensive_lit",
  },
  "trinket:p034": {
    name: "Scholar’s Ring",
    level: 3,
    positive: "Crit+4 if in ",
    negative: "Acc-2 if not in ",
    crit: 4,
    accuracy: 0,
    penalty: -2,
    stance: "support",
    invertedNotInStance: "support",
    icon: "stance_support_lit",
  },
  "trinket:p021": {
    name: "Dark Bracer",
    level: 2,
    positive: "Crit+2",
    negative: "Deal no Damage",
    crit: 2,
    accuracy: 0,
    penalty: 0,
    light: "dark",
  },
  "trinket:p026": {
    name: "Solar Bracer",
    level: 2,
    positive: "Crit+2",
    negative: "Deal no Damage",
    crit: 2,
    accuracy: 0,
    penalty: 0,
    light: "solar",
  },
};
type Offer = {
  cardId: HeroSkillTrinketId;
  face: "upright" | "inverted";
  name: string;
  crit: number;
  accuracy: number;
  noDamage?: true;
};
// 分行和比较符半笔按规范化原样核对；完整印刷 p021/p026 决定各面 ≤/≥ 方向。
function lightFacesMatch(card: NormalizedTrinketCard, light: "dark" | "solar") {
  const halves = [card.upright_half, card.inverted_half];
  if (
    halves.some((h) =>
      h.effect_lines
        .flat()
        .some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        ),
    )
  )
    return false;
  const tokens = halves.map((h) =>
    h.effect_lines.map((l) => l.map((s) => (s.type === "text" ? s.text : `@${s.icon.key}`))),
  );
  const expected =
    light === "dark"
      ? [
          [["Crit+2 if ", "@light", " ", "@compare_lte", " < 3"]],
          [
            ["@compare_gte", " <"],
            ["When a Skill Hits the Target:"],
            ["if ", "@light", " 3 Deal no ", "@damage", " ."],
          ],
        ]
      : [
          [
            ["Crit+2 if ", "@light", " 3"],
            ["@compare_lte", " <"],
          ],
          [
            ["When a Skill Hits the Target:"],
            ["if ", "@light", " ", "@compare_gte", " < 3 Deal no ", "@damage", " ."],
          ],
        ];
  return JSON.stringify(tokens) === JSON.stringify(expected);
}
function modifiersFor(
  offers: readonly Offer[],
  selected: readonly HeroSkillTrinketId[],
): HeroTrinketAttack["modifiers"] {
  const used = offers.filter((o) => selected.includes(o.cardId));
  return {
    crit: used.reduce((sum, o) => sum + o.crit, 0),
    accuracy: used.reduce((sum, o) => sum + o.accuracy, 0),
    ...(used.some((o) => o.noDamage) ? { dealNoDamage: true } : {}),
  };
}
function exactLine(
  lines: NormalizedTrinketCard["upright_half"]["effect_lines"],
  text: string,
  icon?: string,
) {
  const line = lines[0],
    glyph = line?.[1];
  return (
    lines.length === 1 &&
    line?.length === (icon ? 2 : 1) &&
    line[0]?.type === "text" &&
    line[0].text === text &&
    (!icon ||
      (glyph?.type === "icon" &&
        glyph.icon.key === icon &&
        ["confirmed", "confirmed_rulebook"].includes(glyph.icon.naming)))
  );
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
  const problem = trinketPoolProblem(
    b.trinkets!,
    b.entities
      .filter((e) => e.side === "hero")
      .map((e) => ({
        id: e.id,
        ...(e.heroLevel === undefined ? {} : { level: e.heroLevel }),
        dead: e.dead,
      })),
  );
  if (problem) return { problem };
  const skill = b.skills.find((s) => s.id === command.skillId)!;
  const offers: Offer[] = [];
  const requested: readonly HeroSkillTrinketId[] = ids;
  for (const id of requested) {
    const item = held.find((h) => h.cardId === id);
    if (!item) continue;
    const card = b.trinkets!.cards.find((c) => c.id === id)!,
      rule = definitions[id];
    if (
      card.name !== rule.name ||
      card.level !== rule.level ||
      card.upright_half.name !== rule.name ||
      card.inverted_half.name !== rule.name ||
      card.upright_half.printed_rotation !== 0 ||
      card.inverted_half.printed_rotation !== 180 ||
      !(rule.freeInverted
        ? isFortunateArmlet(card)
        : rule.light
          ? lightFacesMatch(card, rule.light)
          : exactLine(
              card.upright_half.effect_lines,
              rule.positive,
              rule.frontIconId ? undefined : rule.icon,
            ) &&
            (!rule.frontIconId ||
              (card.front_icons.filter((i) => i.key?.startsWith("stance_")).length === 1 &&
                card.front_icons.some(
                  (i) =>
                    i.iconId === rule.frontIconId &&
                    i.key === rule.icon &&
                    ["confirmed", "confirmed_rulebook"].includes(i.naming),
                ))) &&
            exactLine(
              card.inverted_half.effect_lines,
              rule.negative,
              rule.invertedNotInStance ? rule.icon : undefined,
            ))
    )
      return { problem: `${rule.name} 的已核实卡面发生变化，保留停点（R-048）` };
    if (
      b.usedTrinketIds?.includes(id) ||
      (item.face === "inverted" && rule.freeInverted) ||
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
      !skill.printed_labels.some((l) =>
        rule.freeInverted
          ? l.label === "Crit" || l.label === "Acc"
          : l.label === (item.face === "upright" && rule.crit ? "Crit" : "Acc"),
      )
    )
      continue;
    offers.push({
      cardId: id,
      face: item.face,
      name: rule.name,
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
  const selectedNoDamage = offers.some((o) => o.noDamage && selected.includes(o.cardId));
  if (selectedNoDamage && !hasDamageHit(selected))
    return { problem: "零伤害饰品需要技能命中目标，未翻面或结算技能" };
  return {
    offers: offers.filter(
      (o) =>
        selected.includes(o.cardId) ||
        !(o.noDamage || selectedNoDamage) ||
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
    prompt: `技能骰 d10=${roll}，尚未结算。${selected.length ? `已选：${selected.map((id) => definitions[id].name).join("、")}。` : ""}可依次选择适用饰品。`,
    options: [
      { id: "continue", label: "结算技能，不再使用饰品" },
      ...offers
        .filter((o) => !selected.includes(o.cardId))
        .map((o) => ({
          id: o.cardId,
          label: `${o.name}：${o.noDamage ? "命中目标但不造成伤害" : [o.accuracy ? `Acc${o.accuracy > 0 ? "+" : ""}${o.accuracy}` : "", o.crit ? `Crit+${o.crit}` : ""].filter(Boolean).join("、")}（${o.face === "upright" ? "正面→反面" : "反面→正面"}）`,
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
