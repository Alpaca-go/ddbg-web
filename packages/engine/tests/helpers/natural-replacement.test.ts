import { describe, expect, it } from "vitest";
import { pickNaturalReplacementOptionId } from "./natural-replacement";

describe("pickNaturalReplacementOptionId", () => {
  const choice = {
    id: "replacement",
    prompt: "pick",
    type: "single" as const,
    options: [
      { id: "hero_stat:core:h01:p001:front", label: "new" },
      { id: "stagecoach:hero-2", label: "revive" },
    ],
  };

  it("默认仍选首个选项", () => {
    expect(pickNaturalReplacementOptionId(choice, false)).toBe("hero_stat:core:h01:p001:front");
  });

  it("优先驿站复活", () => {
    expect(pickNaturalReplacementOptionId(choice, true)).toBe("stagecoach:hero-2");
  });
});
