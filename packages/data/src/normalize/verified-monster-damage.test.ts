import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizedMonsterMediumFileSchema } from "./schema";
import { attachVerifiedMonsterDamage } from "./verified-monster-damage";

const cards = normalizedMonsterMediumFileSchema.parse(
  JSON.parse(
    readFileSync(new URL("../../normalized/corebox/monster_medium.json", import.meta.url), "utf8"),
  ),
).cards;
const arbalist = cards.find((card) => card.id === "monster_medium:p007")!;
if (!("skills" in arbalist)) throw new Error("缺少 Arbalist I 技能");

describe("逐卡复核 Arbalist I 对 Mark +1（R-048）", () => {
  it("只注解 I 级 Quarrel；不向原始数字列表补 +1", () => {
    const annotated = attachVerifiedMonsterDamage(cards);
    expect(
      annotated.flatMap((card) =>
        "skills" in card
          ? card.skills
              .filter((skill) => skill.verified_damage_bonus)
              .map((skill) => [card.id, skill.slot])
          : [],
      ),
    ).toEqual([["monster_medium:p007", 1]]);
    expect(arbalist.skills[0]!.unlabeled_numbers.map((n) => [n.text, n.numeric])).toEqual([
      ["8", 8],
      ["5", 5],
      ["2", 2],
    ]);
    expect(arbalist.skills[1]!.verified_damage_bonus).toBeUndefined();
  });
  it("身份、页码、整行文字、技能编号、未知图标漂移均拒绝", () => {
    for (const patch of [
      { name: "Other" },
      { level: 2 as const },
      { pages: [7] },
      { verification: { unverified: true, reasons: ["test"] } },
      { skills: [arbalist.skills[1]!] },
      { skills: [...arbalist.skills, arbalist.skills[0]!] },
      { skills: arbalist.skills.map((s) => ({ ...s, effect_lines: [] })) },
      {
        skills: arbalist.skills.map((s) => ({
          ...s,
          effect_lines: s.effect_lines.map((line) =>
            line.map((segment) =>
              segment.type === "icon"
                ? { ...segment, icon: { ...segment.icon, naming: "unverified" as const } }
                : segment,
            ),
          ),
        })),
      },
    ])
      expect(() => attachVerifiedMonsterDamage([{ ...arbalist, ...patch }])).toThrow();
  });
});
