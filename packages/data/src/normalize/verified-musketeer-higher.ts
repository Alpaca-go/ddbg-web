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

function assertMus(
  card: NormalizedHeroSkillCard,
  slug: string,
  name: string,
  level: number,
  page: number,
) {
  if (
    card.id !== `hero_skill:musketeer:${slug}` ||
    card.hero !== "MUSKETEER" ||
    card.name !== name ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

function fixHealStatsLine(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  expectedStats: string,
): NonNullable<NormalizedHeroSkillCard["stats_line"]> {
  const stats = card.stats_line;
  const sig = stats ? lineSignature(stats).replace(/\s+/g, "") : "";
  if (sig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} stats_line 漂移（R-048）`);
  const heal = iconFromPool(cards, "heal");
  return stats!.map((segment) => {
    if (segment.type !== "icon") return segment;
    if (segment.icon.key === "damage" || segment.icon.key === "damage_or_heal_combined_marker")
      return heal;
    if (segment.icon.iconId === "7616568d52") return iconFromCard(card, "target_hero");
    return segment;
  });
}

function fixAimedShot(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  expectedStats: string,
  expectedEffRaw: string,
  bonus: number,
) {
  assertMus(card, slug, "Aimed Shot", level, page);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Aimed Shot stats 漂移（R-048）`);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Aimed Shot 效果行漂移（R-048）`);
  const targetEffects = iconFromPool(cards, "target_effects");
  const damageMis = segmentOnCard(card, "f18923574c");
  const damage = iconFromPool(cards, "damage");
  const markMis = segmentOnCard(card, "98edfaca0a");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [
        targetEffects,
        text(" "),
        cloneKey(damageMis, "damage"),
        text(` +${bonus} vs `),
        cloneKey(markMis, "mark"),
      ],
    ],
    verified_damage_bonus: {
      lineIndex: 0,
      amount: bonus,
      condition: "marked",
      source: "print_front",
    },
  });
}

function fixSmokescreenDebuff(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  expectedStats: string,
  expectedEffRaw: string,
  misIconId: string,
  debuffT: number,
) {
  assertMus(card, slug, "Smokescreen", level, page);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Smokescreen stats 漂移（R-048）`);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Smokescreen 效果行漂移（R-048）`);
  const targetEffects = iconFromPool(cards, "target_effects");
  const debuff = iconFromPool(cards, "debuff");
  segmentOnCard(card, misIconId);
  const flags =
    level > 1
      ? {
          verified_range: { min: 1, max: 2, source: "print_front" as const },
          verified_status_effects: [
            {
              lineIndex: 0,
              segmentIndex: 2,
              scope: "target" as const,
              kind: "debuff" as const,
              duration: debuffT,
            },
          ],
        }
      : {
          verified_status_effects: [
            {
              lineIndex: 0,
              segmentIndex: 2,
              scope: "target" as const,
              kind: "debuff" as const,
              duration: debuffT,
            },
          ],
        };
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [[targetEffects, text(" "), debuff, text(` ${debuffT}t`)]],
    ...flags,
  });
}

function fixSmokescreenL1MarkProtection(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  expectedStats: string,
  expectedEffRaw: string,
) {
  assertMus(card, "p004", "Smokescreen", 1, 4);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Smokescreen stats 漂移（R-048）`);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Smokescreen 效果行漂移（R-048）`);
  const targetEffects = iconFromPool(cards, "target_effects");
  const mark = iconFromCard(card, "mark");
  const protection = iconFromCard(card, "protection");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [targetEffects, text(" "), mark, text(" 1t"), text(" "), protection, text(" 1t")],
    ],
    verified_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "mark", duration: 1 },
      { lineIndex: 0, segmentIndex: 5, scope: "target", kind: "protection", duration: 1 },
    ],
  });
}

function fixCallTheShot(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  acc: number,
  expectedEffRaw: string,
  debuffT: number,
) {
  assertMus(card, slug, "Call the Shot", level, page);
  if (card.printed_labels.find((l) => l.label === "Acc")?.value !== acc)
    throw new Error(`${card.id} Call the Shot Acc 漂移（R-048）`);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Call the Shot 效果行漂移（R-048）`);
  const targetEffects = iconFromPool(cards, "target_effects");
  const debuff = iconFromCard(card, "debuff");
  const range =
    level > 1
      ? { verified_range: { min: 1, max: 2, source: "print_front" as const } }
      : {};
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [[targetEffects, text(" "), debuff, text(` ${debuffT}t`)]],
    verified_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "debuff", duration: debuffT },
    ],
    ...range,
  });
}

function fixBuckshot(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  expectedStats: string,
  selfPush: number,
  expectedSelfRaw: string,
  expectedTargetRaw: string,
) {
  assertMus(card, slug, "Buckshot", level, page);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Buckshot stats 漂移（R-048）`);
  const selfSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  const tgtSig = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
  if (selfSig !== expectedSelfRaw.replace(/\s+/g, "") || tgtSig !== expectedTargetRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Buckshot 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const pushMis = segmentOnCard(card, "d4329c2a97");
  const shuffle = iconFromPool(cards, "shuffle");
  const targetEffects = iconFromPool(cards, "target_effects");
  const targetShuffle = segmentOnCard(card, "1fd9f6ec6d");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(pushMis, "shuffle"), text(` Push ${selfPush}`)],
      [cloneKey(targetShuffle, "shuffle"), text(" "), targetEffects, text(" Push 2")],
    ],
  });
}

function fixSidearm(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  expectedStats: string,
  expectedEffRaw: string,
  push: number,
) {
  assertMus(card, slug, "Sidearm", level, page);
  const statsSig = card.stats_line ? lineSignature(card.stats_line).replace(/\s+/g, "") : "";
  if (statsSig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} Sidearm stats 漂移（R-048）`);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Sidearm 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const shuffleMis = segmentOnCard(card, "f18923574c");
  const shuffle = iconFromPool(cards, "shuffle");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [[selfEffects, text(" Self "), cloneKey(shuffleMis, "shuffle"), text(` Push ${push}`)]],
    verified_range: { min: 0, max: 2, source: "print_front" },
  });
}

function fixPatchUp(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  expectedStats: string,
  expectedEffRaw: string,
) {
  assertMus(card, slug, "Patch Up", level, page);
  const effSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (effSig !== expectedEffRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Patch Up 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const buffMis = segmentOnCard(card, "d4329c2a97");
  const buff = iconFromPool(cards, "buff");
  const statsLine = fixHealStatsLine(cards, card, expectedStats);
  const range =
    level > 1
      ? { verified_range: { min: 0, max: 1, source: "print_front" as const } }
      : {};
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: statsLine,
    effect_lines: [[selfEffects, text(" Self "), cloneKey(buffMis, "buff"), text(" 2t")]],
    verified_status_effects: [
      { lineIndex: 0, segmentIndex: 2, scope: "self", kind: "buff", duration: 2 },
    ],
    ...range,
  });
}

function fixSkeetEffectLines(
  cards: readonly NormalizedHeroSkillCard[],
  card: NormalizedHeroSkillCard,
  slug: string,
  level: number,
  page: number,
  acc: number,
  expectedSelfRaw: string,
  expectedMonsterRaw: string,
) {
  assertMus(card, slug, "Skeet Shot", level, page);
  if (card.printed_labels.find((l) => l.label === "Acc")?.value !== acc)
    throw new Error(`${card.id} Skeet Shot Acc 漂移（R-048）`);
  const selfSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  const monsterSig = lineSignature(card.effect_lines[1]!).replace(/\s+/g, "");
  if (selfSig !== expectedSelfRaw.replace(/\s+/g, "") || monsterSig !== expectedMonsterRaw.replace(/\s+/g, ""))
    throw new Error(`${card.id} Skeet Shot 效果行漂移（R-048）`);
  const selfEffects = iconFromCard(card, "self_effects");
  const stun = iconFromPool(cards, "stun");
  const mark = iconFromPool(cards, "mark");
  const targetEffects = iconFromPool(cards, "target_effects");
  const targetHero = iconFromPool(cards, "target_hero");
  const shuffle = iconFromPool(cards, "shuffle");
  const targetMonster = iconFromPool(cards, "target_monster");
  const debuff = iconFromPool(cards, "debuff");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [
        selfEffects,
        text(" Self Remove "),
        stun,
        text(" "),
        mark,
        text(" "),
        targetEffects,
        text(" "),
        targetHero,
        text(" : Remove "),
        stun,
        text(" "),
        mark,
      ],
      [targetMonster, text(" : "), debuff, text(" 2t")],
    ],
    verified_range:
      level > 1 ? { min: 1, max: 2, source: "print_front" } : undefined,
  });
}

/**
 * R-200：Musketeer I–III 七技能族（21 张）；II/III 十四张 + 同族 L1 OCR 洗净。
 * Smokescreen L1 按 Q-185 待确认保留 Mark+Protection 读法；L2/L3 洗掉 skill_art OCR 接 Debuff。
 * Call the Shot 同源差异：目标 Debuff（非 Arbalest Sniper's Mark）。
 */
export function attachVerifiedMusketeerHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:musketeer:p001":
        return fixAimedShot(
          cards,
          card,
          "p001",
          1,
          1,
          "{range} 2 {target_monster} Crit 1 {damage} 9 Acc 9 {damage} 6",
          "{target_effects}{shuffle}+3vs{blight}",
          3,
        );
      case "hero_skill:musketeer:p002":
        return fixAimedShot(
          cards,
          card,
          "p002",
          2,
          2,
          "{range} 2 {target_monster} Crit 1 {damage} 12 Acc 10 {damage} 8",
          "{target_effects}{shuffle}+5vs{blight}",
          5,
        );
      case "hero_skill:musketeer:p003":
        return fixAimedShot(
          cards,
          card,
          "p003",
          3,
          3,
          "{range} 2 {target_monster} Crit 1 {damage} 16 Acc 11 {damage} 10",
          "{target_effects}{shuffle}+9vs{blight}",
          9,
        );
      case "hero_skill:musketeer:p004":
        return fixSmokescreenL1MarkProtection(
          cards,
          card,
          "{range} 1-2 {target_monster} {target_monster} Crit 0 {damage} 4 Acc 9 {damage} 2",
          "{mark}{protection}1t",
        );
      case "hero_skill:musketeer:p005":
        return fixSmokescreenDebuff(
          cards,
          card,
          "p005",
          2,
          5,
          "{range} 1-2 {target_monster} {target_monster} Crit 0 {damage} 6 Acc 10 {damage} 3",
          "{skill_art}{protection}2t",
          "462bd48a91",
          2,
        );
      case "hero_skill:musketeer:p006":
        return fixSmokescreenDebuff(
          cards,
          card,
          "p006",
          3,
          6,
          "{range} 1-2 {target_monster} {target_monster} Crit 0 {damage} 7 Acc 11 {damage} 4",
          "{skill_art}{bleed}3t",
          "462bd48a91",
          3,
        );
      case "hero_skill:musketeer:p007":
        return fixCallTheShot(
          cards,
          card,
          "p007",
          1,
          7,
          10,
          "{target_effects}{debuff}2t",
          2,
        );
      case "hero_skill:musketeer:p008":
        return fixCallTheShot(
          cards,
          card,
          "p008",
          2,
          8,
          11,
          "{target_effects}{debuff}3t",
          3,
        );
      case "hero_skill:musketeer:p009":
        return fixCallTheShot(
          cards,
          card,
          "p009",
          3,
          9,
          12,
          "{target_effects}{debuff}4t",
          4,
        );
      case "hero_skill:musketeer:p010":
        return fixBuckshot(
          cards,
          card,
          "p010",
          1,
          10,
          "{range} 1 {target_monster} {target_monster} Crit 1 {damage} 6 Acc 10 {damage} 3",
          1,
          "{self_effects}{buff}Self{buff}Push1",
          "{stun}{target_effects}Push2",
        );
      case "hero_skill:musketeer:p011":
        return fixBuckshot(
          cards,
          card,
          "p011",
          2,
          11,
          "{range} 1 {target_monster} {target_monster} Crit 1 {damage} 8 Acc 11 {damage} 4",
          2,
          "{self_effects}{buff}Self{buff}Push2",
          "{stun}{target_effects}Push2",
        );
      case "hero_skill:musketeer:p012":
        return fixBuckshot(
          cards,
          card,
          "p012",
          3,
          12,
          "{range} 1 {target_monster} {target_monster} Crit 1 {damage} 9 Acc 12 {damage} 5",
          2,
          "{self_effects}{buff}Self{buff}Push2",
          "{stun}{target_effects}Push2",
        );
      case "hero_skill:musketeer:p013":
        return fixSidearm(
          cards,
          card,
          "p013",
          1,
          13,
          "{range} 0-2 {target_monster} Crit 0 {damage} 8 Acc 8 {damage} 5",
          "{self_effects}{buff}Self{shuffle}Push1",
          1,
        );
      case "hero_skill:musketeer:p014":
        return fixSidearm(
          cards,
          card,
          "p014",
          2,
          14,
          "{range} 0-2 {target_monster} Crit 0 {damage} 11 Acc 9 {damage} 6",
          "{self_effects}{buff}Self{shuffle}Push2",
          2,
        );
      case "hero_skill:musketeer:p015":
        return fixSidearm(
          cards,
          card,
          "p015",
          3,
          15,
          "{range} 0-2 {target_monster} Crit 0 {damage} 14 Acc 10 {damage} 8",
          "{self_effects}{buff}Self{shuffle}Push2",
          2,
        );
      case "hero_skill:musketeer:p016":
        return fixPatchUp(
          cards,
          card,
          "p016",
          1,
          16,
          "{range} 0-1 {target_hero} Crit 0 {damage_or_heal_combined_marker} {damage} 6 Acc 8 {damage_or_heal_combined_marker} {damage} 4",
          "{self_effects}{buff}Self{buff}2t",
        );
      case "hero_skill:musketeer:p017":
        return fixPatchUp(
          cards,
          card,
          "p017",
          2,
          17,
          "{range} 0-1 {target_hero} Crit 0 {damage_or_heal_combined_marker} {damage} 8 Acc 9 {damage_or_heal_combined_marker} {damage} 5",
          "{self_effects}{buff}Self{buff}2t",
        );
      case "hero_skill:musketeer:p018":
        return fixPatchUp(
          cards,
          card,
          "p018",
          3,
          18,
          "{range} 0-1 {target_hero} Crit 0 {damage_or_heal_combined_marker} 10 {damage} Acc 10 {damage_or_heal_combined_marker} {damage} 7",
          "{self_effects}{buff}Self{buff}2t",
        );
      case "hero_skill:musketeer:p019":
        return fixSkeetEffectLines(
          cards,
          card,
          "p019",
          1,
          19,
          10,
          "{self_effects}{blight}SelfRemove{stun}{mark}{target_effects}{target_effects}:Remove{stun}{mark}",
          "{target_monster}:{debuff}2t",
        );
      case "hero_skill:musketeer:p020":
        return fixSkeetEffectLines(
          cards,
          card,
          "p020",
          2,
          20,
          11,
          "{self_effects}{blight}SelfRemove{stun}{mark}{target_effects}{target_effects}:Remove{stun}{mark}",
          "{target_monster}:{debuff}2t",
        );
      case "hero_skill:musketeer:p021":
        return fixSkeetEffectLines(
          cards,
          card,
          "p021",
          3,
          21,
          12,
          "{self_effects}{blight}SelfRemove{stun}{mark}{target_effects}{target_effects}:Remove{stun}{mark}",
          "{target_monster}:{debuff}2t",
        );
      default:
        return card;
    }
  });
}
