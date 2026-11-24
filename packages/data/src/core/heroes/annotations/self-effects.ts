import { parseAnnotatedHeroSkillCard } from "../../../shared/schema";
import type { NormalizedHeroSkillCard } from "../../../shared/schema";
import { heroSkillId } from "../hero-registry";
import type { SelfEffectEntry } from "./types";

/**
 * 自身治疗 / 压力 applier：
 * 按行断言 self_effects + heal/stress 图标存在、印刷数字与数据一致，再写 annotation_self_*。
 */
export function applySelfEffects(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly SelfEffectEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map<string, SelfEffectEntry[]>();
  for (const entry of entries) {
    const list = byId.get(entry.id) ?? [];
    list.push(entry);
    byId.set(entry.id, list);
  }
  return cards.map((card) => {
    if (card.rules?.self) return card;
    const page = card.pages[0]!;
    const hero = card.hero ?? "ABOMINATION";
    const globalPage = card.id.startsWith("hero_skill:musketeer:") ? 357 + page : page;
    const rows = byId.get(heroSkillId(hero, globalPage));
    if (!rows) return card;
    let fields: Record<string, unknown> = {};
    for (const entry of rows) {
      if (card.name !== entry.name || card.level !== entry.level || card.verification.unverified)
        throw new Error(`${card.id} 自身效果元数据漂移（R-048）`);
      const line = card.effect_lines[entry.lineIndex];
      if (!line) throw new Error(`${card.id} 自身效果行缺失（R-048）`);
      const iconKeys = line.filter((s) => s.type === "icon").map((s) => s.icon.key);
      if (!iconKeys.includes("self_effects") || !iconKeys.includes(entry.kind))
        throw new Error(`${card.id} 自身效果图标不符（R-048）`);
      const text = line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`)).join("");
      const printed =
        entry.kind === "stress" && entry.amount > 0 ? `+${entry.amount}` : `${entry.amount}`;
      if (!text.includes(printed)) throw new Error(`${card.id} 自身效果数字不符（R-048）`);
      fields =
        entry.kind === "heal"
          ? {
              ...fields,
              annotation_self_heal: {
                lineIndex: entry.lineIndex,
                amount: entry.amount,
                source: "print_front",
              },
            }
          : {
              ...fields,
              annotation_self_stress: {
                lineIndex: entry.lineIndex,
                amount: entry.amount,
                source: "print_front",
              },
            };
    }
    return parseAnnotatedHeroSkillCard({ ...card, ...fields });
  });
}
