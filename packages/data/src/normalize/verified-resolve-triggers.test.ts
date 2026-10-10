import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedResolveTriggers } from "./verified-resolve-triggers";
import { verifiedResolveTriggerSchema } from "./schema";

const cards = loadNormalizedCorebox().virtue_affliction.cards;
describe("完整页核实的八张意志卡触发（R28 / R-048 / R-053）", () => {
  it("五美德三苦难附注，其余保持未验证，不用卡背箭头判角色", () => {
    const verified = cards.filter((card) => card.verified_turn_start !== undefined);
    expect(verified).toHaveLength(8);
    expect(verified.filter((card) => card.role === "virtue")).toHaveLength(5);
    expect(cards.find((card) => card.name === "Focused")!.verified_turn_start).toEqual({
      rollMin: 1,
      rollMax: 5,
      effect: { type: "buff", scope: "self", duration: 2 },
    });
    expect(cards.find((card) => card.name === "Vigorous")!.verified_turn_start!.effect).toEqual({
      type: "heal",
      scope: "self",
      amount: 3,
      perHeroLevel: true,
    });
    for (const name of ["Masochistic", "Irrational"]) {
      const card = cards.find((card) => card.name === name)!;
      expect(card.verified_turn_start).toBeUndefined();
      expect(card.verification.unverified).toBe(true);
    }
    expect(cards).toHaveLength(10);
  });

  it("完整文本、未确认图标、页码、角色或卡数量漂移全部拒绝", () => {
    const changed = (mutate: (card: (typeof cards)[number]) => void) => {
      const result = structuredClone(cards);
      mutate(result[0]!);
      return () => attachVerifiedResolveTriggers(result);
    };
    expect(
      changed((card) => {
        card.pages = [2];
      }),
    ).toThrow(/页码/);
    expect(
      changed((card) => {
        card.role = "affliction";
      }),
    ).toThrow(/角色/);
    expect(
      changed((card) => {
        card.lines[5]![2] = { type: "text", text: " -3" };
      }),
    ).toThrow(/文本/);
    expect(
      changed((card) => {
        const segment = card.lines[5]![1]!;
        if (segment.type === "icon") segment.icon.naming = "unverified";
      }),
    ).toThrow(/未确认/);
    expect(() => attachVerifiedResolveTriggers(cards.slice(1))).toThrow(/缺失/);
    expect(() => attachVerifiedResolveTriggers([...cards, cards[0]!])).toThrow(/重复/);
  });

  it("Buff duration、Hero Level 倍率和触发边界不设默认值", () => {
    expect(
      verifiedResolveTriggerSchema.safeParse({
        rollMin: 1,
        rollMax: 5,
        effect: { type: "buff", scope: "self" },
      }).success,
    ).toBe(false);
    expect(
      verifiedResolveTriggerSchema.safeParse({
        rollMin: 1,
        rollMax: 11,
        effect: { type: "consumeProvision", amount: 1 },
      }).success,
    ).toBe(false);
    expect(
      verifiedResolveTriggerSchema.safeParse({
        rollMin: 1,
        rollMax: 3,
        effect: { type: "heal", scope: "self", amount: 3 },
      }).success,
    ).toBe(false);
  });
});
