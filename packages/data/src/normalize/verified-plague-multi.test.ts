import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;
const rows = [
  ["hero_skill:p130", { kind: "blight", duration: 2, amount: 3 }],
  ["hero_skill:p133", { kind: "stun", duration: 1 }],
] as const;

it.each(rows)("%s完整卡面黄金值，保留Nt null及高等级边界", (id, effect) => {
  const card = cards.find((c) => c.id === id)!;
  expect(card.verified_status_effects).toEqual([
    { ...effect, scope: "target", lineIndex: 0, segmentIndex: 2 },
  ]);
  expect(card.unlabeled_numbers.find((n) => n.text === `${effect.duration}t`)?.numeric).toBeNull();
  if (id.endsWith("133")) {
    expect(card.verified_range).toEqual({ min: 1, max: 2, source: "print_front" });
    expect(card.printed_labels).toEqual([{ label: "Acc", raw: "Acc 9", value: 9 }]);
    expect(card.stats_line).toEqual([{ type: "text", text: "Acc 9" }]);
  }
  for (const offset of [1, 2]) {
    const higher = cards.find((c) => c.pages[0] === card.pages[0]! + offset)!;
    expect(higher.verified_status_effects).toBeUndefined();
    expect(higher.verified_range).toBeUndefined();
  }
});

it.each(rows)("%s严格身份/整行/命名校验，缺卡及重复卡拒绝，生成幂等不突变", (id, effect) => {
  const before = structuredClone(cards);
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
  expect(cards).toEqual(before);
  for (const field of [
    "hero",
    "name",
    "level",
    "back",
    "page",
    "copies",
    "extra",
    "duration",
    "icon",
  ] as const) {
    const changed = structuredClone(cards),
      card = changed.find((c) => c.id === id)!;
    if (field === "hero") card.hero = "VESTAL";
    if (field === "name") card.name = "Other";
    if (field === "level") card.level = 2;
    if (field === "back" && "back_name" in card) card.back_name = "Other";
    if (field === "page") card.pages = [999];
    if (field === "copies") card.copies = 2;
    if (field === "extra") card.effect_lines.push(card.effect_lines[0]!);
    if (field === "duration")
      card.effect_lines[0] = card.effect_lines[0]!.map((s) =>
        s.type === "text" ? { ...s, text: s.text.replace(`${effect.duration}t`, "9t") } : s,
      );
    if (field === "icon") {
      const segment = card.effect_lines[0]![2]!;
      if (segment.type === "icon") segment.icon.naming = "unverified";
    }
    expect(() => attachVerifiedHeroStatuses(changed), field).toThrow();
  }
  expect(() => attachVerifiedHeroStatuses(cards.filter((c) => c.id !== id))).toThrow(/唯一/);
  expect(() => attachVerifiedHeroStatuses([...cards, cards.find((c) => c.id === id)!])).toThrow(
    /唯一/,
  );
});
