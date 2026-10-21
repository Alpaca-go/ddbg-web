import { describe, expect, it } from "vitest";
import { createDungeonSandbox } from "@ddbg/engine";
import layout from "../../../../../packages/data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../../../../packages/data/normalized/corebox/scout_ahead_distribution.json";
import { questObjectiveProgressLine, questXpProgressShort } from "./quest-objective-line";

describe("questObjectiveProgressLine", () => {
  it("reads cleared rooms for scout quest", () => {
    const initial = createDungeonSandbox(1, layout, distribution, "standard", "S");
    const line = questObjectiveProgressLine(initial);
    expect(line).toContain("Scout Ahead I");
    expect(line).toContain("任务 XP 0/");
    expect(questXpProgressShort(initial)).toMatch(/^任务 XP \d+\/\d+$/);
  });
});
