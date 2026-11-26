import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard, Segment } from "../../../shared/schema";
import type { HeroName } from "../hero-registry";
import { lineSignature } from "./shared";
import type { EffectLineFixEntry, HeroAnnotationEntries, HeroAnnotationModule } from "./types";

export type IconSegment = Extract<Segment, { type: "icon" }>;

export function rangeZeroUnlabeled(rangeIcon: IconSegment) {
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

export function stressDeltaAnchor(stressIcon: IconSegment, amount: number) {
  const raw = amount > 0 ? `+${amount}` : String(amount);
  return {
    text: raw,
    numeric: amount,
    anchor: {
      type: "beside_icon" as const,
      left_icon: stressIcon.icon,
      inside_icon: null,
    },
  };
}

export function text(value: string): Segment {
  return { type: "text", text: value };
}

export function cloneKey(segment: IconSegment, key: string): IconSegment {
  return { type: "icon", icon: { ...segment.icon, key } };
}

/** 从全部技能卡里借一个已确认图标（同 key，优先 stats_line / effect_lines / front_icons）。 */
export function iconFromPool(cards: readonly NormalizedHeroSkillCard[], key: string): IconSegment {
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

export function iconFromCard(card: NormalizedHeroSkillCard, key: string): IconSegment {
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

/** 在 effect_lines 与 stats_line 里找指定 iconId 的印刷段。 */
export function segmentOnCard(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  for (const line of [...card.effect_lines, ...(card.stats_line ? [card.stats_line] : [])]) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}

/** 在 stats_line、effect_lines、front_icons 里找指定 iconId 的印刷段（搜索面最广）。 */
export function segmentOnCardAll(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
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

/** 只在 effect_lines 里找指定 iconId 的印刷段。 */
export function segmentOnCardInEffects(card: NormalizedHeroSkillCard, iconId: string): IconSegment {
  for (const line of card.effect_lines) {
    for (const segment of line) {
      if (segment.type === "icon" && segment.icon.iconId === iconId) return segment;
    }
  }
  throw new Error(`${card.id} 缺少印刷段 iconId=${iconId}（R-048）`);
}
/** 统一的逐卡元数据断言：英雄 / 卡名 / 等级 / 单页 / 页码 / 验证状态。 */
export function assertCardMeta(
  card: NormalizedHeroSkillCard,
  hero: HeroName,
  page: number,
  name: string,
  level: number,
): void {
  if (
    card.hero !== hero ||
    card.name !== name ||
    card.level !== level ||
    card.pages.length !== 1 ||
    card.pages[0] !== page ||
    card.verification.unverified
  )
    throw new Error(`${card.id} 元数据漂移（R-048）`);
}

/** 单卡修正：key 为该卡的 canonical id，命中后执行。 */
export type CardFix = (card: NormalizedHeroSkillCard) => NormalizedHeroSkillCard;

/**
 * 统一逐卡修正 runner：
 * - 每个 key 必须唯一命中一张卡，否则构建失败（不再静默跳过）；
 * - 只对命中卡断言英雄与验证状态；卡名 / 等级 / 页码由具体 fix 或数据测试负责。
 */
export function applyCardFixes(
  cards: readonly NormalizedHeroSkillCard[],
  hero: HeroName,
  fixes: Readonly<Record<string, CardFix>>,
): NormalizedHeroSkillCard[] {
  for (const id of Object.keys(fixes)) {
    if (cards.filter((card) => card.id === id).length !== 1)
      throw new Error(`${id} 注解必须唯一命中一张卡（R-048）`);
  }
  return cards.map((card) => {
    const fix = fixes[card.id];
    if (!fix) return card;
    if (card.hero !== hero || card.verification.unverified)
      throw new Error(`${card.id} 元数据漂移（R-048）`);
    return fix(card);
  });
}

function effectLineFix(hero: HeroName, entry: EffectLineFixEntry): CardFix {
  return (card) => {
    assertCardMeta(card, hero, entry.page, entry.name, entry.level);
    if (
      entry.expected.some((expected, index) => {
        const line = card.effect_lines[index];
        return !line || lineSignature(line).replace(/\s+/g, "") !== expected;
      })
    )
      throw new Error(`${card.id} ${entry.name} 效果行漂移（R-048）`);

    const effect_lines = entry.output.map((line) =>
      line.map((segment) => {
        if (typeof segment === "string") return text(segment);
        if ("icon" in segment) return iconFromCard(card, segment.icon);
        return cloneKey(segmentOnCardAll(card, segment.iconId), segment.relabelAs);
      }),
    );
    return parseAnnotatedHeroSkillCard({
      ...card,
      effect_lines,
      ...(entry.statuses ? { annotation_status_effects: entry.statuses } : {}),
    });
  };
}

/** 一个英雄一个模块的统一构造器 */
export function defineHeroModule(config: {
  readonly id: `h${number}`;
  readonly hero: HeroName;
  readonly entries: HeroAnnotationEntries;
  readonly fixes:
    ((cards: readonly NormalizedHeroSkillCard[]) => Readonly<Record<string, CardFix>>) | null;
}): HeroAnnotationModule {
  const { hero, entries, fixes } = config;
  const lineFixes: Record<string, CardFix> = {};
  for (const entry of entries.effectLineFixes ?? []) {
    if (Object.hasOwn(lineFixes, entry.id)) throw new Error(`${entry.id} 效果行修正重复（R-048）`);
    lineFixes[entry.id] = effectLineFix(hero, entry);
  }

  const apply: HeroAnnotationModule["apply"] = (cards) => {
    const customFixes = fixes?.(cards);
    if (!Object.keys(lineFixes).length)
      return customFixes ? applyCardFixes(cards, hero, customFixes) : [...cards];

    for (const id of Object.keys(lineFixes)) {
      if (customFixes && Object.hasOwn(customFixes, id))
        throw new Error(`${id} 同时声明效果行修正和专用修正（R-048）`);
    }
    return applyCardFixes(cards, hero, { ...lineFixes, ...customFixes });
  };
  return { id: config.id, hero: config.hero, entries: config.entries, apply };
}
