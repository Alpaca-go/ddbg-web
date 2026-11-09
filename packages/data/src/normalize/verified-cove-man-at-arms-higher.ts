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
  const pools = [
    ...(card.stats_line ?? []),
    ...card.effect_lines.flat(),
    ...card.front_icons.map((icon) => ({ type: "icon" as const, icon })),
  ];
  for (const segment of pools) {
    if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

function assertMaa(card: NormalizedHeroSkillCard, page: number, name: string, level: number) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "MAN-AT-ARMS" ||
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

function stressMinusOneAnchor(stressIcon: IconSegment, textValue = "-1") {
  return {
    text: textValue,
    numeric: -1,
    anchor: {
      type: "beside_icon" as const,
      left_icon: stressIcon.icon,
      inside_icon: null,
    },
  };
}

function fixRampart(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  pushDist: string,
  expectedTargetSig: string,
  expectedSelfRaw: string,
) {
  assertMaa(card, page, "Rampart", level);
  const targetSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  const selfRaw = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
  if (targetSig !== expectedTargetSig || selfRaw !== expectedSelfRaw)
    throw new Error(`${card.id} Rampart 效果行漂移（R-048）`);
  const targetEffects = iconFromCard(card, "target_effects");
  const stun = iconFromCard(card, "stun");
  const shuffle = iconFromCard(card, "shuffle");
  const selfEffects = iconFromCard(card, "self_effects");
  const pullMis = segmentOnCard(card, "d4329c2a97");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [targetEffects, text(" "), stun, text(" 1t, "), shuffle, text(` ${pushDist}`)],
      [selfEffects, text(" Self "), cloneKey(pullMis, "shuffle"), text(" Pull 1")],
    ],
    verified_status_effects: [
      {
        lineIndex: 0,
        segmentIndex: 2,
        scope: "target",
        kind: "stun",
        duration: 1,
      },
    ],
  });
}

function fixBellow(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  debuffT: number,
) {
  assertMaa(card, page, "Bellow", level);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  const expectedStats: Record<number, string> = {
    1: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0Acc9",
    2: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit0Acc10",
    3: "{range}1{target_hero}{target_hero}{target_hero}{target_hero}Crit1Acc11",
  };
  if (statsSig !== expectedStats[level]) throw new Error(`${card.id} Bellow stats 漂移`);
  if (effSig !== `{target_effects}{debuff}${debuffT}t`)
    throw new Error(`${card.id} Bellow 效果行漂移`);
  const debuff = iconFromCard(card, "debuff");
  const targetMonster = iconFromPool(cards, "target_monster");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: card.stats_line!.map((segment) =>
      segment.type === "icon" && segment.icon.key === "target_hero" ? targetMonster : segment,
    ),
    verified_status_effects: [
      {
        lineIndex: 0,
        segmentIndex: 2,
        scope: "target",
        kind: "debuff",
        duration: debuffT,
      },
    ],
  });
}

function fixDefender(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  rawRiposteT: number,
  rawShuffleT: number,
  guardT: number,
  protectionT: number,
) {
  assertMaa(card, page, "Defender", level);
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (
    rawSigs[0] !== "{range}{buff}Self" ||
    rawSigs[1] !== `{self_effects}{buff}Self{riposte}${rawRiposteT}t,{shuffle}${rawShuffleT}t`
  )
    throw new Error(`${card.id} Defender 效果行漂移（R-048）`);
  const rangeIcon = iconFromCard(card, "range");
  const selfEffects = iconFromCard(card, "self_effects");
  const riposteMis = segmentOnCard(card, "a0290ad4ce");
  const shuffleMis = segmentOnCard(card, "ac56561b87");
  iconFromPool(cards, "protection");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" Self")],
      [selfEffects, text(" Self "), cloneKey(riposteMis, "guard"), text(` ${guardT}t`)],
      [selfEffects, text(" Self "), cloneKey(shuffleMis, "protection"), text(` ${protectionT}t`)],
    ],
    unlabeled_numbers: [rangeZeroUnlabeled(rangeIcon), ...card.unlabeled_numbers],
    verified_self_range: true,
    verified_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "self",
        kind: "guard",
        duration: guardT,
      },
      {
        lineIndex: 2,
        segmentIndex: 2,
        scope: "self",
        kind: "protection",
        duration: protectionT,
      },
    ],
  });
}

function fixRetribution(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  markT: number,
  riposteT: number,
  expectedSelfRaw: string,
) {
  assertMaa(card, page, "Retribution", level);
  const raw = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (raw !== expectedSelfRaw) throw new Error(`${card.id} Retribution 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const stressMis = segmentOnCard(card, "9d58d3d431");
  const markMis = segmentOnCard(card, "1ce58a493c");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(stressMis, "mark"), text(` ${markT}t`)],
      [selfEffects, text(" Self "), cloneKey(markMis, "riposte"), text(` ${riposteT}t`)],
    ],
    verified_range: { min: 1, max: 2, source: "print_front" },
    verified_status_effects: [
      {
        lineIndex: 0,
        segmentIndex: 2,
        scope: "self",
        kind: "mark",
        duration: markT,
      },
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "self",
        kind: "riposte",
        duration: riposteT,
      },
    ],
  });
}

function fixCommand(
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
  targetCount: number,
  stunT: number,
) {
  assertMaa(card, page, "Command", level);
  const expectedHeader = `{range}1${"{target_hero}".repeat(targetCount)}`;
  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (
    rawSigs[0] !== expectedHeader ||
    rawSigs[1] !== `{self_effects}{buff}Self{stun}${stunT}t` ||
    rawSigs[2] !== `{target_effects}{stun}${stunT}t`
  )
    throw new Error(`${card.id} Command 效果行漂移（R-048）`);
  const rangeIcon = iconFromCard(card, "range");
  const targetHero = iconFromPool([card], "target_hero");
  const selfEffects = iconFromCard(card, "self_effects");
  const targetEffects = iconFromCard(card, "target_effects");
  const stun = iconFromCard(card, "stun");
  const header: Segment[] = [rangeIcon, text(" 1 ")];
  for (let i = 0; i < targetCount; i += 1) {
    if (i > 0) header.push(text(" "));
    header.push(targetHero);
  }
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: null,
    effect_lines: [
      header,
      [selfEffects, text(" Self "), stun, text(` ${stunT}t`)],
      [targetEffects, text(" "), stun, text(` ${stunT}t`)],
    ],
    verified_target_header: { lineIndex: 0, source: "print_front" },
    verified_status_effects: [
      {
        lineIndex: 1,
        segmentIndex: 2,
        scope: "self",
        kind: "stun",
        duration: stunT,
      },
      {
        lineIndex: 2,
        segmentIndex: 2,
        scope: "target",
        kind: "stun",
        duration: stunT,
      },
    ],
  });
}

function fixBolster(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  page: number,
  level: number,
) {
  assertMaa(card, page, "Bolster", level);
  const stressIcon = iconFromPool(cards, "stress");
  const selfEffects = iconFromCard(card, "self_effects");
  const targetEffects = iconFromPool(cards, "target_effects");
  const stressMis = card.effect_lines.some((line) =>
    line.some((s) => s.type === "icon" && s.icon.iconId === "f18923574c"),
  )
    ? segmentOnCard(card, "f18923574c")
    : stressIcon;

  const anchors = [stressMinusOneAnchor(stressIcon), stressMinusOneAnchor(stressIcon)];
  if (level === 2) {
    const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
    if (statsSig !== "Crit1Acc14") throw new Error(`${card.id} Bolster stats 漂移（R-048）`);
    const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
    if (
      rawSigs[0] !== "{self_effects}{buff}Self{skill_art}-1" ||
      rawSigs[1] !== "{shuffle}{skill_art}-1"
    )
      throw new Error(`${card.id} Bolster II 效果行漂移（R-048）`);
    return normalizedHeroSkillCardSchema.parse({
      ...card,
      effect_lines: [
        [selfEffects, text(" Self "), stressIcon, text(" -1")],
        [targetEffects, text(" "), cloneKey(stressMis, "stress"), text(" -1")],
      ],
      unlabeled_numbers: [...card.unlabeled_numbers, ...anchors],
      verified_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
      verified_allies_stress: -1,
    });
  }
  if (level === 3) {
    const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
    if (statsSig !== "{range}1{target_hero}{target_hero}{target_hero}Crit2Acc16")
      throw new Error(`${card.id} Bolster stats 漂移（R-048）`);
    const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
    if (
      rawSigs[0] !== "{self_effects}{buff}Self{skill_art}-1" ||
      rawSigs[1] !== "{shuffle}{skill_art}-1"
    )
      throw new Error(`${card.id} Bolster III 效果行漂移（R-048）`);
    return normalizedHeroSkillCardSchema.parse({
      ...card,
      effect_lines: [
        [selfEffects, text(" Self "), stressIcon, text(" -1")],
        [targetEffects, text(" "), cloneKey(stressMis, "stress"), text(" -1")],
      ],
      unlabeled_numbers: [...card.unlabeled_numbers, ...anchors],
      verified_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
      verified_allies_stress: -1,
    });
  }

  const rawSigs = card.effect_lines.map((line) => lineSignature(line).replace(/\s+/g, ""));
  if (
    rawSigs[0] !== "{self_effects}{buff}Self{skill_art}-1" ||
    rawSigs[1] !== "{shuffle}{skill_art}-1"
  )
    throw new Error(`${card.id} Bolster I 效果行漂移（R-048）`);
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: card.stats_line,
    effect_lines: [
      [selfEffects, text(" Self "), stressIcon, text(" -1")],
      [targetEffects, text(" "), cloneKey(stressMis, "stress"), text(" -1")],
    ],
    unlabeled_numbers: [...card.unlabeled_numbers, ...anchors],
    verified_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
    verified_allies_stress: -1,
  });
}

/**
 * R-200：Man-at-Arms L1–III 技能族（TDH p232–252）逐卡覆盖；II/III 共 14 张 + 同族 L1 OCR 洗净。
 * Retribution / Defender 见 Q-176 / Q-177（Mark+Riposte、Guard+Protection）。
 */
export function attachVerifiedCoveManAtArmsHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p235":
        return fixRampart(
          card,
          235,
          1,
          "Push 1",
          "{target_effects}{stun}1t,{shuffle}Push1",
          "{self_effects}{buff}Self{buff}Pull1",
        );
      case "hero_skill:p236":
        return fixRampart(
          card,
          236,
          2,
          "Push 2",
          "{target_effects}{stun}1t,{shuffle}Push2",
          "{self_effects}{buff}Self{buff}Pull1",
        );
      case "hero_skill:p237":
        return fixRampart(
          card,
          237,
          3,
          "Push 2",
          "{target_effects}{stun}1t,{shuffle}Push2",
          "{self_effects}{buff}Self{buff}Pull1",
        );
      case "hero_skill:p238":
        return fixBellow(cards, card, 238, 1, 1);
      case "hero_skill:p239":
        return fixBellow(cards, card, 239, 2, 2);
      case "hero_skill:p240":
        return fixBellow(cards, card, 240, 3, 3);
      case "hero_skill:p241":
        return fixDefender(cards, card, 241, 1, 1, 2, 2, 3);
      case "hero_skill:p242":
        return fixDefender(cards, card, 242, 2, 2, 2, 2, 2);
      case "hero_skill:p243":
        return fixDefender(cards, card, 243, 3, 2, 3, 2, 3);
      case "hero_skill:p244":
        return fixRetribution(card, 244, 1, 2, 2, "{self_effects}{buff}Self{stress}2t,{mark}2t");
      case "hero_skill:p245":
        return fixRetribution(card, 245, 2, 2, 3, "{self_effects}{buff}Self{stress}2t,{mark}3t");
      case "hero_skill:p246":
        return fixRetribution(card, 246, 3, 2, 3, "{self_effects}{buff}Self{stress}2t,{mark}3t");
      case "hero_skill:p247":
        return fixCommand(card, 247, 1, 1, 2);
      case "hero_skill:p248":
        return fixCommand(card, 248, 2, 2, 2);
      case "hero_skill:p249":
        return fixCommand(card, 249, 3, 3, 3);
      case "hero_skill:p250":
        return fixBolster(cards, card, 250, 1);
      case "hero_skill:p251":
        return fixBolster(cards, card, 251, 2);
      case "hero_skill:p252":
        return fixBolster(cards, card, 252, 3);
      default:
        return card;
    }
  });
}
