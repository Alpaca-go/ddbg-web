import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedHeroSkillFileSchema } from "./schema";
import { attachVerifiedHeroRanges } from "./verified-hero-ranges";
const cards = normalizedHeroSkillFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ),
).cards;
describe("逐卡复核的区间来源", () => {
  it("只注解已复核 I 级三张，保留原 null，不给 II / III 级扩大池", () => {
    const attached = attachVerifiedHeroRanges(cards);
    expect(attached.filter((card) => card.verified_range).map((card) => card.id)).toEqual([
      "hero_skill:p067",
      "hero_skill:p076",
      "hero_skill:p088",
    ]);
    for (const id of ["hero_skill:p067", "hero_skill:p076", "hero_skill:p088"]) {
      const card = attached.find((card) => card.id === id)!;
      expect(card.unlabeled_numbers.find((number) => number.text === "1-2")?.numeric).toBeNull();
      expect(card.verified_range).toEqual({ min: 1, max: 2, source: "print_front" });
    }
  });
  it("Judgement 的卡名、等级、已命名射程与区间必须匹配完整印刷面", () => {
    const card = cards.find((card) => card.id === "hero_skill:p088")!;
    for (const changed of [
      { ...card, name: "Dazzling Light" },
      { ...card, level: 2 as const },
      { ...card, verification: { ...card.verification, unverified: true } },
      {
        ...card,
        unlabeled_numbers: card.unlabeled_numbers.map((n) =>
          n.text === "1-2" ? { ...n, text: "0-3" } : n,
        ),
      },
      {
        ...card,
        unlabeled_numbers: card.unlabeled_numbers.map((n) =>
          n.text === "1-2" && n.anchor.type === "beside_icon" && n.anchor.left_icon
            ? {
                ...n,
                anchor: {
                  ...n.anchor,
                  left_icon: { ...n.anchor.left_icon, naming: "unverified" as const },
                },
              }
            : n,
        ),
      },
    ])
      expect(() => attachVerifiedHeroRanges([changed])).toThrow();
  });
  it("已复核卡的印刷数值或验证状态改变就拒绝，不补新边界", () => {
    const card = cards.find((card) => card.id === "hero_skill:p067")!;
    expect(() =>
      attachVerifiedHeroRanges([
        {
          ...card,
          unlabeled_numbers: card.unlabeled_numbers.map((number) =>
            number.text === "1-2" ? { ...number, text: "0-3" } : number,
          ),
        },
      ]),
    ).toThrow();
    expect(() =>
      attachVerifiedHeroRanges([
        { ...card, verification: { ...card.verification, unverified: true } },
      ]),
    ).toThrow();
  });
});
