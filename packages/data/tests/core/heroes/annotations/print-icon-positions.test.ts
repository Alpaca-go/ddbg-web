import { expect, it } from "vitest";
import allSkills from "../../../../normalized/corebox/hero_skill.json";
import { defineHeroModule } from "../../../../src/core/heroes/annotations/patch-helpers";
import { normalizedHeroSkillCardSchema } from "../../../../src/shared/schema";

it("R-048：按段引用射程仍拒绝错误段位、语义和同名印刷变体", () => {
  const bellow = normalizedHeroSkillCardSchema.parse(
    allSkills.cards.find(
      (card) => card.name === "Bellow" && card.level === 1 && card.hero === "MAN-AT-ARMS",
    ),
  );
  const original = bellow.stats_line?.[0];
  if (!original || original.type !== "icon") throw new Error("Bellow 缺少射程段");
  const card = { ...bellow, stats_line: [original], effect_lines: [] };
  const apply = (segment: number, expectKey: string) =>
    defineHeroModule({
      id: "h12",
      hero: "MAN-AT-ARMS",
      entries: {},
      fixes: [
        {
          id: card.id,
          name: card.name,
          page: card.pages[0]!,
          level: 1,
          expectedEffects: [],
          expectedStats: "{range}",
          stats: [{ line: "stats", segment, expectKey }],
        },
      ],
    }).apply;
  expect(apply(0, "range")([card])[0]?.stats_line).toEqual([original]);
  expect(() => apply(1, "range")([card])).toThrow(/印刷行图标漂移/);
  expect(() => apply(0, "stress")([card])).toThrow(/印刷图标引用|印刷行图标漂移/);
  const changed = { ...original, icon: { ...original.icon, iconId: "0".repeat(10) } };
  expect(() => apply(0, "range")([{ ...card, stats_line: [changed] }])).toThrow(/印刷行图标漂移/);
});
