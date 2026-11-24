import { normalizedHeroSkillCardSchema } from "../schema";
import type { NormalizedHeroSkillCard } from "../schema";
import { heroSkillId } from "../../hero-registry";
import type { TargetStressEntry } from "./types";

/**
 * 目标压力 applier：
 * 按行断言 target_effects + stress 图标存在、印刷数字与数据一致，再写 verified_target_stress。
 * 与自身压力是两条独立注解；同一张卡可以同时有两侧压力。
 */
export function applyTargetStress(
  cards: readonly NormalizedHeroSkillCard[],
  entries: readonly TargetStressEntry[],
): NormalizedHeroSkillCard[] {
  const byId = new Map<string, TargetStressEntry[]>();
  for (const entry of entries) {
    const list = byId.get(entry.id) ?? [];
    list.push(entry);
    byId.set(entry.id, list);
  }
  return cards.map((card) => {
    if (card.rules?.target?.stress) return card;
    const page = card.pages[0]!;
    const hero = card.hero ?? "ABOMINATION";
    const globalPage = card.id.startsWith("hero_skill:musketeer:") ? 357 + page : page;
    const rows = byId.get(heroSkillId(hero, globalPage));
    if (!rows) return card;
    let fields: Record<string, unknown> = {};
    for (const entry of rows) {
      if (card.name !== entry.name || card.level !== entry.level || card.verification.unverified)
        throw new Error(`${card.id} 目标压力元数据漂移（R-048）`);
      const line = card.effect_lines[entry.lineIndex];
      if (!line) throw new Error(`${card.id} 目标压力行缺失（R-048）`);
      const iconKeys = line.filter((s) => s.type === "icon").map((s) => s.icon.key);
      if (!iconKeys.includes("target_effects") || !iconKeys.includes("stress"))
        throw new Error(`${card.id} 目标压力图标不符（R-048）`);
      const text = line.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`)).join("");
      const printed = entry.amount > 0 ? `+${entry.amount}` : `${entry.amount}`;
      if (!text.includes(printed) || iconKeys.includes("self_effects"))
        throw new Error(`${card.id} 目标压力数字不符（R-048）`);
      fields = {
        ...fields,
        verified_target_stress: {
          lineIndex: entry.lineIndex,
          amount: entry.amount,
          source: "print_front",
        },
      };
    }
    return normalizedHeroSkillCardSchema.parse({ ...card, ...fields });
  });
}
