import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import type { RemovalEntry } from "./types";

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);
const EXTRACTED_SELF_MARK = String.fromCharCode(7);

function lineAudience(
  line: NormalizedHeroSkillCard["effect_lines"][number],
): "self" | "target" | null {
  let self = 0;
  let target = 0;
  for (const segment of line) {
    if (segment.type !== "icon") continue;
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) continue;
    if (segment.icon.key === "self_effects") self += 1;
    if (segment.icon.key === "target_effects") target += 1;
  }
  if (self === 1 && target === 0) return "self";
  if (target === 1 && self === 0) return "target";
  return null;
}

/** 只接受「Remove」加一枚流血、一枚腐蚀；多出来的图标让整行都不算。 */
function removalLineKind(
  line: NormalizedHeroSkillCard["effect_lines"][number],
): "self" | "target" | "unmarked" | null {
  let self = 0;
  let target = 0;
  let bleed = 0;
  let blight = 0;
  const words: string[] = [];
  for (const segment of line) {
    if (segment.type === "text") {
      for (const raw of segment.text.split(/\s+/)) {
        const word = raw.split(EXTRACTED_SELF_MARK).join("");
        if (word !== "") words.push(word);
      }
      continue;
    }
    if (!NAMED.has(segment.icon.naming) || segment.icon.key === null) return null;
    if (segment.icon.key === "self_effects") {
      self += 1;
      continue;
    }
    if (segment.icon.key === "target_effects") {
      target += 1;
      continue;
    }
    if (segment.icon.key === "bleed") {
      bleed += 1;
      continue;
    }
    if (segment.icon.key === "blight") {
      blight += 1;
      continue;
    }
    return null;
  }
  if (bleed !== 1 || blight !== 1 || words.length !== 1 || words[0] !== "Remove") return null;
  if (self === 1 && target === 0) return "self";
  if (target === 1 && self === 0) return "target";
  if (self === 0 && target === 0) return "unmarked";
  return null;
}

/**
 * 条件移除 applier：
 * 按行断言「Remove + bleed + blight」的图标与标记，写 `rules.removal`。
 * 没有标记的行按卡面效果框顺序配对，并核对数据里的 scope 与配对结果一致。
 */
export function applyRemoval(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly RemovalEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map<string, RemovalEntry[]>();
  for (const entry of entries) {
    const list = byId.get(entry.id) ?? [];
    list.push(entry);
    byId.set(entry.id, list);
  }
  return cards.map((card) => {
    if (card.rules?.removal) return card;
    const rows = byId.get(card.id);
    if (!rows) return card;
    const sorted = [...rows].sort((a, b) => a.lineIndex - b.lineIndex);
    const removeLines = new Set(sorted.map((entry) => entry.lineIndex));
    const openBoxes: ("self" | "target")[] = [];
    card.effect_lines.forEach((line, index) => {
      if (removeLines.has(index)) return;
      const audience = lineAudience(line);
      if (audience !== null) openBoxes.push(audience);
    });
    const unmarked: ("self" | "target")[] = [];
    for (const entry of sorted) {
      if (card.name !== entry.name || card.level !== entry.level || card.verification.unverified)
        throw new Error(`${card.id} 条件移除元数据漂移（R-048）`);
      if (
        entry.kinds.length !== 2 ||
        !entry.kinds.includes("bleed") ||
        !entry.kinds.includes("blight")
      )
        throw new Error(`${card.id} 条件移除种类不符（R-048）`);
      const line = card.effect_lines[entry.lineIndex];
      if (!line) throw new Error(`${card.id} 条件移除行缺失（R-048）`);
      const kind = removalLineKind(line);
      if (kind === null) throw new Error(`${card.id} 条件移除图标或文字不符（R-048）`);
      if (kind === "unmarked") {
        unmarked.push(entry.scope);
        continue;
      }
      if (kind !== entry.scope) throw new Error(`${card.id} 条件移除作用侧不符（R-048）`);
    }
    if (unmarked.length !== openBoxes.length)
      throw new Error(`${card.id} 条件移除配对行数量不符（R-048）`);
    for (let index = 0; index < unmarked.length; index++) {
      if (unmarked[index] !== openBoxes[index])
        throw new Error(`${card.id} 条件移除配对作用侧不符（R-048）`);
    }
    const rules = {
      ...(card.rules ?? {}),
      removal: sorted.map((entry) => ({
        lineIndex: entry.lineIndex,
        scope: entry.scope,
        kinds: [...entry.kinds],
      })),
    };
    return parseAnnotatedHeroSkillCard({ ...card, rules });
  });
}
