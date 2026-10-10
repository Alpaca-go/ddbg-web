import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedMonsterMediumFileSchema } from "./schema";
import { attachVerifiedMonsterStress } from "./verified-monster-stress";
const cards = normalizedMonsterMediumFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../normalized/corebox/monster_medium.json", import.meta.url), "utf8"),
  ),
).cards;
describe("Courtier I 逐卡压力复核", () => {
  it("只有 p004 技能 1 受注解，原数字列表不补标签", () => {
    const annotated = attachVerifiedMonsterStress(cards).filter(
      (card) => "skills" in card && card.skills.some((skill) => skill.verified_target_stress),
    );
    expect(annotated.map((card) => card.id)).toEqual(["monster_medium:p004"]);
    const card = annotated[0]!;
    if (!("skills" in card)) throw new Error("缺技能");
    expect(card.skills[0]!.unlabeled_numbers.some((number) => number.text.trim() === "+1")).toBe(
      false,
    );
    const original = cards.find((entry) => entry.id === card.id)!;
    if (!("skills" in original)) throw new Error("缺技能");
    expect(card.skills[0]!.unlabeled_numbers).toEqual(original.skills[0]!.unlabeled_numbers);
  });
  it("整行或卡牌验证状态改变拒绝", () => {
    const card = cards.find((card) => card.id === "monster_medium:p004")!;
    if (!("skills" in card)) throw new Error("缺技能");
    expect(() =>
      attachVerifiedMonsterStress([
        { ...card, verification: { ...card.verification, unverified: true } },
      ]),
    ).toThrow();
    expect(() =>
      attachVerifiedMonsterStress([
        { ...card, skills: card.skills.map((skill) => ({ ...skill, effect_lines: [] })) },
      ]),
    ).toThrow();
  });
});
