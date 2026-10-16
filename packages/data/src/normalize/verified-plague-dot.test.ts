import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;
const rows = [
  [
    "hero_skill:p127",
    [
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "blight", amount: 4, duration: 2 },
      { lineIndex: 0, segmentIndex: 4, scope: "target", kind: "debuff", duration: 1 },
    ],
  ],
  [
    "hero_skill:p136",
    [{ lineIndex: 0, segmentIndex: 2, scope: "target", kind: "bleed", amount: 2, duration: 2 }],
  ],
] as const;

it.each(rows)("%s完整状态黄金值；Nt原numeric保留null，II/III级不外推", (id, expected) => {
  const card = cards.find((c) => c.id === id)!;
  expect(card.verified_status_effects).toEqual(expected);
  expect(
    card.unlabeled_numbers.filter((n) => /^\d+t$/.test(n.text)).every((n) => n.numeric === null),
  ).toBe(true);
  for (const offset of [1, 2])
    expect(
      cards.find((c) => c.pages[0] === card.pages[0]! + offset)!.verified_status_effects,
    ).toBeUndefined();
});

it.each(rows)("%s限定身份、整行数值和所有图标命名；漂移/缺失/重复卡拒绝，重复生成不突变", (id) => {
  const original = structuredClone(cards);
  expect(attachVerifiedHeroStatuses(cards)).toEqual(cards);
  expect(cards).toEqual(original);
  for (const change of [
    "hero",
    "name",
    "level",
    "back",
    "page",
    "copies",
    "extra",
    "amount",
    "duration",
    "icon",
  ] as const) {
    const changed = structuredClone(cards),
      card = changed.find((c) => c.id === id)!;
    if (change === "hero") card.hero = "VESTAL";
    if (change === "name") card.name = "Other";
    if (change === "level") card.level = 2;
    if (change === "back" && "back_level" in card) card.back_level = 2;
    if (change === "page") card.pages = [999];
    if (change === "copies") card.copies = 2;
    if (change === "extra") card.effect_lines.push(card.effect_lines[0]!);
    if (change === "amount" || change === "duration")
      card.effect_lines[0] = card.effect_lines[0]!.map((s) =>
        s.type === "text"
          ? {
              ...s,
              text:
                change === "amount"
                  ? s.text.replace(id.endsWith("127") ? "4" : "2", "9")
                  : s.text.replace("2t", "3t"),
            }
          : s,
      );
    if (change === "icon") {
      const segment = card.effect_lines[0]![2]!;
      if (segment.type === "icon") segment.icon.naming = "unverified";
    }
    expect(() => attachVerifiedHeroStatuses(changed), change).toThrow();
  }
  expect(() => attachVerifiedHeroStatuses(cards.filter((c) => c.id !== id))).toThrow(/唯一/);
  expect(() => attachVerifiedHeroStatuses([...cards, cards.find((c) => c.id === id)!])).toThrow(
    /唯一/,
  );
});
