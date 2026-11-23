import type { NormalizedHeroSkillCard, Segment } from "../schema";
import type { HeroName } from "../../hero-registry";
import type { HeroSkillPatch } from "./types";

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
/** 逐卡补丁 runner：统一断言 hero / 卡名 / 等级 / 页码 / 验证状态，再执行该卡的 apply。 */
export function applyPatches(
  cards: readonly NormalizedHeroSkillCard[],
  patches: readonly HeroSkillPatch[],
  hero: HeroName,
): NormalizedHeroSkillCard[] {
  const byId = new Map(patches.map((patch) => [patch.id, patch]));
  return cards.map((card) => {
    const patch = byId.get(card.id);
    if (!patch) return card;
    if (
      card.hero !== hero ||
      card.name !== patch.name ||
      card.level !== patch.level ||
      card.pages.length !== 1 ||
      card.pages[0] !== patch.page ||
      card.verification.unverified
    )
      throw new Error(`${card.id} 元数据漂移（R-048）`);
    return patch.apply(card);
  });
}
