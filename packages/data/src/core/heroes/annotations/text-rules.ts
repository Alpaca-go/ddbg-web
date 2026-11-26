import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import type { IgnoresEntry, ShuffleEntry } from "./types";

const lineText = (line: readonly { type: string; text?: string }[]): string =>
  line.map((segment) => (segment.type === "text" ? (segment.text ?? "") : "")).join("");

/**
 * 文本位移 / Ignores 规则：
 * - shuffle 行断言含 shuffle 图标，text 与印刷一致；
 * - ignores 行断言含 Ignores 文本与对应保护图标；
 * 结果写入 `rules.shuffle` / `rules.ignores`，引擎优先读规则、文本解析作 fallback。
 */
export function applyTextRules(
  cards: readonly NormalizedHeroSkillCard[],
  shuffleEntries: readonly ShuffleEntry[],
  ignoresEntries: readonly IgnoresEntry[],
): NormalizedHeroSkillCard[] {
  const shuffleById = new Map<string, ShuffleEntry[]>();
  for (const entry of shuffleEntries) {
    const list = shuffleById.get(entry.id) ?? [];
    list.push(entry);
    shuffleById.set(entry.id, list);
  }
  const ignoresById = new Map<string, IgnoresEntry[]>();
  for (const entry of ignoresEntries) {
    const list = ignoresById.get(entry.id) ?? [];
    list.push(entry);
    ignoresById.set(entry.id, list);
  }
  return cards.map((card) => {
    const id = card.id;
    const shuffles = shuffleById.get(id);
    const ignores = ignoresById.get(id);
    if (!shuffles && !ignores) return card;
    const rules = { ...(card.rules ?? {}) };
    if (shuffles) {
      for (const entry of shuffles) {
        if (card.name !== entry.name || card.level !== entry.level || card.verification.unverified)
          throw new Error(`${card.id} 位移规则元数据漂移（R-048）`);
        const line = card.effect_lines[entry.lineIndex];
        if (!line || !line.some((s) => s.type === "icon" && s.icon.key === "shuffle"))
          throw new Error(`${card.id} 位移行缺失（R-048）`);
        if (!lineText(line).replace(/\s+/g, " ").includes(entry.text.replace(/\s+/g, " ")))
          throw new Error(`${card.id} 位移文本不符（R-048）`);
        rules.shuffle = [
          ...(rules.shuffle ?? []),
          { lineIndex: entry.lineIndex, scope: entry.scope, text: entry.text },
        ];
      }
    }
    if (ignores) {
      for (const entry of ignores) {
        if (card.name !== entry.name || card.level !== entry.level || card.verification.unverified)
          throw new Error(`${card.id} Ignores 规则元数据漂移（R-048）`);
        const line = card.effect_lines[entry.lineIndex];
        if (!line || !/Ignores/i.test(lineText(line)))
          throw new Error(`${card.id} Ignores 行缺失（R-048）`);
        if (!line.some((s) => s.type === "icon" && s.icon.key === entry.kind))
          throw new Error(`${card.id} Ignores 图标不符（R-048）`);
        rules.ignores = [
          ...(rules.ignores ?? []),
          { lineIndex: entry.lineIndex, kind: entry.kind },
        ];
      }
    }
    return parseAnnotatedHeroSkillCard({ ...card, rules });
  });
}
