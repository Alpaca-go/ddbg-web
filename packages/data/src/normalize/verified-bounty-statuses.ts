import { normalizedHeroSkillCardSchema } from "./schema";
import type { NormalizedHeroSkillCard, Segment } from "./schema";

const signature = (line: readonly Segment[]) =>
  line
    .map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`))
    .join("")
    .replace(/\s+/g, "");

/** R-089：只修正两张I级卡目标框763ad8e857；全局词典和原始图标清单不改。 */
export function attachVerifiedBountyStatuses(cards: readonly NormalizedHeroSkillCard[]) {
  // R-141：保留原始 Acc 1O 转录，只修正已核图的数值阈值。
  cards = cards.map((card) => {
    if (card.id !== "hero_skill:p044") return card;
    const acc = card.printed_labels.filter((l) => l.label === "Acc");
    if (
      card.name !== "Collect Bounty" ||
      card.hero !== "BOUNTY HUNTER" ||
      card.level !== 2 ||
      JSON.stringify(card.pages) !== "[44]" ||
      card.verification.unverified ||
      signature(card.stats_line ?? []) !==
        "{range}0{target_monster}Crit1{damage}14Acc1O{damage}8" ||
      acc.length !== 1 ||
      acc[0]!.raw !== "Acc 1O" ||
      ![null, 10].includes(acc[0]!.value)
    )
      throw new Error("Collect Bounty II 核图数值来源漂移（R-141）");
    const hit = card.unlabeled_numbers.filter(
      (n) =>
        n.text === "8" &&
        n.numeric === 8 &&
        ((n.anchor.type === "printed_label" && n.anchor.label === "Acc") ||
          (n.anchor.type === "beside_icon" &&
            n.anchor.left_icon === null &&
            n.anchor.inside_icon?.key === "damage")),
    );
    if (hit.length !== 1) throw new Error("Collect Bounty II 命中伤害来源漂移（R-141）");
    return normalizedHeroSkillCardSchema.parse({
      ...card,
      printed_labels: card.printed_labels.map((l) => (l.label === "Acc" ? { ...l, value: 10 } : l)),
      unlabeled_numbers: card.unlabeled_numbers.map((n) =>
        n === hit[0] ? { ...n, anchor: { type: "printed_label", label: "Acc" } } : n,
      ),
    });
  });
  const rows = [
    {
      id: "hero_skill:p046",
      name: "Mark for Death",
      page: 46,
      level: 1,
      lines: ["{target_effects}{mark}3t,{buff}2t", "{self_effects}Self{buff}2t"],
      stats: "Acc10",
      labels: [["Acc", 10]],
      effects: [
        { scope: "target", kind: "mark", duration: 3, lineIndex: 0 },
        { scope: "target", kind: "debuff", duration: 2, lineIndex: 0 },
        { scope: "self", kind: "buff", duration: 2, lineIndex: 1 },
      ],
    },
    {
      id: "hero_skill:p061",
      name: "Caltrops",
      page: 61,
      level: 1,
      lines: ["{target_effects}2{bleed}3t,{buff}1t"],
      stats: "{range}2{target_monster}Crit1{damage}2Acc9{damage}1",
      labels: [
        ["Crit", 1],
        ["Acc", 9],
      ],
      effects: [
        { scope: "target", kind: "bleed", duration: 3, amount: 2, lineIndex: 0 },
        { scope: "target", kind: "debuff", duration: 1, lineIndex: 0 },
      ],
    },
    {
      id: "hero_skill:p048",
      name: "Mark for Death",
      page: 48,
      level: 3,
      lines: ["{target_effects}{mark}3t,{buff}3t", "{self_effects}Self{buff}3t"],
      stats: "Acc12",
      labels: [["Acc", 12]],
      effects: [
        { scope: "target", kind: "mark", duration: 3, lineIndex: 0 },
        { scope: "target", kind: "debuff", duration: 3, lineIndex: 0 },
        { scope: "self", kind: "buff", duration: 3, lineIndex: 1 },
      ],
    },
    {
      id: "hero_skill:p063",
      name: "Caltrops",
      page: 63,
      level: 3,
      lines: ["{target_effects}3{bleed}3t,{buff}3t"],
      stats: "{range}2{target_monster}Crit1{damage}3Acc11{damage}2",
      labels: [
        ["Crit", 1],
        ["Acc", 11],
      ],
      effects: [
        { scope: "target", kind: "bleed", duration: 3, amount: 3, lineIndex: 0 },
        { scope: "target", kind: "debuff", duration: 3, lineIndex: 0 },
      ],
    },
  ] as const;
  for (const row of rows)
    if (cards.filter((c) => c.id === row.id).length !== 1)
      throw new Error(`赏金猎人限定状态卡必须唯一存在（R-089）：${row.id}`);
  return cards.map((card) => {
    const row = rows.find((r) => r.id === card.id);
    if (!row) return card;
    if (
      card.hero !== "BOUNTY HUNTER" ||
      card.name !== row.name ||
      card.back_name !== row.name ||
      card.back_level !== row.level ||
      card.copies !== 1 ||
      card.level !== row.level ||
      card.pages.length !== 1 ||
      card.pages[0] !== row.page ||
      card.verification.unverified ||
      !card.stats_line ||
      signature(card.stats_line) !== row.stats ||
      JSON.stringify(card.printed_labels.map((l) => [l.label, l.value])) !==
        JSON.stringify(row.labels) ||
      card.effect_lines.length !== row.lines.length ||
      card.effect_lines.some((line, i) => {
        const expected = row.lines[i]!;
        const current = signature(line);
        return (
          current !== expected && (i !== 0 || current !== expected.replace("{buff}", "{debuff}"))
        );
      })
    )
      throw new Error(`赏金猎人卡名/等级/页码/统计/完整效果行漂移（R-089）：${card.id}`);
    const target = card.effect_lines[0]!;
    const indexes = target.flatMap((s, i) =>
      s.type === "icon" && s.icon.iconId === "763ad8e857" ? [i] : [],
    );
    if (
      indexes.length !== 1 ||
      card.effect_lines.some((line) =>
        line.some(
          (s) => s.type === "icon" && !["confirmed", "confirmed_rulebook"].includes(s.icon.naming),
        ),
      )
    )
      throw new Error("限定减益图标缺失/重复或同行未确认（R-089）");
    const effect_lines = card.effect_lines.map((line, i) =>
      i !== 0
        ? line
        : line.map((s, j) =>
            j === indexes[0] && s.type === "icon"
              ? {
                  ...s,
                  icon: {
                    ...s.icon,
                    key: "debuff",
                    meaning_en: "Debuff (R-089 card-specific)",
                    meaning_zh: "减益（R-089本卡限定）",
                  },
                }
              : s,
          ),
    );
    const verified_status_effects = row.effects.map((effect) => {
      const line = effect_lines[effect.lineIndex]!;
      const found = line.flatMap((s, i) =>
        s.type === "icon" && s.icon.key === effect.kind ? [i] : [],
      );
      if (found.length !== 1) throw new Error("限定状态图标定位不唯一（R-089）");
      return { ...effect, segmentIndex: found[0]! };
    });
    if (card.id === "hero_skill:p046" || card.id === "hero_skill:p048") {
      const ranges = card.unlabeled_numbers.filter(
        (n) =>
          n.anchor.type === "beside_icon" &&
          n.anchor.left_icon?.key === "range" &&
          n.anchor.inside_icon === null,
      );
      if (ranges.length !== 1 || ranges[0]!.text !== "0-2" || ranges[0]!.numeric !== null)
        throw new Error("Mark for Death I区间射程漂移（R-089）");
    }
    return normalizedHeroSkillCardSchema.parse({
      ...card,
      effect_lines,
      verified_status_effects,
      ...(card.id === "hero_skill:p046" || card.id === "hero_skill:p048"
        ? { verified_range: { min: 0, max: 2, source: "print_front" } }
        : {}),
    });
  });
}
