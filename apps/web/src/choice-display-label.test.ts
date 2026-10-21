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
    expect(humanizeChoiceOptionLabel("使用 food（food-1）抵消", "use:food-1")).toBe(
      "使用食物·1：抵消",
    );
  });

  it("探索危险结算带实例序号", () => {
    expect(humanizeChoiceOptionLabel("使用 tool（tool-1）抵消", "use:tool-1")).toBe(
      "使用工具（仅探索）·1：抵消",
    );
  });

  it("Torch 按钮去 id", () => {
    expect(humanizeChoiceOptionLabel("先使用 Torch（torch-1）", "use:torch-1")).toBe("先使用火把");
    expect(humanizeChoiceOptionLabel("使用 torch（torch-1）抵消", "use:torch-1")).toBe(
      "使用火把·1：抵消",
    );
  });
});
