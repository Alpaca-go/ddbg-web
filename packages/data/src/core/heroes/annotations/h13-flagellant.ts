import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { StatusEffectEntry, RangeEntry } from "./types";
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
  text,
} from "./patch-helpers";
import type { CardFix } from "./patch-helpers";

/** 完整印刷逐页核对的状态效果行（docs/phase2-four-core-skills-2026-10-11.md）。 */
const statusEntries: readonly StatusEffectEntry[] = [
  // R-200 / Cove Flagellant I–III（TDH p253–p273，Q-172～175）。
  {
    id: "hero_skill:cove:h13:p253",
    name: "Punish",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 2t, {debuff} 1t",
    effects: [
      { kind: "bleed", amount: 2, duration: 2 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:cove:h13:p254",
    name: "Punish",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 3t, {debuff} 1t",
    effects: [
      { kind: "bleed", amount: 2, duration: 3 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:cove:h13:p255",
    name: "Punish",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t, {debuff} 1t",
    effects: [
      { kind: "bleed", amount: 3, duration: 3 },
      { kind: "debuff", duration: 1 },
    ],
  },
  {
    id: "hero_skill:cove:h13:p256",
    name: "Rain of Sorrows",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {blight} 2t",
    effects: [{ kind: "blight", amount: 3, duration: 2 }],
  },
  {
    id: "hero_skill:cove:h13:p257",
    name: "Rain of Sorrows",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {blight} 3t",
    effects: [{ kind: "blight", amount: 3, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p258",
    name: "Rain of Sorrows",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {blight} 4t",
    effects: [{ kind: "blight", amount: 3, duration: 4 }],
  },
  {
    id: "hero_skill:cove:h13:p259",
    name: "Exsanguinate",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {heal} 3, {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  {
    id: "hero_skill:cove:h13:p259",
    name: "Exsanguinate",
    level: 1,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 2 {bleed} 3t",
    effects: [{ kind: "bleed", amount: 2, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p260",
    name: "Exsanguinate",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {heal} 5, {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  {
    id: "hero_skill:cove:h13:p260",
    name: "Exsanguinate",
    level: 2,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 3t",
    effects: [{ kind: "bleed", amount: 3, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p261",
    name: "Exsanguinate",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {heal} 7, {debuff} 1t",
    effects: [{ kind: "debuff", duration: 1 }],
  },
  {
    id: "hero_skill:cove:h13:p261",
    name: "Exsanguinate",
    level: 3,
    lineIndex: 1,
    scope: "target",
    signature: "{target_effects} 3 {bleed} 4t",
    effects: [{ kind: "bleed", amount: 3, duration: 4 }],
  },
  {
    id: "hero_skill:cove:h13:p262",
    name: "Reclaim",
    level: 1,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self 1 {bleed} 3t",
    effects: [{ kind: "bleed", amount: 1, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p263",
    name: "Reclaim",
    level: 2,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self 1 {bleed} 3t",
    effects: [{ kind: "bleed", amount: 1, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p264",
    name: "Reclaim",
    level: 3,
    lineIndex: 0,
    scope: "self",
    signature: "{self_effects} Self {heal} 5, 1 {bleed} 3t",
    effects: [{ kind: "bleed", amount: 1, duration: 3 }],
  },
  {
    id: "hero_skill:cove:h13:p271",
    name: "Suffer",
    level: 1,
    lineIndex: 3,
    scope: "self",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{self_effects} Self {mark} 2t, {buff} 2t",
    effects: [
      { kind: "buff", duration: 2 },
      { kind: "mark", duration: 2 },
    ],
  },
  {
    id: "hero_skill:cove:h13:p272",
    name: "Suffer",
    level: 2,
    lineIndex: 3,
    scope: "self",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{self_effects} Self {mark} 2t, {buff} 3t",
    effects: [
      { kind: "mark", duration: 2 },
      { kind: "buff", duration: 3 },
    ],
  },
  {
    id: "hero_skill:cove:h13:p273",
    name: "Suffer",
    level: 3,
    lineIndex: 3,
    scope: "self",
    headerSignature: "{range} 1 {target_hero}",
    signature: "{self_effects} Self {mark} 1t, {buff} 4t",
    effects: [
      { kind: "mark", duration: 1 },
      { kind: "buff", duration: 4 },
    ],
  },
];

/** 已复核的印刷区间（R-048）：只附加已命名 range 图标旁的明确数字。 */
const rangeEntries: readonly RangeEntry[] = [
  {
    id: "hero_skill:cove:h13:p262",
    name: "Reclaim",
    level: 1,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:cove:h13:p263",
    name: "Reclaim",
    level: 2,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:cove:h13:p264",
    name: "Reclaim",
    level: 3,
    min: 0,
    max: 1,
  },
  {
    id: "hero_skill:cove:h13:p269",
    name: "Endure",
    level: 2,
    min: 1,
    max: 2,
  },
  {
    id: "hero_skill:cove:h13:p270",
    name: "Endure",
    level: 3,
    min: 1,
    max: 2,
  },
];

const entries: HeroAnnotationEntries = {
  status: statusEntries,
  range: rangeEntries,
  targetCount: [
    { id: "hero_skill:cove:h13:p253", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p254", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p255", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p256", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p257", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p258", hero: 0, monster: 2, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p259", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p260", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p261", hero: 0, monster: 1, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p262", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p263", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p264", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p268", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p269", hero: 1, monster: 0, heroOrMonster: 0 },
    { id: "hero_skill:cove:h13:p270", hero: 1, monster: 0, heroOrMonster: 0 },
  ],
  effectKind: [
    { id: "hero_skill:cove:h13:p253", effect: "damage" },
    { id: "hero_skill:cove:h13:p254", effect: "damage" },
    { id: "hero_skill:cove:h13:p255", effect: "damage" },
    { id: "hero_skill:cove:h13:p256", effect: "damage" },
    { id: "hero_skill:cove:h13:p257", effect: "damage" },
    { id: "hero_skill:cove:h13:p258", effect: "damage" },
    { id: "hero_skill:cove:h13:p259", effect: "damage" },
    { id: "hero_skill:cove:h13:p260", effect: "damage" },
    { id: "hero_skill:cove:h13:p261", effect: "damage" },
    { id: "hero_skill:cove:h13:p262", effect: "heal" },
    { id: "hero_skill:cove:h13:p263", effect: "heal" },
    { id: "hero_skill:cove:h13:p264", effect: "heal" },
  ],
};

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
  assertCardMeta(card, "FLAGELLANT", page, "Punish", level);
  const targetEffects = iconFromPool(pool, "target_effects");
  const bleed = iconFromPool(pool, "bleed");
  const debuff = iconFromPool(pool, "debuff");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: fixStatsDamageBuff(card, expectedStats),
    effect_lines: [
      actorBonusLine(pool, actorBonus),
      [targetEffects, text(` ${bleedAmount} `), bleed, text(` ${bleedT}t, `), debuff, text(" 1t")],
    ],
    annotation_actor_damage_bonus: { lineIndex: 0, amount: actorBonus, source: "print_front" },
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
  assertCardMeta(card, "FLAGELLANT", page, "Rain of Sorrows", level);
  const targetEffects = iconFromPool(pool, "target_effects");
  const blight = iconFromPool(pool, "blight");
  const condSig = lineSignature(card.effect_lines[0]!).replace(/\s+/g, "");
  if (condSig !== `{blight}{buff}+${actorBonus}ifFlagellanthas{stun}{mark},`)
    throw new Error(`${card.id} Rain 条件行漂移（R-048）`);
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: fixStatsDamageBuff(card, expectedStats),
    effect_lines: [
      actorBonusLine(pool, actorBonus),
      [targetEffects, text(` ${blightAmount} `), blight, text(` ${blightT}t`)],
    ],
    annotation_actor_damage_bonus: { lineIndex: 0, amount: actorBonus, source: "print_front" },
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
  assertCardMeta(card, "FLAGELLANT", page, "Exsanguinate", level);
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
  return parseAnnotatedHeroSkillCard({
    ...card,
    effect_lines: [
      [selfEffects, text(" Self "), heal, text(` ${selfHeal}, `), debuff, text(" 1t")],
      [targetEffects, text(` ${targetBleed} `), bleed, text(` ${targetT}t`)],
    ],
    annotation_self_heal: { lineIndex: 0, amount: selfHeal, source: "print_front" },
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
  assertCardMeta(card, "FLAGELLANT", page, "Reclaim", level);
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
    return parseAnnotatedHeroSkillCard({
      ...card,
      stats_line: stats,
      effect_lines: [[selfEffects, text(" Self 1 "), bleed, text(" 3t")]],
    });
  }
  const bleedMis = segmentOnCard(card, "ac56561b87");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: stats,
    effect_lines: [
      [selfEffects, text(" Self "), heal, text(" 5, 1 "), cloneKey(bleedMis, "bleed"), text(" 3t")],
    ],
    annotation_self_heal: { lineIndex: 0, amount: 5, source: "print_front" },
  });
}

function fixEndure(
  card: NormalizedHeroSkillCard,
  pool: readonly NormalizedHeroSkillCard[],
  page: number,
  level: 1 | 2 | 3,
) {
  assertCardMeta(card, "FLAGELLANT", page, "Endure", level);
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
  return parseAnnotatedHeroSkillCard({
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
    annotation_self_stress: { lineIndex: 0, amount: -1, source: "print_front" },
    annotation_target_stress: { lineIndex: 1, amount: -1, source: "print_front" },
    ...(spec.interval
      ? { annotation_range: { ...spec.interval, source: "print_front" as const } }
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
  assertCardMeta(card, "FLAGELLANT", page, "Redeem", level);
  const rangeIcon = iconFromPool(pool, "range");
  const targetHero = iconFromPool(pool, "target_hero");
  const selfEffects = iconFromCard(card, "self_effects");
  const heal = iconFromPool(pool, "heal");
  const targetEffects = iconFromCard(card, "target_effects");
  const debuff = iconFromPool(pool, "debuff");
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" 1 "), targetHero],
      [selfEffects, text(" Self "), heal, text(` ${healAmount}`)],
      [targetEffects, heal, text(String(healAmount))],
      [selfEffects, text(" Self "), debuff, text(" 1t")],
    ],
    annotation_self_heal: { lineIndex: 1, amount: healAmount, source: "print_front" },
    annotation_target_heal: { lineIndex: 2, amount: healAmount, source: "print_front" },
    annotation_target_header: { lineIndex: 0, source: "print_front" },
    annotation_status_effects: [
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
  assertCardMeta(card, "FLAGELLANT", page, "Suffer", level);
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
  return parseAnnotatedHeroSkillCard({
    ...card,
    stats_line: null,
    effect_lines: [
      [rangeIcon, text(" 1 "), targetHero],
      transferLine,
      card.effect_lines[2]!,
      [selfEffects, text(" Self "), mark, text(` ${markT}t, `), buff, text(` ${buffT}t`)],
      [text("to the Flagellant.")],
    ],
    annotation_target_header: { lineIndex: 0, source: "print_front" },
    annotation_bleed_blight_transfer: {
      lineIndex: 1,
      signature: transferSignature,
      source: "print_front",
    },
    annotation_effect_line_receipts: [
      { lineIndex: 2, signature: lineSignature(card.effect_lines[2]!), source: "print_front" },
      { lineIndex: 4, signature: "to the Flagellant.", source: "print_front" },
    ],
  });
}

/**
 * R-200 / Q-172～175：Flagellant I–III 逐卡印刷覆盖（签名断言 + 必要 icon key 修正，不改全局词典）。
 */
function fixes(cards: readonly NormalizedHeroSkillCard[]): Readonly<Record<string, CardFix>> {
  return {
    "hero_skill:cove:h13:p253": (card) =>
      fixPunishFamily(
        card,
        cards,
        253,
        1,
        "{range} 1 {target_monster} Crit 1 {buff} 7 Acc 10 {buff} 4",
        2,
        2,
        2,
      ),
    "hero_skill:cove:h13:p254": (card) =>
      fixPunishFamily(
        card,
        cards,
        254,
        2,
        "{range} 1 {target_monster} Crit 1 {buff} 9 Acc 11 {buff} 6",
        2,
        3,
        2,
      ),
    "hero_skill:cove:h13:p255": (card) =>
      fixPunishFamily(
        card,
        cards,
        255,
        3,
        "{range} 1 {target_monster} Crit 1 {buff} 12 Acc 12 {buff} 8",
        3,
        3,
        2,
      ),
    "hero_skill:cove:h13:p256": (card) =>
      fixRainFamily(
        card,
        cards,
        256,
        1,
        "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 5 Acc 10 {buff} 2",
        3,
        2,
        2,
      ),
    "hero_skill:cove:h13:p257": (card) =>
      fixRainFamily(
        card,
        cards,
        257,
        2,
        "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 6 Acc 11 {buff} 3",
        3,
        3,
        3,
      ),
    "hero_skill:cove:h13:p258": (card) =>
      fixRainFamily(
        card,
        cards,
        258,
        3,
        "{range} 2 {target_monster} {target_monster} Crit 1 {buff} 8 Acc 12 {buff} 4",
        3,
        4,
        4,
      ),
    "hero_skill:cove:h13:p259": (card) => fixExsanguinate(card, cards, 259, 1, 3, 2, 3),
    "hero_skill:cove:h13:p260": (card) => fixExsanguinate(card, cards, 260, 2, 5, 3, 3),
    "hero_skill:cove:h13:p261": (card) => fixExsanguinate(card, cards, 261, 3, 7, 3, 4),
    "hero_skill:cove:h13:p262": (card) =>
      fixReclaim(
        card,
        cards,
        262,
        1,
        "{range} 0-1 {target_hero} Crit 2 {damage_or_heal_combined_marker} {heal} 4 Acc 12 {damage_or_heal_combined_marker} {heal} 2",
        false,
      ),
    "hero_skill:cove:h13:p263": (card) =>
      fixReclaim(
        card,
        cards,
        263,
        2,
        "{range} 0-1 {target_hero} Crit 2 {heal} {heal} 6 Acc 14 {heal} {heal} 3",
        false,
      ),
    "hero_skill:cove:h13:p264": (card) =>
      fixReclaim(
        card,
        cards,
        264,
        3,
        "{range} 0-1 {target_hero} Crit 2 {heal} {heal} 8 Acc 16 {buff} {heal} 4",
        true,
      ),
    "hero_skill:cove:h13:p265": (card) => fixRedeem(card, cards, 265, 1, 3),
    "hero_skill:cove:h13:p266": (card) => fixRedeem(card, cards, 266, 2, 5),
    "hero_skill:cove:h13:p267": (card) => fixRedeem(card, cards, 267, 3, 7),
    "hero_skill:cove:h13:p268": (card) => fixEndure(card, cards, 268, 1),
    "hero_skill:cove:h13:p269": (card) => fixEndure(card, cards, 269, 2),
    "hero_skill:cove:h13:p270": (card) => fixEndure(card, cards, 270, 3),
    "hero_skill:cove:h13:p271": (card) => fixSuffer(card, cards, 271, 1, 2, 2),
    "hero_skill:cove:h13:p272": (card) => fixSuffer(card, cards, 272, 2, 2, 3),
    "hero_skill:cove:h13:p273": (card) => fixSuffer(card, cards, 273, 3, 1, 4),
  };
}

export const h13 = defineHeroModule({
  id: "h13",
  hero: "FLAGELLANT",
  entries,
  fixes,
});
