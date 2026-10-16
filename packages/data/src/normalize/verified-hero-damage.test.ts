import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedHeroSkillFileSchema } from "./schema";
import { attachVerifiedHeroDamage } from "./verified-hero-damage";
const cards = normalizedHeroSkillFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ),
).cards;
describe("逐卡复核条件伤害", () => {
  it("五族 I/II/III 及 Finish Him I 条件伤逐页核实，原 null 不变", () => {
    expect(
      attachVerifiedHeroDamage(cards)
        .filter((card) => card.verified_damage_bonus)
        .map((card) => Number(card.id.slice(-3))),
    ).toEqual([1, 2, 3, 16, 17, 18, 58, 67, 68, 69, 85, 86, 87, 103, 104, 105]);
    const lance = cards.find((card) => card.id === "hero_skill:p016")!;
    expect(lance.verified_damage_bonus).toEqual({
      lineIndex: 1,
      amount: 1,
      condition: "unholy",
      source: "print_front",
    });
    expect(lance.unlabeled_numbers.find((number) => number.text === "+1")?.numeric).toBeNull();
    expect(
      cards
        .find((card) => card.id === "hero_skill:p067")!
        .unlabeled_numbers.find((number) => number.text === "+2")?.numeric,
    ).toBeNull();
  });
  it("Holy Lance I 的页码、等级、卡名、条件和命名图标漂移均拒绝", () => {
    const card = cards.find((card) => card.id === "hero_skill:p016")!;
    for (const changed of [
      { ...card, pages: [17] },
      { ...card, level: 2 as const },
      { ...card, name: "Smite" },
      { ...card, verification: { ...card.verification, unverified: true } },
      { ...card, effect_lines: card.effect_lines.slice(0, 1) },
      {
        ...card,
        effect_lines: card.effect_lines.map((line) =>
          line.map((s) =>
            s.type === "text" ? { ...s, text: s.text.replace("Unholy", "Human") } : s,
          ),
        ),
      },
      {
        ...card,
        effect_lines: card.effect_lines.map((line) =>
          line.map((s) =>
            s.type === "icon" && s.icon.key === "damage"
              ? { ...s, icon: { ...s.icon, naming: "unverified" as const } }
              : s,
          ),
        ),
      },
    ])
      expect(() => attachVerifiedHeroDamage([changed])).toThrow();
  });
  it("未核实卡或效果行变化拒绝", () => {
    const card = cards.find((card) => card.id === "hero_skill:p067")!;
    expect(() => attachVerifiedHeroDamage([{ ...card, effect_lines: [] }])).toThrow();
    expect(() =>
      attachVerifiedHeroDamage([
        { ...card, verification: { ...card.verification, unverified: true } },
      ]),
    ).toThrow();
  });

  it("Finish Him仅I级完整面入库，原始数字不变；身份/条件/图标漂移拒绝", () => {
    const card = cards.find((c) => c.id === "hero_skill:p058")!;
    expect(card.verified_damage_bonus).toEqual({
      lineIndex: 0,
      amount: 2,
      condition: "stunned",
      source: "print_front",
    });
    expect(card.verified_range).toEqual({ min: 0, max: 1, source: "print_front" });
    expect(card.unlabeled_numbers.find((n) => n.text === "+2")?.numeric).toBeNull();
    expect(card.unlabeled_numbers.find((n) => n.text === "0-1")?.numeric).toBeNull();
    const before = structuredClone(cards);
    expect(attachVerifiedHeroDamage(cards)).toEqual(cards);
    expect(cards).toEqual(before);
    for (const id of ["hero_skill:p059", "hero_skill:p060"])
      expect(cards.find((c) => c.id === id)!.verified_damage_bonus).toBeUndefined();
    for (const mutate of [
      (c: typeof card) => {
        c.hero = "VESTAL";
      },
      (c: typeof card) => {
        if ("back_level" in c) c.back_level = 2;
      },
      (c: typeof card) => {
        c.pages = [59];
      },
      (c: typeof card) => {
        c.effect_lines.push(c.effect_lines[0]!);
      },
      (c: typeof card) => {
        c.effect_lines[0] = c.effect_lines[0]!.map((s) =>
          s.type === "icon" && s.icon.key === "stun"
            ? { ...s, icon: { ...s.icon, key: "mark" } }
            : s,
        );
      },
    ]) {
      const changed = structuredClone(card);
      mutate(changed);
      expect(() => attachVerifiedHeroDamage([changed])).toThrow();
    }
  });
});
