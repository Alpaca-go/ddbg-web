import type { NormalizedHeroSkillCard, Segment } from "../schema";

export type IconSegment = Extract<Segment, { type: "icon" }>;

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
