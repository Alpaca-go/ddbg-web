import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../src/core/write";
import { normalizedHeroSkillCardSchema } from "../../../src/shared/schema";
import { applyHeroStatuses } from "../../../src/core/heroes/annotations";

const cards = loadNormalizedCorebox().hero_skill.cards;

describe("逐卡核实的状态持续时间（R20–21 / R-048）", () => {
  it("核实逐卡审校后的状态覆盖，原未命名数字不变（R-208 至 R-212）", () => {
    const annotated = cards.filter((card) => card.rules?.statuses !== undefined);
    expect(annotated).toHaveLength(230);
    expect(annotated.every((card) => !card.verification.unverified)).toBe(true);
    expect(cards.find((card) => card.id === "hero_skill:core:h02:p037")!.rules?.statuses).toEqual([
      { lineIndex: 1, segmentIndex: 6, scope: "self", kind: "buff", duration: 3 },
    ]);
    expect(
      cards.find((card) => card.id === "hero_skill:core:h02:p031")!.rules!.statuses![0],
    ).toMatchObject({ kind: "bleed", amount: 2, duration: 2 });
    expect(cards.find((card) => card.id === "hero_skill:core:h01:p008")!.rules?.statuses).toEqual([
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
    ]);
    for (const card of annotated) {
      expect(
        card.unlabeled_numbers
          .filter((number) => /^\d+t$/.test(number.text))
          .every((number) => number.numeric === null),
      ).toBe(true);
      for (const effect of card.rules!.statuses!) {
        expect(card.effect_lines[effect.lineIndex]![effect.segmentIndex]).toMatchObject({
          type: "icon",
          icon: { key: effect.kind },
        });
      }
    }
  });

  it("卡面版本、持续时间文字、未确认图标和缺卡漂移都拒绝，不静默推断", () => {
    const mutate = (change: (card: (typeof cards)[number]) => void) => {
      const changed = structuredClone(cards);
      change(changed.find((card) => card.id === "hero_skill:core:h01:p007")!);
      return () => applyHeroStatuses(changed);
    };
    expect(
      mutate((card) => {
        card.level = 2;
      }),
    ).toThrow(/等级/);
    expect(
      mutate((card) => {
        card.effect_lines[0]![3] = { type: "text", text: " 2t" };
      }),
    ).toThrow(/漂移/);
    expect(
      mutate((card) => {
        const segment = card.effect_lines[0]![2]!;
        if (segment.type === "icon") segment.icon.naming = "unverified";
      }),
    ).toThrow(/未确认/);
    expect(() =>
      applyHeroStatuses(cards.filter((card) => card.id !== "hero_skill:core:h01:p007")),
    ).toThrow(/唯一/);
    expect(() =>
      applyHeroStatuses([...cards, cards.find((card) => card.id === "hero_skill:core:h01:p007")!]),
    ).toThrow(/唯一/);
  });

  it("缺 duration、零和负数不会成为默认值", () => {
    const card = cards.find((card) => card.id === "hero_skill:core:h01:p007")!;
    for (const duration of [undefined, 0, -1, 1.5]) {
      expect(
        normalizedHeroSkillCardSchema.safeParse({
          ...card,
          rules: {
            ...card.rules,
            statuses: [{ ...card.rules!.statuses![0], duration }],
          },
        }).success,
      ).toBe(false);
    }
  });

  it.each([
    ["hero_skill:core:h03:p049", "mark", 2, "Pull 2"],
    ["hero_skill:core:h03:p052", "stun", 1, "Push 2"],
    ["hero_skill:core:h03:p055", "stun", 1, "Push 1"],
  ] as const)("%s 的完整同行状态与位移核实，来源漂移拒绝", (id, kind, duration, move) => {
    const card = cards.find((c) => c.id === id)!;
    expect(card.rules?.statuses).toEqual([
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind, duration },
    ]);
    expect(card.unlabeled_numbers.find((n) => n.text === `${duration}t`)?.numeric).toBeNull();
    expect(applyHeroStatuses(cards)).toEqual(cards);
    for (const mutate of [
      (c: typeof card) => {
        c.hero = "VESTAL";
      },
      (c: typeof card) => {
        if ("back_level" in c) c.back_level = 2;
      },
      (c: typeof card) => {
        c.pages = [999];
      },
      (c: typeof card) => {
        c.effect_lines.push(c.effect_lines[0]!);
      },
      (c: typeof card) => {
        c.effect_lines[0] = c.effect_lines[0]!.map((s) =>
          s.type === "text" ? { ...s, text: s.text.replace(move, "Push 9") } : s,
        );
      },
      (c: typeof card) => {
        const s = c.effect_lines[0]!.find((s) => s.type === "icon" && s.icon.key === "shuffle")!;
        if (s.type === "icon") s.icon.naming = "unverified";
      },
    ]) {
      const changed = structuredClone(cards);
      mutate(changed.find((c) => c.id === id)!);
      expect(() => applyHeroStatuses(changed)).toThrow();
    }
    for (const page of [Number(id.slice(-3)) + 1, Number(id.slice(-3)) + 2])
      expect(cards.find((c) => c.pages[0] === page)!.rules?.statuses).toBeDefined();
  });
});
