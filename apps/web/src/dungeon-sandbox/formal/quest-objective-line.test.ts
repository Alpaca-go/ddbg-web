import { describe, expect, it } from "vitest";
import { createDungeonSandbox } from "@ddbg/engine";
import { questObjectiveProgressLine, questXpProgressShort } from "./quest-objective-line";

describe("questObjectiveProgressLine", () => {
  it("reads cleared rooms for scout quest", () => {
    const initial = createDungeonSandbox(1, 1, "quest:p001", "standard");
    const line = questObjectiveProgressLine(initial);
    expect(line).toContain("Scout Ahead I");
    expect(line).toContain("任务 XP 0/");
    expect(questXpProgressShort(initial)).toMatch(/^任务 XP \d+\/\d+$/);
  });
});
