import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;
const id = "hero_skill:p142";
it("Emboldening Vapours I完整黄金注解，四姿态、无Acc/Crit，保留原始null与高等级边界", () => {
  const card = cards.find((c) => c.id === id)!;
  expect(card.verified_status_effects).toEqual([
    { lineIndex: 1, segmentIndex: 2, scope: "target", kind: "buff", duration: 3 },
  ]);
  expect(card.stats_line).toBeNull();
  expect(card.verified_target_header).toEqual({ lineIndex: 0, source: "print_front" });
  expect(card.printed_labels).toEqual([]);
  expect(card.top_row_icons.map((i) => i.key)).toEqual([
    "stance_support_lit",
    "stance_ranged_lit",
    "stance_defensive_lit",
    "stance_aggressive_lit",
  ]);
  expect(card.unlabeled_numbers.find((n) => n.text === "3t")?.numeric).toBeNull();
  for (const p of [143, 144])
    expect(cards.find((c) => c.pages[0] === p)!.verified_status_effects).toBeDefined();
  const before = structuredClone(cards);
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
  expect(cards).toEqual(before);
});

it("精确身份、完整双行、目标/射程/持续时间与命名漂移拒绝，不允许缺卡或重复卡", () => {
  for (const field of [
    "hero",
    "name",
    "back",
    "level",
    "page",
    "copies",
    "extra",
    "header",
    "duration",
    "headerIcon",
    "statusIcon",
    "labels",
    "stats",
  ] as const) {
    const changed = structuredClone(cards),
      card = changed.find((c) => c.id === id)!;
    if (field === "hero") card.hero = "VESTAL";
    if (field === "name") card.name = "Other";
    if (field === "back" && "back_name" in card) card.back_name = "Other";
    if (field === "level") card.level = 2;
    if (field === "page") card.pages = [999];
    if (field === "copies") card.copies = 2;
    if (field === "extra") card.effect_lines.push(card.effect_lines[1]!);
    if (field === "header" || field === "duration") {
      const index = field === "header" ? 0 : 1;
      card.effect_lines[index] = card.effect_lines[index]!.map((s) =>
        s.type === "text"
          ? { ...s, text: s.text.replace(field === "header" ? "0" : "3t", "9") }
          : s,
      );
    }
    if (field === "headerIcon" || field === "statusIcon") {
      const segment = card.effect_lines[field === "headerIcon" ? 0 : 1]![2]!;
      if (segment.type === "icon") segment.icon.naming = "unverified";
    }
    if (field === "labels") card.printed_labels = [{ label: "Acc", raw: "Acc 9", value: 9 }];
    if (field === "stats") card.stats_line = [{ type: "text", text: "Acc 9" }];
    expect(() => attachVerifiedHeroStatuses(changed), field).toThrow();
  }
  expect(() => attachVerifiedHeroStatuses(cards.filter((c) => c.id !== id))).toThrow(/唯一/);
  expect(() => attachVerifiedHeroStatuses([...cards, cards.find((c) => c.id === id)!])).toThrow(
    /唯一/,
  );
});
