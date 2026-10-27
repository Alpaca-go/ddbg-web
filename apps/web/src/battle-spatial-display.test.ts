import { describe, expect, it } from "vitest";
import type { BattleArea, HeroSkillCardView } from "@ddbg/engine";
import { readPrintedRange } from "@ddbg/engine";
import { loadNormalizedCorebox } from "../../../packages/data/src/normalize/write";
import { battleAreaDistance, printedAreaRangeReach } from "./battle-spatial-display";

const skills = loadNormalizedCorebox().hero_skill.cards as HeroSkillCardView[];

const areas: BattleArea[] = [
  { id: "A", adjacent: ["B"], capacity: 4, elevation: "normal" },
  { id: "B", adjacent: ["A", "C"], capacity: 4, elevation: "normal" },
  { id: "C", adjacent: ["B"], capacity: 4, elevation: "normal" },
];

const exactRange1 = skills.find((skill) => {
  const range = readPrintedRange(skill);
  return range.kind === "exact" && range.distance === 1;
})!;

describe("battleAreaDistance", () => {
  it("沿邻接最短步数", () => {
    expect(battleAreaDistance(areas, "A", "A")).toBe(0);
    expect(battleAreaDistance(areas, "A", "B")).toBe(1);
    expect(battleAreaDistance(areas, "A", "C")).toBe(2);
  });
});

describe("printedAreaRangeReach", () => {
  it("精确射程 1：同区与隔区", () => {
    expect(exactRange1).toBeDefined();
    expect(printedAreaRangeReach(exactRange1!, "A", "A", areas)).toBe("out");
    expect(printedAreaRangeReach(exactRange1!, "A", "B", areas)).toBe("in");
    expect(printedAreaRangeReach(exactRange1!, "A", "C", areas)).toBe("out");
  });

  it("目标更低时可多一档射程上限", () => {
    const fromHigh: BattleArea[] = [
      { id: "H", adjacent: ["L"], capacity: 4, elevation: "high" },
      { id: "L", adjacent: ["H"], capacity: 4, elevation: "low" },
      ...areas.filter((a) => !["A", "C"].includes(a.id)),
    ];
    expect(printedAreaRangeReach(exactRange1!, "H", "L", fromHigh)).toBe("in");
  });
});
