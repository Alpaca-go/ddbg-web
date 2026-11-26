import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import type { EffectKind, EffectKindEntry } from "./types";

export type { EffectKind, EffectKindEntry } from "./types";

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

export function statsEffect(card: NormalizedHeroSkillCard): EffectKind | null {
  const kinds = new Set<EffectKind>();
  for (const segment of card.stats_line ?? []) {
    if (segment.type !== "icon") continue;
    if (!NAMED.has(segment.icon.naming)) continue;
    if (segment.icon.key === "damage") kinds.add("damage");
    if (segment.icon.key === "heal") kinds.add("heal");
  }
  if (kinds.size > 1) throw new Error(`${card.id} stats 行同时有 damage 与 heal（R-048）`);
  return [...kinds][0] ?? null;
}

/**
 * stats 行主效果 applier：
 * 只把已命名的 damage / heal 图标冻结为 `rules.effect`；两者同现时构建失败。
 * 引擎读 `rules.effect`，不再从 stats 行按 icon.key 决定技能主效果。
 */
export function applyEffectKind(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly EffectKindEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map<string, EffectKindEntry>();
  for (const entry of entries) byId.set(entry.id, entry);
  return cards.map((card) => {
    if (card.rules?.effect) return card;
    const entry = byId.get(card.id);
    const expected = statsEffect(card);
    if (!entry) return card;
    if (expected === null || expected !== entry.effect)
      throw new Error(`${card.id} 主效果与已确认 stats 图标不符（R-048）`);
    const rules = { ...(card.rules ?? {}), effect: entry.effect };
    return parseAnnotatedHeroSkillCard({ ...card, rules });
  });
}
