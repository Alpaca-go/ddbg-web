import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { normalizedHeroSkillCardSchema } from "./schema";
import { attachVerifiedHeroStatuses } from "./verified-hero-statuses";

const cards = loadNormalizedCorebox().hero_skill.cards;

describe("逐卡核实的状态持续时间（R20–21 / R-048）", () => {
  it("核实四核心 39 张状态卡，原未命名数字不变，Remove 的图标不误作施加", () => {
    const annotated = cards.filter((card) => card.verified_status_effects !== undefined);
    expect(annotated).toHaveLength(39);
    expect(annotated.every((card) => !card.verification.unverified)).toBe(true);
    expect(cards.find((card) => card.id === "hero_skill:p037")!.verified_status_effects).toEqual([
      { lineIndex: 1, segmentIndex: 6, scope: "self", kind: "buff", duration: 3 },
    ]);
    expect(
      cards.find((card) => card.id === "hero_skill:p031")!.verified_status_effects![0],
    ).toMatchObject({ kind: "bleed", amount: 2, duration: 2 });
    expect(cards.find((card) => card.id === "hero_skill:p008")!.verified_status_effects).toEqual([
      { lineIndex: 0, segmentIndex: 2, scope: "target", kind: "stun", duration: 1 },
    ]);
    for (const card of annotated) {
      expect(
        card.unlabeled_numbers
          .filter((number) => /^\d+t$/.test(number.text))
          .every((number) => number.numeric === null),
      ).toBe(true);
      for (const effect of card.verified_status_effects!) {
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
      change(changed.find((card) => card.id === "hero_skill:p007")!);
      return () => attachVerifiedHeroStatuses(changed);
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
      attachVerifiedHeroStatuses(cards.filter((card) => card.id !== "hero_skill:p007")),
    ).toThrow(/唯一/);
    expect(() =>
      attachVerifiedHeroStatuses([...cards, cards.find((card) => card.id === "hero_skill:p007")!]),
    ).toThrow(/唯一/);
  });

  it("缺 duration、零和负数不会成为默认值", () => {
    const card = cards.find((card) => card.id === "hero_skill:p007")!;
    for (const duration of [undefined, 0, -1, 1.5]) {
      expect(
        normalizedHeroSkillCardSchema.safeParse({
          ...card,
          verified_status_effects: [{ ...card.verified_status_effects![0], duration }],
        }).success,
      ).toBe(false);
    }
  });
});
