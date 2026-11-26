import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { lineSignature, printedPageOf } from "./shared";
import type { StatusEffectEntry } from "./types";

/**
 * 状态效果注解 applier：按 canonical id 定位卡片，逐卡断言卡名 / 等级 / 页码 / 印刷行签名（R-048）。
 * 数据按英雄放在 hNN-*.ts，这里只保留算法。
 */
export function applyStatusEffects(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly StatusEffectEntry[],
): NormalizedHeroSkillCard[] {
  const annotations = new Map<
    string,
    NonNullable<NormalizedHeroSkillCard["annotation_status_effects"]>
  >();
  for (const entry of entries) {
    const matches = cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1) throw new Error(`状态映射 id 必须唯一存在：${entry.id}`);
    const card = matches[0]!;
    const page = printedPageOf(entry.id);
    if (
      card.name !== entry.name ||
      (entry.hero !== undefined &&
        (card.hero !== entry.hero ||
          card.back_name !== entry.name ||
          card.back_level !== entry.level ||
          card.copies !== 1 ||
          card.effect_lines.length !== entry.lineIndex + 1)) ||
      card.level !== entry.level ||
      card.pages.length !== 1 ||
      card.pages[0] !== page ||
      card.verification.unverified
    )
      throw new Error(`状态映射的卡名 / 等级 / 页码 / 验证状态不符：${entry.id}`);
    const line = card.effect_lines[entry.lineIndex];
    if (entry.scopeLine !== undefined) {
      const scopeLine = card.effect_lines[entry.scopeLine.index];
      if (
        !scopeLine ||
        lineSignature(scopeLine) !== entry.scopeLine.signature ||
        scopeLine.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        )
      )
        throw new Error(`状态映射作用域行漂移：${entry.id}`);
    }
    if (entry.headerSignature !== undefined) {
      const header = card.effect_lines[0];
      if (
        !header ||
        lineSignature(header) !== entry.headerSignature ||
        card.stats_line !== null ||
        card.printed_labels.length !== 0 ||
        header.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        )
      )
        throw new Error(`状态映射射程/目标行漂移：${entry.id}`);
    }
    if (!line || lineSignature(line) !== entry.signature)
      throw new Error(`状态映射效果行漂移：${entry.id}`);
    for (const segment of line) {
      if (
        segment.type === "icon" &&
        segment.icon.naming !== "confirmed" &&
        segment.icon.naming !== "confirmed_rulebook"
      )
        throw new Error(`状态映射含未确认图标：${entry.id}`);
    }
    const effects = entry.effects.map((effect) => {
      const indexes = line.flatMap((segment, index) =>
        segment.type === "icon" && segment.icon.key === effect.kind ? [index] : [],
      );
      if (indexes.length !== 1) throw new Error(`状态图标必须唯一存在：${entry.id}/${effect.kind}`);
      return {
        ...effect,
        scope: entry.scope,
        lineIndex: entry.lineIndex,
        segmentIndex: indexes[0]!,
        ...(entry.scopeLine ? { scopeLineIndex: entry.scopeLine.index } : {}),
      };
    });
    const previous = annotations.get(entry.id) ?? [];
    if (previous.some((e) => e.lineIndex === entry.lineIndex))
      throw new Error(`状态映射行重复：${entry.id}`);
    annotations.set(entry.id, [...previous, ...effects]);
  }
  return cards.map((card) => {
    if (card.rules?.statuses) return card;
    const effects = annotations.get(card.id);
    return effects
      ? parseAnnotatedHeroSkillCard({
          ...card,
          annotation_status_effects: effects,
          ...(entries.some((e) => e.id === card.id && e.headerSignature !== undefined)
            ? { annotation_target_header: { lineIndex: 0, source: "print_front" } }
            : {}),
        })
      : card;
  });
}
