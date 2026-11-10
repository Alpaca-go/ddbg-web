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

function assertFlagellant(
  card: NormalizedHeroSkillCard,
  page: number,
  name: string,
  level: number,
) {
  if (
    card.id !== `hero_skill:p${page}` ||
    card.hero !== "FLAGELLANT" ||
    card.name !== name ||
    card.level !== level ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

function fixStatsDamageBuff(card: NormalizedHeroSkillCard, expectedStats: string) {
  const stats = card.stats_line;
  const sig = stats ? lineSignature(stats).replace(/\s+/g, "") : "";
  if (sig !== expectedStats.replace(/\s+/g, ""))
    throw new Error(`${card.id} stats_line 漂移（R-048）`);
  return stats!.map((segment) =>
    segment.type === "icon" && segment.icon.key === "buff" ? cloneKey(segment, "damage") : segment,
  );
}

function actorBonusLine(pool: readonly NormalizedHeroSkillCard[], bonus: number): Segment[] {
  const damage = iconFromPool(pool, "damage");
  const bleed = iconFromPool(pool, "bleed");
  const blight = iconFromPool(pool, "blight");
  return [damage, text(` +${bonus} if Flagellant has `), bleed, text(" "), blight, text(" ,")];
}

function fixPunishFamily(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  expectedStats: string,
  bleedAmount: number,
  bleedT: number,
  actorBonus: number,
) {
  assertFlagellant(card, page, "Punish", level);
  const targetEffects = iconFromPool(pool, "target_effects");
  const bleed = iconFromPool(pool, "bleed");
  const debuff = iconFromPool(pool, "debuff");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: fixStatsDamageBuff(card, expectedStats),
    effect_lines: [
      actorBonusLine(pool, actorBonus),
      [targetEffects, text(` ${bleedAmount} `), bleed, text(` ${bleedT}t, `), debuff, text(" 1t")],
    ],
    verified_actor_damage_bonus: { lineIndex: 0, amount: actorBonus, source: "print_front" },
  });
}

function fixRainFamily(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  expectedStats: string,
  blightAmount: number,
  blightT: number,
  actorBonus: number,
) {
  assertFlagellant(card, page, "Rain of Sorrows", level);
  const targetEffects = iconFromPool(pool, "target_effects");
  const blight = iconFromPool(pool, "blight");
  const condSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (condSig !== `{blight}{buff}+${actorBonus}ifFlagellanthas{stun}{mark},`)
    throw new Error(`${card.id} Rain 条件行漂移（R-048）`);
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: fixStatsDamageBuff(card, expectedStats),
    effect_lines: [
      actorBonusLine(pool, actorBonus),
      [targetEffects, text(` ${blightAmount} `), blight, text(` ${blightT}t`)],
    ],
    verified_actor_damage_bonus: { lineIndex: 0, amount: actorBonus, source: "print_front" },
  });
}

function fixExsanguinate(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  selfHeal: number,
  targetBleed: number,
  targetT: number,
) {
  assertFlagellant(card, page, "Exsanguinate", level);
  const statsSig = lineSignature(card.stats_line!)!.replace(/\s+/g, "");
  const expectedStats = `{range} 1 {target_monster} Crit 1 {damage} ${
    level === 1
      ? "7 Acc 9 {damage} 4"
      : level === 2
        ? "9 Acc 10 {damage} 6"
        : "12 Acc 11 {damage} 8"
  }`.replace(/\s+/g, "");
  if (statsSig !== expectedStats) throw new Error(`${card.id} Exsanguinate stats 漂移`);
  const selfEffects = iconFromCard(card, "self_effects");
  const heal = iconFromCard(card, "heal");
  const bleed = iconFromPool(pool, "bleed");
  const debuff = iconFromPool(pool, "debuff");
  const targetEffects = iconFromPool(pool, "target_effects");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), heal, text(` ${selfHeal}, `), debuff, text(" 1t")],
      [targetEffects, text(` ${targetBleed} `), bleed, text(` ${targetT}t`)],
    ],
    verified_self_heal: { lineIndex: 0, amount: selfHeal, source: "print_front" },
  });
}

function fixReclaim(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  expectedStats: string,
  selfHeal: boolean,
) {
  assertFlagellant(card, page, "Reclaim", level);
  const statsSig = lineSignature(card.stats_line!)!.replace(/\s+/g, "");
  if (statsSig !== expectedStats.replace(/\s+/g, "")) {
    if (!statsSig.startsWith("{range}0-1{target_hero}Crit2"))
      throw new Error(`${card.id} Reclaim stats 漂移`);
  }
  const healMarker = iconFromPool(pool, "damage_or_heal_combined_marker");
  const heal = iconFromPool(pool, "heal");
  const stats = card.stats_line!.map((segment) => {
    if (
      segment.type === "icon" &&
      segment.icon.key &&
      ["buff", "heal"].includes(segment.icon.key)
    ) {
      if (segment.icon.key === "buff")
        return cloneKey(healMarker, "damage_or_heal_combined_marker");
      return heal;
    }
    return segment;
  });
  const selfEffects = iconFromCard(card, "self_effects");
  if (!selfHeal) {
    const bleed = iconFromPool(pool, "bleed");
    return normalizedHeroSkillCardSchema.parse({
      ...card,
      stats_line: stats,
      effect_lines: [[selfEffects, text(" Self 1 "), bleed, text(" 3t")]],
    });
  }
  const bleedMis = segmentOnCard(card, "ac56561b87");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: stats,
    effect_lines: [
      [selfEffects, text(" Self "), heal, text(" 5, 1 "), cloneKey(bleedMis, "bleed"), text(" 3t")],
    ],
    verified_self_heal: { lineIndex: 0, amount: 5, source: "print_front" },
  });
}

function fixEndure(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: 1 | 2 | 3,
) {
  assertFlagellant(card, page, "Endure", level);
  const spec = {
    1: { crit: 0, acc: 12, range: "1" as const, interval: undefined },
    2: { crit: 0, acc: 14, range: "1-2" as const, interval: { min: 1, max: 2 } as const },
    3: { crit: 1, acc: 16, range: "1-2" as const, interval: { min: 1, max: 2 } as const },
  }[level];
  const rangeIcon = iconFromPool(pool, "range");
  const targetHero = iconFromPool(pool, "target_hero");
  const stressIcon = iconFromPool(pool, "stress");
  const selfEffects = iconFromCard(card, "self_effects");
  const artMis = segmentOnCard(card, "0fa747a534");
  const raw0 = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (raw0 !== `{self_effects}{buff}Self{skill_art}-1`)
    throw new Error(`${card.id} Endure 自身行漂移（R-048）`);
  const statsLine: Segment[] = [
    rangeIcon,
    text(` ${spec.range} `),
    targetHero,
    text(` Crit ${spec.crit} Acc ${spec.acc}`),
  ];
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    printed_labels: [
      { label: "Crit", raw: `Crit ${spec.crit}`, value: spec.crit },
      { label: "Acc", raw: `Acc ${spec.acc}`, value: spec.acc },
    ],
    stats_line: statsLine,
    effect_lines: [
      [selfEffects, text(" Self "), cloneKey(artMis, "stress"), text(" -1")],
      [iconFromPool(pool, "target_effects"), text(" "), stressIcon, text(" -1")],
    ],
    verified_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
    verified_target_stress: { lineIndex: 1, amount: -1, source: "print_front" },
    ...(spec.interval
      ? { verified_range: { ...spec.interval, source: "print_front" as const } }
      : {}),
  });
}

function fixRedeem(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  healAmount: number,
) {
  assertFlagellant(card, page, "Redeem", level);
  const rangeIcon = iconFromPool(pool, "range");
  const targetHero = iconFromPool(pool, "target_hero");
  const selfEffects = iconFromCard(card, "self_effects");
  const heal = iconFromPool(pool, "heal");
  const targetEffects = iconFromCard(card, "target_effects");
  const debuff = iconFromPool(pool, "debuff");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" 1 "), targetHero],
      [selfEffects, text(" Self "), heal, text(` ${healAmount}`)],
      [targetEffects, heal, text(String(healAmount))],
      [selfEffects, text(" Self "), debuff, text(" 1t")],
    ],
    verified_self_heal: { lineIndex: 1, amount: healAmount, source: "print_front" },
    verified_target_heal: { lineIndex: 2, amount: healAmount, source: "print_front" },
    verified_target_header: { lineIndex: 0, source: "print_front" },
    verified_status_effects: [
      { lineIndex: 3, segmentIndex: 2, scope: "self", kind: "debuff", duration: 1 },
    ],
  });
}

function fixSuffer(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: number,
  markT: number,
  buffT: number,
) {
  assertFlagellant(card, page, "Suffer", level);
  const rangeIcon = iconFromPool(pool, "range");
  const targetHero = iconFromPool(pool, "target_hero");
  const selfEffects = iconFromCard(card, "self_effects");
  const buff = iconFromCard(card, "buff");
  const mark = iconFromPool(pool, "mark");
  const bleed = iconFromPool(pool, "bleed");
  const blight = iconFromPool(pool, "blight");
  const targetEffects = iconFromPool(pool, "target_effects");
  const transferLine: Segment[] = [
    targetEffects,
    text(" Transfer all "),
    bleed,
    text(" or "),
    blight,
  ];
  const transferSignature = lineSignature(transferLine).replace(/\s+/g, "");
  return normalizedHeroSkillCardSchema.parse({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" 1 "), targetHero],
      transferLine,
      card.effect_lines[2]!,
      [selfEffects, text(" Self "), mark, text(` ${markT}t, `), buff, text(` ${buffT}t`)],
      [text("to the Flagellant.")],
    ],
    verified_target_header: { lineIndex: 0, source: "print_front" },
    verified_bleed_blight_transfer: {
      lineIndex: 1,
      signature: transferSignature,
      source: "print_front",
    },
    verified_effect_line_receipts: [
      { lineIndex: 2, signature: lineSignature(card.effect_lines[2]!), source: "print_front" },
      { lineIndex: 4, signature: "to the Flagellant.", source: "print_front" },
    ],
  });
}

/**
 * R-200 / Q-172～175：Flagellant I–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 */
export function attachVerifiedCoveFlagellantHigher(
  cards: readonly NormalizedHeroSkillCard[],
): NormalizedHeroSkillCard[] {
  return cards.map((card) => {
    switch (card.id) {
      case "hero_skill:p253":
        return fixPunishFamily(
          card,
          cards,
          253,
          1,
          "{range} 1 {target_monster} Crit 1 {buff} 7 Acc 10 {buff} 4",
          2,
          2,
          2,
        );
      case "hero_skill:p254":
        return fixPunishFamily(
          card,
          cards,
          254,
          2,
          "{range} 1 {target_monster} Crit 1 {buff} 9 Acc 11 {buff} 6",
          2,
          3,
          2,
        );
      case "hero_skill:p255":
        return fixPunishFamily(
          card,
          cards,
          255,
          3,
          "{range} 1 {target_monster} Crit 1 {buff} 12 Acc 12 {buff} 8",
          3,
          3,
          2,
        );
      case "hero_skill:p256":
        return fixRainFamily(
          card,
          cards,
          256,
          1,
          "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 5 Acc 10 {buff} 2",
          3,
          2,
          2,
        );
      case "hero_skill:p257":
        return fixRainFamily(
          card,
          cards,
          257,
          2,
          "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 6 Acc 11 {buff} 3",
          3,
          3,
          3,
        );
      case "hero_skill:p258":
        return fixRainFamily(
          card,
          cards,
          258,
          3,
          "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 8 Acc 12 {buff} 4",
          3,
          4,
          4,
        );
      case "hero_skill:p259":
        return fixExsanguinate(card, cards, 259, 1, 3, 2, 3);
      case "hero_skill:p260":
        return fixExsanguinate(card, cards, 260, 2, 5, 3, 3);
      case "hero_skill:p261":
        return fixExsanguinate(card, cards, 261, 3, 7, 3, 4);
      case "hero_skill:p262":
        return fixReclaim(
          card,
          cards,
          262,
          1,
          "{range} 0-1 {target_hero} Crit 2 {damage_or_heal_combined_marker} {heal} 4 Acc 12 {damage_or_heal_combined_marker} {heal} 2",
          false,
        );
      case "hero_skill:p263":
        return fixReclaim(
          card,
          cards,
          263,
          2,
          "{range} 0-1 {target_hero} Crit 2 {heal} {heal} 6 Acc 14 {heal} {heal} 3",
          false,
        );
      case "hero_skill:p264":
        return fixReclaim(
          card,
          cards,
          264,
          3,
          "{range} 0-1 {target_hero} Crit 2 {heal} {heal} 8 Acc 16 {buff} {heal} 4",
          true,
        );
      case "hero_skill:p265":
        return fixRedeem(card, cards, 265, 1, 3);
      case "hero_skill:p266":
        return fixRedeem(card, cards, 266, 2, 5);
      case "hero_skill:p267":
        return fixRedeem(card, cards, 267, 3, 7);
      case "hero_skill:p268":
        return fixEndure(card, cards, 268, 1);
      case "hero_skill:p269":
        return fixEndure(card, cards, 269, 2);
      case "hero_skill:p270":
        return fixEndure(card, cards, 270, 3);
      case "hero_skill:p271":
        return fixSuffer(card, cards, 271, 1, 2, 2);
      case "hero_skill:p272":
        return fixSuffer(card, cards, 272, 2, 2, 3);
      case "hero_skill:p273":
        return fixSuffer(card, cards, 273, 3, 1, 4);
      default:
        return card;
    }
  });
}
