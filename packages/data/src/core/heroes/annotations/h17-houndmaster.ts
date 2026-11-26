import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { HeroAnnotationEntries } from "./types";
import { lineSignature } from "./shared";
import type { NormalizedHeroSkillCard, Segment } from "../../../shared/schema";
import {
  assertCardMeta,
  defineHeroModule,
  cloneKey,
  iconFromCard,
  iconFromPool,
  segmentOnCard,
  stressDeltaAnchor,
  text,
} from "./patch-helpers";
import type { CardFix } from "./patch-helpers";

const entries: HeroAnnotationEntries = {
  targetCount: [
    { id: "hero_skill:weald:h17:p337", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p338", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p339", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p340", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p341", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p342", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p343", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p344", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p345", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p346", hero: 2, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p347", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p348", hero: 3, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p349", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p350", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p351", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p352", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p353", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p354", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p355", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p356", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h17:p357", hero: 0, monster: 1, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:weald:h17:p337", effect: "damage" },
    { id: "hero_skill:weald:h17:p338", effect: "damage" },
    { id: "hero_skill:weald:h17:p339", effect: "damage" },
    { id: "hero_skill:weald:h17:p340", effect: "damage" },
    { id: "hero_skill:weald:h17:p341", effect: "damage" },
    { id: "hero_skill:weald:h17:p342", effect: "damage" },
    { id: "hero_skill:weald:h17:p352", effect: "heal" },
    { id: "hero_skill:weald:h17:p353", effect: "heal" },
    { id: "hero_skill:weald:h17:p354", effect: "heal" },
    { id: "hero_skill:weald:h17:p355", effect: "damage" },
    { id: "hero_skill:weald:h17:p356", effect: "damage" },
    { id: "hero_skill:weald:h17:p357", effect: "damage" },
  ],
};

/** 洗掉 OCR 射程/压力 beside 与 Rush 族误挂的 1ff34c908b，再由 verified 块重写。 */
function stripHmOcrBesideNumbers(numbers: NormalizedHeroSkillCard["unlabeled_numbers"]) {
  return numbers.filter(
    (n) =>
      !(
        n.anchor.type === "beside_icon" &&
        (n.anchor.left_icon?.key === "range" || n.anchor.left_icon?.key === "stress") &&
        n.anchor.inside_icon === null
      ) && !(n.anchor.type === "beside_icon" && n.anchor.inside_icon?.iconId === "1ff34c908b"),
  );
}

function fixHoundsRush(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  markT: number,
  bleedAmt: number,
  bleedT: number,
  expectedSelfRaw: string,
  expectedTargetRaw: string,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Hound’s Rush", level);
  if (lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedSelfRaw)
    throw new Error(`${card.id} Hound's Rush 自身行漂移（R-048）`);
  if (lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== expectedTargetRaw)
    throw new Error(`${card.id} Hound's Rush 目标行漂移（R-048）`);
  const markMis = segmentOnCard(card, "d4329c2a97");
  const selfArrow = cloneKey(segmentOnCard(card, "1ff34c908b"), "self_effects");
  const targetEffects = iconFromCard(card, "target_effects");
  const bleed = iconFromPool([card], "bleed");
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfArrow, text(" Self "), cloneKey(markMis, "buff"), text(` ${markT}t`)],
      [targetEffects, text(` ${bleedAmt} `), bleed, text(` ${bleedT}t`)],
    ],
    annotation_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "self", kind: "buff", duration: markT },
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "target",
        kind: "bleed",
        duration: bleedT,
        amount: bleedAmt,
      },
    ],
  });
}

function fixHoundsHarry(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  bleedAmt: number,
  bleedT: number,
  expectedStats: string,
  expectedEff: string,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Hound’s Harry", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Hound's Harry stats 漂移（R-048）`);
  if (lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedEff)
    throw new Error(`${card.id} Hound's Harry 效果行漂移（R-048）`);
  const targetEffects = iconFromCard(card, "target_effects");
  const bleed = iconFromPool([card], "bleed");
  const targetMonster = iconFromPool(cards, "target_monster");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: card.stats_line!.map((segment) =>
      segment.type === "icon" && segment.icon.key === "target_hero" ? targetMonster : segment,
    ),
    effect_lines: [[targetEffects, text(` ${bleedAmt} `), bleed, text(` ${bleedT}t`)]],
    annotation_status_effects: [
      {
        lineIndex: 0,
        segmentIndex: 2,
        scope: "target",
        kind: "bleed",
        duration: bleedT,
        amount: bleedAmt,
      },
    ],
  });
}

function fixTargetWhistle(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  markT: number,
  debuffT: number,
  expectedStats: string,
  expectedRaw: string,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Target Whistle", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Target Whistle stats 漂移（R-048）`);
  const rawSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (rawSig !== expectedRaw) throw new Error(`${card.id} Target Whistle 效果行漂移（R-048）`);
  const line = card.effect_lines[0]!;
  const lead = line[0];
  const mark = iconFromPool([card], "mark");
  const debuff = iconFromPool([card], "debuff");
  const rangeIcon = iconFromPool([card], "range");
  const targetMonster = iconFromPool([card], "target_monster");
  const targetEffects =
    lead?.type === "icon" && lead.icon.iconId === "20ffe98e2d"
      ? cloneKey(lead, "target_effects")
      : iconFromCard(card, "target_effects");
  const accValue = card.printed_labels.find((l) => l.label === "Acc")?.value;
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: [
      rangeIcon,
      text(" 0-2 "),
      targetMonster,
      ...(accValue === undefined ? [] : [text(` Acc ${accValue}`)]),
    ],
    unlabeled_numbers: [
      ...card.unlabeled_numbers.filter(
        (n) =>
          n.text !== "0-2" &&
          !(n.anchor.type === "beside_icon" && n.text === "0" && n.numeric === 0),
      ),
      {
        text: "0-2",
        numeric: null,
        anchor: {
          type: "beside_icon" as const,
          left_icon: rangeIcon.icon,
          inside_icon: null,
        },
      },
    ],
    annotation_range: { min: 0, max: 2, source: "print_front" },
    effect_lines: [
      [targetEffects, text(" "), mark, text(` ${markT}t, `), debuff, text(` ${debuffT}t`)],
    ],
    annotation_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "mark", duration: markT },
      { lineIndex: 0, segmentIndex: 4, scope: "target", kind: "debuff", duration: debuffT },
    ],
  });
}

function fixCryHavoc(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  allyCount: number,
  selfStress: number,
  rawSigs: readonly [string, string],
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Cry Havoc", level);
  const observed = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (JSON.stringify(observed) !== JSON.stringify(rawSigs))
    throw new Error(`${card.id} Cry Havoc 效果行漂移（R-048）`);
  const stressIcon = iconFromPool(cards, "stress");
  const selfEffects = iconFromCard(card, "self_effects");
  const rangeIcon = iconFromPool(cards, "range");
  const targetHero = iconFromPool(cards, "target_hero");
  const accValue = card.printed_labels.find((l) => l.label === "Acc")?.value;
  const accRaw = card.printed_labels.find((l) => l.label === "Acc")?.raw ?? `Acc ${accValue}`;
  const statsHeader: Segment[] = [rangeIcon, text(" 1 ")];
  for (let i = 0; i < allyCount; i += 1) {
    if (i > 0) statsHeader.push(text(" "));
    statsHeader.push(targetHero);
  }
  statsHeader.push(text(` ${accRaw}`));
  const anchors = [stressDeltaAnchor(stressIcon, -1), stressDeltaAnchor(stressIcon, selfStress)];
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: statsHeader,
    effect_lines: [
      [iconFromPool(cards, "target_effects"), text(" "), stressIcon, text(" -1")],
      [selfEffects, text(" Self "), stressIcon, text(` ${selfStress > 0 ? "+" : ""}${selfStress}`)],
    ],
    unlabeled_numbers: [
      ...stripHmOcrBesideNumbers(card.unlabeled_numbers),
      ...anchors,
      {
        text: "1",
        numeric: 1,
        anchor: {
          type: "beside_icon" as const,
          left_icon: rangeIcon.icon,
          inside_icon: null,
        },
      },
    ],
    annotation_self_stress: { lineIndex: 1, amount: selfStress, source: "print_front" },
    annotation_target_stress: { lineIndex: 0, amount: -1, source: "print_front" },
  });
}

function fixGuardDog(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  protectionT: number,
  rawHeader: string,
  rawSelf: string,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Guard Dog", level);
  if (lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== rawHeader)
    throw new Error(`${card.id} Guard Dog 射程行漂移（R-048）`);
  if (lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== rawSelf)
    throw new Error(`${card.id} Guard Dog 效果行漂移（R-048）`);
  const rangeIcon = iconFromCard(card, "range");
  const selfEffects = iconFromCard(card, "self_effects");
  const protection = iconFromCard(card, "protection");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" Self")],
      [selfEffects, text(" Self "), protection, text(` ${protectionT}t`)],
    ],
    unlabeled_numbers: [
      ...card.unlabeled_numbers,
      {
        text: "0",
        numeric: 0,
        anchor: {
          type: "beside_icon" as const,
          left_icon: rangeIcon.icon,
          inside_icon: null,
        },
      },
    ],
    annotation_self_range: true,
    annotation_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "self",
        kind: "protection",
        duration: protectionT,
      },
    ],
  });
}

function fixLickWounds(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedRawStats: string,
  critHeal: number,
  accHeal: number,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Lick Wounds", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedRawStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Lick Wounds stats 漂移（R-048）`);
  const rangeIcon = iconFromCard(card, "range");
  const heal = iconFromPool([card], "heal");
  const critValue = card.printed_labels.find((l) => l.label === "Crit")?.value ?? 2;
  const accValue = card.printed_labels.find((l) => l.label === "Acc")?.value ?? 20;
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: [
      rangeIcon,
      text(` Self Crit ${critValue} `),
      heal,
      text(` ${critHeal} Acc ${accValue} `),
      heal,
      text(` ${accHeal}`),
    ],
    effect_lines: [],
    annotation_self_range: true,
  });
}

function fixBlackjack(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedEff: string,
) {
  assertCardMeta(card, "HOUNDMASTER", page, "Blackjack", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Blackjack stats 漂移（R-048）`);
  if (lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedEff)
    throw new Error(`${card.id} Blackjack 效果行漂移（R-048）`);
  const targetEffects = iconFromCard(card, "target_effects");
  const stunMis = segmentOnCard(card, "763ad8e857");
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [[targetEffects, text(" "), cloneKey(stunMis, "stun"), text(" 1t")]],
    annotation_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
    ],
  });
}

/**
 * R-200：Houndmaster II–III（p338–p357 中 14 张）+ 同技能族 L1 OCR 洗净（p337–p355 七族）。
 * Q-178～Q-180 Kyries 已真确认：Rush 1ff34c908b=自身起效；Cry Havoc 压力行（非目标减益）；Blackjack=Stun。
 */
function fixes(cards: readonly NormalizedHeroSkillCard[]): Readonly<Record<string, CardFix>> {
  return {
    "hero_skill:weald:h17:p337": (card) =>
      fixHoundsRush(
        card,
        337,
        1,
        2,
        1,
        3,
        "{self_effects}{buff}Self{buff}2t",
        "{target_effects}1{bleed}3t",
      ),
    "hero_skill:weald:h17:p338": (card) =>
      fixHoundsRush(
        card,
        338,
        2,
        3,
        2,
        2,
        "{self_effects}{buff}Self{buff}3t",
        "{target_effects}2{bleed}2t",
      ),
    "hero_skill:weald:h17:p339": (card) =>
      fixHoundsRush(
        card,
        339,
        3,
        3,
        2,
        3,
        "{self_effects}{buff}Self{buff}3t",
        "{target_effects}2{bleed}3t",
      ),
    "hero_skill:weald:h17:p340": (card) =>
      fixHoundsHarry(
        cards,
        card,
        340,
        1,
        1,
        3,
        "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0{damage}4Acc9{damage}2",
        "{target_effects}1{bleed}3t",
      ),
    "hero_skill:weald:h17:p341": (card) =>
      fixHoundsHarry(
        cards,
        card,
        341,
        2,
        2,
        2,
        "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0{damage}5Acc10{damage}3",
        "{target_effects}2{bleed}2t",
      ),
    "hero_skill:weald:h17:p342": (card) =>
      fixHoundsHarry(
        cards,
        card,
        342,
        3,
        3,
        2,
        "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0{damage}6Acc11{damage}4",
        "{target_effects}3{bleed}2t",
      ),
    "hero_skill:weald:h17:p343": (card) =>
      fixTargetWhistle(card, 343, 1, 2, 1, "Acc10", "{target_effects}{mark}2t,{debuff}1t"),
    "hero_skill:weald:h17:p344": (card) =>
      fixTargetWhistle(card, 344, 2, 3, 2, "Acc11", "{heal}{mark}3t,{debuff}2t"),
    "hero_skill:weald:h17:p345": (card) =>
      fixTargetWhistle(card, 345, 3, 3, 3, "Acc12", "{heal}{mark}3t,{debuff}3t"),
    "hero_skill:weald:h17:p346": (card) =>
      fixCryHavoc(cards, card, 346, 1, 2, -1, [
        "{target_effects}{buff}-1",
        "{self_effects}{buff}Self{buff}-1",
      ]),
    "hero_skill:weald:h17:p347": (card) =>
      fixCryHavoc(cards, card, 347, 2, 3, -1, [
        "{target_effects}{buff}-1",
        "{self_effects}{buff}Self{buff}-1",
      ]),
    "hero_skill:weald:h17:p348": (card) =>
      fixCryHavoc(cards, card, 348, 3, 3, -2, [
        "{target_effects}{buff}-1",
        "{self_effects}{buff}Self{buff}-2",
      ]),
    "hero_skill:weald:h17:p349": (card) =>
      fixGuardDog(card, 349, 1, 2, "{range}{buff}Self", "{self_effects}{buff}Self{protection}2t"),
    "hero_skill:weald:h17:p350": (card) =>
      fixGuardDog(card, 350, 2, 3, "{range}{buff}Self", "{self_effects}{buff}Self{protection}3t"),
    "hero_skill:weald:h17:p351": (card) =>
      fixGuardDog(card, 351, 3, 4, "{range}{buff}Self", "{self_effects}{buff}Self{protection}4t"),
    "hero_skill:weald:h17:p352": (card) =>
      fixLickWounds(
        card,
        352,
        1,
        "{range}{target_hero}SelfCrit2{heal}{damage}5Acc20{heal}{damage}3",
        5,
        3,
      ),
    "hero_skill:weald:h17:p353": (card) =>
      fixLickWounds(
        card,
        353,
        2,
        "{range}{target_hero}SelfCrit2{heal}{damage}6Acc20{heal}{damage}4",
        6,
        4,
      ),
    "hero_skill:weald:h17:p354": (card) =>
      fixLickWounds(
        card,
        354,
        3,
        "{range}{target_hero}SelfCrit2{heal}{damage}8Acc20{heal}{damage}6",
        8,
        6,
      ),
    "hero_skill:weald:h17:p355": (card) =>
      fixBlackjack(
        card,
        355,
        1,
        "{range}0{target_monster}Crit1{damage}5Acc10{damage}3",
        "{target_effects}{buff}1t",
      ),
    "hero_skill:weald:h17:p356": (card) =>
      fixBlackjack(
        card,
        356,
        2,
        "{range}0{target_monster}Crit2{damage}6Acc11{damage}4",
        "{target_effects}{buff}1t",
      ),
    "hero_skill:weald:h17:p357": (card) =>
      fixBlackjack(
        card,
        357,
        3,
        "{range}0{target_monster}Crit3{damage}7Acc12{damage}5",
        "{target_effects}{buff}1t",
      ),
  };
}

export const h17 = defineHeroModule({
  id: "h17",
  hero: "HOUNDMASTER",
  entries,
  fixes,
});
