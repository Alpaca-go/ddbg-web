import { describe, expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { aggregateLitHeroSkillStanceCounts, readHeroSkillStanceMarks } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";

const smite = loadNormalizedCorebox().hero_skill.cards.find(
  (c) => c.id === "hero_skill:p001",
)! as HeroSkillCardView;

describe("英雄技能姿态汇总（建队灯条）", () => {
  it("Smite I：进攻与防御点亮", () => {
    expect(readHeroSkillStanceMarks(smite)).toEqual({
      support: "unlit",
      ranged: "unlit",
      defensive: "lit",
      aggressive: "lit",
    });
  });

  it("aggregateLitHeroSkillStanceCounts 累加已选卡面的点亮格", () => {
    const judgement = loadNormalizedCorebox().hero_skill.cards.find(
      (c) => c.id === "hero_skill:p016",
    )! as HeroSkillCardView;
    expect(aggregateLitHeroSkillStanceCounts([smite, judgement])).toEqual({
      support: 1,
      ranged: 1,
      defensive: 1,
      aggressive: 1,
    });
  });
});
