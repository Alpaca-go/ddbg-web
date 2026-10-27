import { describe, expect, it } from "vitest";
import { asQuestMapPairingQuest, basicQuests } from "./basic-quests";
import { roomDistributionTokenTotal } from "./dungeon-layout";
import {
  compatibleQuestMapLayouts,
  coreQuestMapLayouts,
  dungeonLayoutRoomSlotCount,
  inferQuestMapRegion,
  isQuestMapPageHardBind,
  pickEmbarkQuestMapLayout,
  pickQuestMapLayout,
} from "./quest-map-pairing";

describe("QuestMap 选图配对（R-116）", () => {
  const layouts = coreQuestMapLayouts();

  it("8 代币遗迹任务不选 16 槽 p11/p12", () => {
    for (const id of ["quest:p011", "quest:p012"] as const) {
      const quest = basicQuests.find((q) => q.id === id)!;
      expect(roomDistributionTokenTotal(quest.distribution)).toBe(8);
      const compatible = compatibleQuestMapLayouts(asQuestMapPairingQuest(quest), layouts);
      expect(compatible.every((l) => dungeonLayoutRoomSlotCount(l) === 8)).toBe(true);
      expect(compatible.some((l) => l.id === "quest_map:p011")).toBe(false);
      expect(compatible.some((l) => l.id === "quest_map:p012")).toBe(false);
      const picked = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 42, 0, layouts);
      expect(picked.id).not.toBe("quest_map:p011");
      expect(picked.id).not.toBe("quest_map:p012");
      expect(dungeonLayoutRoomSlotCount(picked)).toBe(8);
    }
  });

  it("16 代币最暗地牢才配对 16 槽红边图", () => {
    const synthetic = {
      id: "quest:p099",
      distribution: { counts: [{ kind: "empty" as const, count: 16 }] },
      expeditionRegion: "darkestDungeon" as const,
    };
    const compatible = compatibleQuestMapLayouts(synthetic, layouts);
    expect(compatible.map((l) => l.id).sort()).toEqual(["quest_map:p011", "quest_map:p012"]);
    expect(compatible.every((l) => inferQuestMapRegion(l) === "darkestDungeon")).toBe(true);
    expect(pickQuestMapLayout(synthetic, 0, 0, layouts).id).toBe("quest_map:p011");
    expect(pickQuestMapLayout(synthetic, 1, 0, layouts).id).toBe("quest_map:p012");
  });

  it("页码同号不是选图依据：p012 配对结果不等于 quest_map:p012", () => {
    const quest = basicQuests.find((q) => q.id === "quest:p012")!;
    const pairing = asQuestMapPairingQuest(quest);
    expect(
      isQuestMapPageHardBind(quest.id, { source: { page: 12, file: "", face: "front" } }),
    ).toBe(true);
    const layout = pickEmbarkQuestMapLayout(pairing, 99, 0, layouts);
    expect(layout.id).not.toBe("quest_map:p012");
    expect(layout.source.page).not.toBe(12);
  });

  it("R-120：16 代币最暗地牢 Boss 任务配对 confirmed p11/p12", () => {
    const quest = basicQuests.find((q) => q.id === "quest:p016")!;
    const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 3, 0, layouts);
    expect(layout.review).toBe("confirmed");
    expect(["quest_map:p011", "quest_map:p012"]).toContain(layout.id);
  });

  it("出征优先 confirmed 八槽图（遗迹 I 级任务仍用 p001）", () => {
    const quest = basicQuests.find((q) => q.id === "quest:p001")!;
    const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 7, 0, layouts);
    expect(layout.id).toBe("quest_map:p001");
    expect(layout.review).toBe("confirmed");
  });
});
