import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import type { SupportEffectEntry } from "./types";

/** 已复核支援效果 applier：按 canonical id 定位卡片，断言目标行与效果行签名。 */
export function applySupportEffects(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly SupportEffectEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return cards.map((card) => {
    const entry = byId.get(card.id);
    if (!entry) return card;
    const line = card.effect_lines[entry.lineIndex];
    const text = line
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    const targetLine = card.effect_lines[0];
    const target = targetLine
      ?.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
      .join("")
      .replace(/\s+/g, "");
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      card.verification.unverified ||
      card.pages.length !== 1 ||
      card.pages[0] !== entry.page ||
      card.printed_labels.length ||
      card.stats_line !== null ||
      card.effect_lines.length !== entry.lineIndex + 1 ||
      target !== entry.targetSignature ||
      targetLine?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      ) ||
      text !== entry.effectSignature ||
      line?.some(
        (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
      )
    )
      throw new Error(`${card.id} 已复核支持效果与印刷数据不匹配`);
    if (card.rules?.target?.support) return card;
    return {
      ...card,
      annotation_target_support: {
        lineIndex: entry.lineIndex,
        heal: entry.effects.heal,
        stress: entry.effects.stress,
        light: entry.effects.light,
        source: "print_front" as const,
      },
    };
  });
}
