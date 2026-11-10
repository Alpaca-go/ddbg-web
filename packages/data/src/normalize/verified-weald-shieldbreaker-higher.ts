import type { NormalizedHeroSkillCard, Segment } from "./schema";
import { normalizedHeroSkillCardSchema } from "./schema";
import { lineSignature } from "./verified-hero-layout";

type IconSegment = Extract<Segment, { type: "icon" }>;

function text(value: string): Segment {
  return { type: "text", text: value };
}

function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

function iconFromPool(cards: readonly NormalizedHeroSkillCard[], key: string): IconSegment {
  for (const card of cards) {
    const pools = [
      ...(card.stats_line ?? []),
      ...card.effect_lines.flat(),
      ...card.front_icons.map((icon) => ({ type: "icon" as const, icon })),
    ];
    const hit = pools.find(
      (s): s is IconSegment =>
        s.type === "icon" &&
        s.icon.key === key &&
        ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
    );
    if (hit) return hit;
  }
  throw new Error(`缺少已确认图标 {${key}}（R-048）`);
}

function iconFromCard(card: NormalizedHeroSkillCard, key: string): IconSegment {
  const pools = [
    ...(card.stats_line ?? []),
    ...card.effect_lines.flat(),
    ...card.front_icons.map((icon) => ({ type: "icon" as const, icon })),
  ];
  const hit = pools.find(
    (s): s is IconSegment =>
      s.type === "icon" &&
      s.icon.key === key &&
      ["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
  );
  if (!hit) throw new Error(`${card.id} 缺少已确认图标 {${key}}（R-048）`);
  return hit;
}

function segmentOnCard(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  for (const line of [...card.effect_lines, ...(card.stats_line ? [card.stats_line] : [])]) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

function assertSb(card: NormalizedHeroSkillCard, page: number, name: string, level: number) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "SHIELDBREAKER" ||
    card.name !== name ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

function rangeZeroUnlabeled(rangeIcon: IconSegment) {
  return {
    text: "0",
    numeric: 0,
    anchor: {
      type: "beside_icon" as const,
      left_icon: rangeIcon.icon,
      inside_icon: null,
    },
  };
}

function fixPierce(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  expectedStats: string,
  expectedSelfRaw: string,
  expectedIgnoresRaw: string,
) {
  assertSb(card, page, "Pierce", level);
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
  return normalizedHeroSkillCardSchema.parse({
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
  assertSb(card, page, "Puncture", level);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(selfPullMis, "shuffle"), text(" Pull 1")],
      [text("Ignores "), cloneKey(targetIcons[0]!, "guard")],
      [targetEffects, shuffle, text(" Pull 1")],
    ],
    ...(rangeInterval
      ? {
          verified_range: { min: 1, max: 2, source: "print_front" as const },
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
  assertSb(card, page, "Adder’s Kiss", level);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, text(" 2 "), blight, text(` ${duration}t`)],
    ],
    verified_status_effects: [
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
  assertSb(card, page, "Impale", level);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: statsLine,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, debuff, text(` ${debuffT}t`)],
    ],
    verified_status_effects: [
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
  assertSb(card, page, "Expose", level);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(" Push 1")],
      [targetEffects, debuff, text(` ${debuffT}t`)],
    ],
    verified_status_effects: [
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
  assertSb(card, page, "Captivate", level);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: stats,
    effect_lines: [
      [targetEffects, damage, text(`+${bonus}vs`), mark],
      [targetEffects, text(` ${blightAmt} `), blight, text(` ${blightT}t`)],
    ],
    verified_damage_bonus: {
      lineIndex: 0,
      amount: bonus,
      condition: "marked",
      source: "print_front",
    },
    verified_status_effects: [
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
  assertSb(card, page, "Serpent Sway", level);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (rawSigs[0] !== expectedHeaderRaw || rawSigs[1] !== expectedSelfRaw)
    throw new Error(`${card.id} Serpent Sway 效果行漂移（R-048）`);
  const rangeIcon = iconFromPool(cards, "range");
  const selfEffects = iconFromCard(card, "self_effects");
  const protection = iconFromCard(card, "protection");
  const shuffle = iconFromPool(cards, "shuffle");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" Self")],
      [selfEffects, text(" Self "), protection, text(` ${protectionT}t`)],
      [selfEffects, text(" Self "), shuffle, text(" Pull 1")],
    ],
    unlabeled_numbers: [rangeZeroUnlabeled(rangeIcon), ...card.unlabeled_numbers],
    verified_self_range: true,
    verified_status_effects: [
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
  assertSb(card, page, "Serpent Sway", 3);
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
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: header,
    effect_lines: [
      [selfEffects, text(" Self "), protection, text(" 3t")],
      [selfEffects, text(" Self "), shuffle, text(" Pull 1")],
      [cloneKey(segmentOnCard(card, "1e762d801a"), "target_effects"), protection, text(" 2t")],
    ],
    verified_status_effects: [
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
export function attachVerifiedWealdShieldbreakerHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p316":
        return fixPierce(
          card,
          316,
          1,
          "{range} 2 {target_monster} Crit 1 {damage} 10 Acc 9 {damage} 6",
          "{self_effects}{buff}Self{buff}Pull1",
          "{heal}Ignores{protection}",
        );
      case "hero_skill:p317":
        return fixPierce(
          card,
          317,
          2,
          "{range} 2 {target_monster} Crit 1 {damage} 14 Acc 10 {damage} 9",
          "{self_effects}{buff}Self{buff}Pull1",
          "{heal}Ignores{protection}",
        );
      case "hero_skill:p318":
        return fixPierce(
          card,
          318,
          3,
          "{range} 2 {target_monster} Crit 1 {damage} 17 Acc 11 {damage} 12",
          "{self_effects}{buff}Self{buff}Pull1",
          "{heal}Ignores{protection}",
        );
      case "hero_skill:p319":
        return fixPuncture(
          cards,
          card,
          319,
          1,
          "{range} 2 {target_monster} Crit 0 {damage} 7 Acc 9 {damage} 4",
          "{self_effects}{buff}Self{target_effects}Pull1",
          "{light}Ignores{target_effects},{target_effects}Pull1",
          false,
        );
      case "hero_skill:p320":
        return fixPuncture(
          cards,
          card,
          320,
          2,
          "{range} 1-2 {target_monster} Crit 0 {damage} 8 Acc 10 {damage} 5",
          "{self_effects}{buff}Self{target_effects}Pull1",
          "{light}Ignores{target_effects},{target_effects}Pull1",
          true,
        );
      case "hero_skill:p321":
        return fixPuncture(
          cards,
          card,
          321,
          3,
          "{range} 1-2 {target_monster} Crit 0 {damage} 10 Acc 11 {damage} 7",
          "{self_effects}{buff}Self{target_effects}Pull1",
          "{light}Ignores{target_effects},{target_effects}Pull1",
          true,
        );
      case "hero_skill:p322":
        return fixAddersKiss(
          cards,
          card,
          322,
          1,
          "{range} 0 {target_monster} Crit 1 {damage} 11 Acc 9 {damage} 7",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}2{debuff}2t",
          2,
        );
      case "hero_skill:p323":
        return fixAddersKiss(
          cards,
          card,
          323,
          2,
          "{range} 0 {target_monster} Crit 1 {damage} 16 Acc 10 {damage} 10",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}2{stun}3t",
          3,
        );
      case "hero_skill:p324":
        return fixAddersKiss(
          cards,
          card,
          324,
          3,
          "{range} 0 {target_monster} Crit 1 {damage} 19 Acc 11 {damage} 14",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}2{stun}3t",
          3,
        );
      case "hero_skill:p325":
        return fixImpale(
          cards,
          card,
          325,
          1,
          "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 5 Acc 9 {damage} 3",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}1t",
          1,
        );
      case "hero_skill:p326":
        return fixImpale(
          cards,
          card,
          326,
          2,
          "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 7 Acc 10 {damage} 4",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}2t",
          2,
        );
      case "hero_skill:p327":
        return fixImpale(
          cards,
          card,
          327,
          3,
          "{range} 1 {target_hero} {target_hero} {target_hero} {target_hero} Crit 0 {damage} 9 Acc 11 {damage} 6",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}2t",
          2,
        );
      case "hero_skill:p328":
        return fixExpose(
          card,
          328,
          1,
          "{range} 1 {target_monster} Crit 1 {damage} 9 Acc 8 {damage} 5",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}1t",
          1,
        );
      case "hero_skill:p329":
        return fixExpose(
          card,
          329,
          2,
          "{range} 1 {target_monster} Crit 1 {damage} 10 Acc 9 {damage} 6",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}2t",
          2,
        );
      case "hero_skill:p330":
        return fixExpose(
          card,
          330,
          3,
          "{range} 1 {target_monster} Crit 1 {damage} 12 Acc 10 {damage} 8",
          "{self_effects}{buff}Self{buff}Push1",
          "{target_effects}{debuff}2t",
          2,
        );
      case "hero_skill:p331":
        return fixCaptivate(
          cards,
          card,
          331,
          1,
          "{range} 1 {target_monster} Crit 1 {target_effects} 9 Acc 8 {target_effects} 6",
          "{shuffle}{target_effects}+2vs{damage},2{bleed}2t",
          2,
          2,
          2,
        );
      case "hero_skill:p332":
        return fixCaptivate(
          cards,
          card,
          332,
          2,
          "{range} 1 {target_monster} Crit 1 {target_effects} 12 Acc 9 {target_effects} 8",
          "{shuffle}{target_effects}+4vs{damage},3{bleed}2t",
          4,
          3,
          2,
        );
      case "hero_skill:p333":
        return fixCaptivate(
          cards,
          card,
          333,
          3,
          "{range} 1 {target_monster} Crit 1 {target_effects} 15 Acc 10 {target_effects} 10",
          "{shuffle}{target_effects}+4vs{damage},3{bleed}2t",
          4,
          3,
          2,
        );
      case "hero_skill:p334":
        return fixSerpentSwaySelf(
          cards,
          card,
          334,
          1,
          "{range}{buff}Self",
          "{self_effects}{buff}Self{protection}2t,{mark}Pull1",
          2,
        );
      case "hero_skill:p335":
        return fixSerpentSwaySelf(
          cards,
          card,
          335,
          2,
          "{range}{buff}Self",
          "{self_effects}{buff}Self{protection}3t,{mark}Pull1",
          3,
        );
      case "hero_skill:p336":
        return fixSerpentSwayIii(
          cards,
          card,
          336,
          "{range} 1 {target_hero}",
          "{self_effects}{buff}Self{mark}3t,{mark}Pull1",
          "{shuffle}{mark}2t",
        );
      default:
        return card;
    }
  });
}
