import { describe, expect, it } from "vitest";
import { humanizeChoiceOptionLabel } from "./choice-display-label";

describe("humanizeChoiceOptionLabel", () => {
  it("去掉补给实例 id，保留中文效果", () => {
    expect(
      humanizeChoiceOptionLabel(
        "使用 food（dungeon-starting-provision:ranged:1）抵消",
        "use:dungeon-starting-provision:ranged:1",
      ),
    ).toBe("使用食物抵消");
  });

  it("Torch 按钮去 id", () => {
    expect(humanizeChoiceOptionLabel("先使用 Torch（torch-1）", "use:torch-1")).toBe("先使用火把");
  });
});
