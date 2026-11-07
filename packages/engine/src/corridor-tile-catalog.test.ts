import { describe, expect, it } from "vitest";
import { resolveQuestMapEdgeCorridor } from "./corridor-tile-catalog";

describe("QuestMap 边 → 走廊绑定", () => {
  it("缺省为 pending，不猜 corridor_tile（核心盒无走廊板块，Q-161）", () => {
    const binding = resolveQuestMapEdgeCorridor("quest_map:p001", "G", "D");
    expect(binding.status).toBe("pending");
    expect(binding.corridorTileId).toBeNull();
    expect(binding.note).toMatch(/未批/);
  });
});
