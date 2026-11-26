import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { ShuffleEntry, IgnoresEntry } from "./types";
import type { HeroAnnotationEntries } from "./types";
import { lineSignature } from "./shared";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import {
  assertCardMeta,
  defineHeroModule,
  cloneKey,
  iconFromCard,
  iconFromPool,
  segmentOnCard,
  rangeZeroUnlabeled,
  text,
} from "./patch-helpers";
import type { CardFix } from "./patch-helpers";
import type { IconSegment } from "./patch-helpers";

function fixPierce(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedIgnoresRaw: string,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Pierce", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Pierce stats 漂移（R-048）`);
  if (
    lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedSelfRaw ||
    lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== expectedIgnoresRaw
  )
    throw new Error(`${card.id} Pierce 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const shuffleMis = segmentOnCard(card, "d4329c2a97");
  const protection = iconFromCard(card, "protection");
  const healMis = segmentOnCard(card, "20ffe98e2d");
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(shuffleMis, "shuffle"), text(" Pull 1")],
      [cloneKey(healMis, "target_effects"), text(" Ignores "), protection],
    ],
  });
}

function fixPuncture(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedTailRaw: string,
  rangeInterval: boolean,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Puncture", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Puncture stats 漂移（R-048）`);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (rawSigs[0] !== expectedSelfRaw || rawSigs[1] !== expectedTailRaw)
    throw new Error(`${card.id} Puncture 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const shuffle = iconFromPool(cards, "shuffle");
  const targetEffects = iconFromPool(cards, "target_effects");
  const selfPullMis = card.effect_lines[0]!.find(
    (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
  );
  if (!selfPullMis) throw new Error(`${card.id} Puncture 自身 Pull 段缺失（R-048）`);
  const targetIcons = card.effect_lines[1]!.filter(
    (s): s is IconSegment => s.type === "icon" && s.icon.iconId === "b6afaa4d7b",
  );
  if (targetIcons.length < 2) throw new Error(`${card.id} Puncture Ignores/Pull 段缺失（R-048）`);
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(selfPullMis, "shuffle"), text(" Pull 1")],
      [text("Ignores "), cloneKey(targetIcons[0]!, "guard")],
      [targetEffects, shuffle, text(" Pull 1")],
    ],
    ...(rangeInterval
      ? {
          annotation_range: { min: 1, max: 2, source: "print_front" as const },
        }
      : {}),
  });
}

function fixAddersKiss(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedTargetRaw: string,
  duration: number,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Adder’s Kiss", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Adder's Kiss stats 漂移（R-048）`);
  if (
    lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedSelfRaw ||
    lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== expectedTargetRaw
  )
    throw new Error(`${card.id} Adder's Kiss 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const pushMis = segmentOnCard(card, "d4329c2a97");
  const targetEffects = iconFromCard(card, "target_effects");
  const blight = iconFromPool(cards, "blight");
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, text(" 2 "), blight, text(` ${duration}t`)],
    ],
    annotation_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "target",
        kind: "blight",
        amount: 2,
        duration,
      },
    ],
  });
}

function fixImpale(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedTargetRaw: string,
  debuffT: number,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Impale", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Impale stats 漂移（R-048）`);
  if (
    lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedSelfRaw ||
    lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== expectedTargetRaw
  )
    throw new Error(`${card.id} Impale 效果行漂移（R-048）`);
  const targetMonster = iconFromPool(cards, "target_monster");
  const statsLine = card.stats_line!.map((segment) =>
    segment.type === "icon" && segment.icon.iconId === "7616568d52" ? targetMonster : segment,
  );
  const selfEffects = iconFromCard(card, "self_effects");
  const pushMis = segmentOnCard(card, "d4329c2a97");
  const targetEffects = iconFromCard(card, "target_effects");
  const debuff = iconFromCard(card, "debuff");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: statsLine,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, debuff, text(` ${debuffT}t`)],
    ],
    annotation_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 1,
        scope: "target",
        kind: "debuff",
        duration: debuffT,
      },
    ],
  });
}

function fixExpose(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedTargetRaw: string,
  debuffT: number,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Expose", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Expose stats 漂移（R-048）`);
  if (
    lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedSelfRaw ||
    lineSignature(card.effect_lines[1]!).replace(/\s+/g, "") !== expectedTargetRaw
  )
    throw new Error(`${card.id} Expose 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const pushMis = segmentOnCard(card, "d4329c2a97");
  const targetEffects = iconFromCard(card, "target_effects");
  const debuff = iconFromCard(card, "debuff");
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, debuff, text(` ${debuffT}t`)],
    ],
    annotation_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 1,
        scope: "target",
        kind: "debuff",
        duration: debuffT,
      },
    ],
  });
}

function fixCaptivate(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedEffRaw: string,
  bonus: number,
  blightAmt: number,
  blightT: number,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Captivate", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Captivate stats 漂移（R-048）`);
  if (lineSignature(card.effect_lines[0]!).replace(/\s+/g, "") !== expectedEffRaw)
    throw new Error(`${card.id} Captivate 效果行漂移（R-048）`);
  const damage = iconFromPool(cards, "damage");
  const mark = iconFromPool(cards, "mark");
  const targetEffects = iconFromPool(cards, "target_effects");
  const blight = iconFromPool(cards, "blight");
  const stats = card.stats_line!.map((segment) =>
    segment.type === "icon" && segment.icon.iconId === "b6afaa4d7b" ? damage : segment,
  );
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: stats,
    effect_lines: [
      [targetEffects, damage, text(`+${bonus}vs`), mark],
      [targetEffects, text(` ${blightAmt} `), blight, text(` ${blightT}t`)],
    ],
    annotation_damage_bonus: {
      lineIndex: 0,
      amount: bonus,
      condition: "marked",
      source: "print_front",
    },
    annotation_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "target",
        kind: "blight",
        duration: blightT,
        amount: blightAmt,
      },
    ],
  });
}

function fixSerpentSwaySelf(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedHeaderRaw: string,
  expectedSelfRaw: string,
  protectionT: number,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Serpent Sway", level);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (rawSigs[0] !== expectedHeaderRaw || rawSigs[1] !== expectedSelfRaw)
    throw new Error(`${card.id} Serpent Sway 效果行漂移（R-048）`);
  const rangeIcon = iconFromPool(cards, "range");
  const selfEffects = iconFromCard(card, "self_effects");
  const protection = iconFromCard(card, "protection");
  const shuffle = iconFromPool(cards, "shuffle");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" Self")],
      [selfEffects, text(" Self "), protection, text(` ${protectionT}t`)],
      [selfEffects, text(" Self "), shuffle, text(" Pull 1")],
    ],
    unlabeled_numbers: [rangeZeroUnlabeled(rangeIcon), ...card.unlabeled_numbers],
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

function fixSerpentSwayIii(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  expectedHeaderRaw: string,
  expectedSelfRaw: string,
  expectedAllyRaw: string,
) {
  assertCardMeta(card, "SHIELDBREAKER", page, "Serpent Sway", 3);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (
    rawSigs[0] !== expectedHeaderRaw.replace(/\s+/g, "") ||
    rawSigs[1] !== expectedSelfRaw ||
    rawSigs[2] !== expectedAllyRaw
  )
    throw new Error(`${card.id} Serpent Sway III 效果行漂移（R-048）`);
  const header = card.effect_lines[0]!;
  const selfEffects = iconFromCard(card, "self_effects");
  const protection = iconFromCard(card, "protection");
  const shuffle = iconFromPool(cards, "shuffle");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: header,
    effect_lines: [
      [selfEffects, text(" Self "), protection, text(" 3t")],
      [selfEffects, text(" Self "), shuffle, text(" Pull 1")],
      [cloneKey(segmentOnCard(card, "1e762d801a"), "target_effects"), protection, text(" 2t")],
    ],
    annotation_status_effects: [
      {
        lineIndex: 0,
        segmentIndex: 2,
        scope: "self",
        kind: "protection",
        duration: 3,
      },
      {
        lineIndex: 2,
        segmentIndex: 1,
        scope: "target",
        kind: "protection",
        duration: 2,
      },
    ],
  });
}

/** R-200 / Q-181～Q-184：Shieldbreaker I–III 七技能族逐卡覆盖（含 L1 OCR 洗净）。 */
function shieldbreakerFixes(
  cards: readonly NormalizedHeroSkillCard[],
): Readonly<Record<string, CardFix>> {
  return {
    "hero_skill:weald:h16:p316": (card) =>
      fixPierce(
        card,
        316,
        1,
        "{range} 2 {target_monster} Crit 1 {damage} 10 Acc 9 {damage} 6",
        "{self_effects}{buff}Self{buff}Pull1",
        "{heal}Ignores{protection}",
      ),
    "hero_skill:weald:h16:p317": (card) =>
      fixPierce(
        card,
        317,
        2,
        "{range} 2 {target_monster} Crit 1 {damage} 14 Acc 10 {damage} 9",
        "{self_effects}{buff}Self{buff}Pull1",
        "{heal}Ignores{protection}",
      ),
    "hero_skill:weald:h16:p318": (card) =>
      fixPierce(
        card,
        318,
        3,
        "{range} 2 {target_monster} Crit 1 {damage} 17 Acc 11 {damage} 12",
        "{self_effects}{buff}Self{buff}Pull1",
        "{heal}Ignores{protection}",
      ),
    "hero_skill:weald:h16:p319": (card) =>
      fixPuncture(
        cards,
        card,
        319,
        1,
        "{range} 2 {target_monster} Crit 0 {damage} 7 Acc 9 {damage} 4",
        "{self_effects}{buff}Self{target_effects}Pull1",
        "{light}Ignores{target_effects},{target_effects}Pull1",
        false,
      ),
    "hero_skill:weald:h16:p320": (card) =>
      fixPuncture(
        cards,
        card,
        320,
        2,
        "{range} 1-2 {target_monster} Crit 0 {damage} 8 Acc 10 {damage} 5",
        "{self_effects}{buff}Self{target_effects}Pull1",
        "{light}Ignores{target_effects},{target_effects}Pull1",
        true,
      ),
    "hero_skill:weald:h16:p321": (card) =>
      fixPuncture(
        cards,
        card,
        321,
        3,
        "{range} 1-2 {target_monster} Crit 0 {damage} 10 Acc 11 {damage} 7",
        "{self_effects}{buff}Self{target_effects}Pull1",
        "{light}Ignores{target_effects},{target_effects}Pull1",
        true,
      ),
    "hero_skill:weald:h16:p322": (card) =>
      fixAddersKiss(
        cards,
        card,
        322,
        1,
        "{range} 0 {target_monster} Crit 1 {damage} 11 Acc 9 {damage} 7",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}2{debuff}2t",
        2,
      ),
    "hero_skill:weald:h16:p323": (card) =>
      fixAddersKiss(
        cards,
        card,
        323,
        2,
        "{range} 0 {target_monster} Crit 1 {damage} 16 Acc 10 {damage} 10",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}2{stun}3t",
        3,
      ),
    "hero_skill:weald:h16:p324": (card) =>
      fixAddersKiss(
        cards,
        card,
        324,
        3,
        "{range} 0 {target_monster} Crit 1 {damage} 19 Acc 11 {damage} 14",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}2{stun}3t",
        3,
      ),
    "hero_skill:weald:h16:p325": (card) =>
      fixImpale(
        cards,
        card,
        325,
        1,
        "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 5 Acc 9 {damage} 3",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}1t",
        1,
      ),
    "hero_skill:weald:h16:p326": (card) =>
      fixImpale(
        cards,
        card,
        326,
        2,
        "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 7 Acc 10 {damage} 4",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}2t",
        2,
      ),
    "hero_skill:weald:h16:p327": (card) =>
      fixImpale(
        cards,
        card,
        327,
        3,
        "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 9 Acc 11 {damage} 6",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}2t",
        2,
      ),
    "hero_skill:weald:h16:p328": (card) =>
      fixExpose(
        card,
        328,
        1,
        "{range} 1 {target_monster} Crit 1 {damage} 9 Acc 8 {damage} 5",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}1t",
        1,
      ),
    "hero_skill:weald:h16:p329": (card) =>
      fixExpose(
        card,
        329,
        2,
        "{range} 1 {target_monster} Crit 1 {damage} 10 Acc 9 {damage} 6",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}2t",
        2,
      ),
    "hero_skill:weald:h16:p330": (card) =>
      fixExpose(
        card,
        330,
        3,
        "{range} 1 {target_monster} Crit 1 {damage} 12 Acc 10 {damage} 8",
        "{self_effects}{buff}Self{buff}Push1",
        "{target_effects}{debuff}2t",
        2,
      ),
    "hero_skill:weald:h16:p331": (card) =>
      fixCaptivate(
        cards,
        card,
        331,
        1,
        "{range} 1 {target_monster} Crit 1 {target_effects} 9 Acc 8 {target_effects} 6",
        "{shuffle}{target_effects}+2vs{damage},2{bleed}2t",
        2,
        2,
        2,
      ),
    "hero_skill:weald:h16:p332": (card) =>
      fixCaptivate(
        cards,
        card,
        332,
        2,
        "{range} 1 {target_monster} Crit 1 {target_effects} 12 Acc 9 {target_effects} 8",
        "{shuffle}{target_effects}+4vs{damage},3{bleed}2t",
        4,
        3,
        2,
      ),
    "hero_skill:weald:h16:p333": (card) =>
      fixCaptivate(
        cards,
        card,
        333,
        3,
        "{range} 1 {target_monster} Crit 1 {target_effects} 15 Acc 10 {target_effects} 10",
        "{shuffle}{target_effects}+4vs{damage},3{bleed}2t",
        4,
        3,
        2,
      ),
    "hero_skill:weald:h16:p334": (card) =>
      fixSerpentSwaySelf(
        cards,
        card,
        334,
        1,
        "{range}{buff}Self",
        "{self_effects}{buff}Self{protection}2t,{mark}Pull1",
        2,
      ),
    "hero_skill:weald:h16:p335": (card) =>
      fixSerpentSwaySelf(
        cards,
        card,
        335,
        2,
        "{range}{buff}Self",
        "{self_effects}{buff}Self{protection}3t,{mark}Pull1",
        3,
      ),
    "hero_skill:weald:h16:p336": (card) =>
      fixSerpentSwayIii(
        cards,
        card,
        336,
        "{range} 1 {target_hero}",
        "{self_effects}{buff}Self{mark}3t,{mark}Pull1",
        "{shuffle}{mark}2t",
      ),
  };
}

/** 文本位移规则（scope + Push/Pull 原文）。 */
const shuffleEntries: readonly ShuffleEntry[] = [
  {
    id: "hero_skill:weald:h16:p316",
    name: "Pierce",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p317",
    name: "Pierce",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p318",
    name: "Pierce",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p319",
    name: "Puncture",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p319",
    name: "Puncture",
    level: 1,
    lineIndex: 2,
    scope: "target",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p320",
    name: "Puncture",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p320",
    name: "Puncture",
    level: 2,
    lineIndex: 2,
    scope: "target",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p321",
    name: "Puncture",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p321",
    name: "Puncture",
    level: 3,
    lineIndex: 2,
    scope: "target",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p322",
    name: "Adder’s Kiss",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p323",
    name: "Adder’s Kiss",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p324",
    name: "Adder’s Kiss",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p325",
    name: "Impale",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p326",
    name: "Impale",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p327",
    name: "Impale",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p328",
    name: "Expose",
    level: 1,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p329",
    name: "Expose",
    level: 2,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p330",
    name: "Expose",
    level: 3,
    lineIndex: 0,
    scope: "self",
    text: "Push 1",
  },
  {
    id: "hero_skill:weald:h16:p334",
    name: "Serpent Sway",
    level: 1,
    lineIndex: 2,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p335",
    name: "Serpent Sway",
    level: 2,
    lineIndex: 2,
    scope: "self",
    text: "Pull 1",
  },
  {
    id: "hero_skill:weald:h16:p336",
    name: "Serpent Sway",
    level: 3,
    lineIndex: 1,
    scope: "self",
    text: "Pull 1",
  },
];

/** Ignores Protection / Guard 规则。 */
const ignoresEntries: readonly IgnoresEntry[] = [
  { id: "hero_skill:weald:h16:p316", name: "Pierce", level: 1, lineIndex: 1, kind: "protection" },
  { id: "hero_skill:weald:h16:p317", name: "Pierce", level: 2, lineIndex: 1, kind: "protection" },
  { id: "hero_skill:weald:h16:p318", name: "Pierce", level: 3, lineIndex: 1, kind: "protection" },
  { id: "hero_skill:weald:h16:p319", name: "Puncture", level: 1, lineIndex: 1, kind: "guard" },
  { id: "hero_skill:weald:h16:p320", name: "Puncture", level: 2, lineIndex: 1, kind: "guard" },
  { id: "hero_skill:weald:h16:p321", name: "Puncture", level: 3, lineIndex: 1, kind: "guard" },
];

const entries: HeroAnnotationEntries = {
  shuffle: shuffleEntries,
  ignores: ignoresEntries,
  targetCount: [
    { id: "hero_skill:weald:h16:p316", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p317", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p318", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p319", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p320", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p321", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p322", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p323", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p324", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p325", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p326", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p327", hero: 0, monster: 4, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p328", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p329", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p330", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p331", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p332", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p333", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p334", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p335", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:weald:h16:p336", hero: 1, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:weald:h16:p316", effect: "damage" },
    { id: "hero_skill:weald:h16:p317", effect: "damage" },
    { id: "hero_skill:weald:h16:p318", effect: "damage" },
    { id: "hero_skill:weald:h16:p319", effect: "damage" },
    { id: "hero_skill:weald:h16:p320", effect: "damage" },
    { id: "hero_skill:weald:h16:p321", effect: "damage" },
    { id: "hero_skill:weald:h16:p322", effect: "damage" },
    { id: "hero_skill:weald:h16:p323", effect: "damage" },
    { id: "hero_skill:weald:h16:p324", effect: "damage" },
    { id: "hero_skill:weald:h16:p325", effect: "damage" },
    { id: "hero_skill:weald:h16:p326", effect: "damage" },
    { id: "hero_skill:weald:h16:p327", effect: "damage" },
    { id: "hero_skill:weald:h16:p328", effect: "damage" },
    { id: "hero_skill:weald:h16:p329", effect: "damage" },
    { id: "hero_skill:weald:h16:p330", effect: "damage" },
    { id: "hero_skill:weald:h16:p331", effect: "damage" },
    { id: "hero_skill:weald:h16:p332", effect: "damage" },
    { id: "hero_skill:weald:h16:p333", effect: "damage" },
  ],
};

export const h16 = defineHeroModule({
  id: "h16",
  hero: "SHIELDBREAKER",
  entries,
  fixes: shieldbreakerFixes,
});
