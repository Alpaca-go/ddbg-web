import { expect, it } from "vitest";
import demBones from "../../data/normalized/corebox/dem_bones_distribution.json";
import risingThreat from "../../data/normalized/corebox/rising_threat_distribution.json";
import creepingDarkness from "../../data/normalized/corebox/creeping_darkness_distribution.json";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import weAreTheFlame from "../../data/normalized/corebox/we_are_the_flame_distribution.json";
import faceTheThreat from "../../data/normalized/corebox/face_the_threat_distribution.json";
import { roomDistributionTokenTotal } from "../../data/src/dungeon-layout";
import {
  asQuestMapPairingQuest,
  basicQuests,
  questsForCampaignLevel,
} from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import {
  bossFlatQuestSummarySchema,
  standardBasicQuestSummarySchema,
} from "../../data/src/quest-summary";

const GOLDEN: Record<
  string,
  { restPoints: number; xpKind: string; roomsPerXp: number; maxRooms: number; tokenTotal: number }
> = {
  "quest:p004": { restPoints: 8, xpKind: "objective", roomsPerXp: 1, maxRooms: 1, tokenTotal: 8 },
  "quest:p005": { restPoints: 12, xpKind: "curio", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p006": { restPoints: 12, xpKind: "objective", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p009": { restPoints: 8, xpKind: "objective", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p010": { restPoints: 12, xpKind: "objective", roomsPerXp: 1, maxRooms: 1, tokenTotal: 8 },
  "quest:p011": { restPoints: 4, xpKind: "dark", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p012": { restPoints: 8, xpKind: "camp", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p013": { restPoints: 8, xpKind: "objective", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p014": { restPoints: 8, xpKind: "all", roomsPerXp: 2, maxRooms: 6, tokenTotal: 8 },
  "quest:p015": { restPoints: 8, xpKind: "lair", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
};

it("非 Boss 十张 III 级任务等：八枚代币、休息点与 XP 口径对齐印刷 extract（p012 camp XP，R-113）", () => {
  for (const [id, expected] of Object.entries(GOLDEN)) {
    const quest = basicQuests.find((q) => q.id === id);
    expect(quest).toBeDefined();
    expect(quest).toMatchObject({
      restPoints: expected.restPoints,
      xpKind: expected.xpKind,
      roomsPerXp: expected.roomsPerXp,
      maxRooms: expected.maxRooms,
    });
    expect(roomDistributionTokenTotal(quest!.distribution)).toBe(expected.tokenTotal);
  }
  expect(basicQuests.map((q) => q.id)).toContain("quest:p012");
});

it("Dem Bones / Rising Threat / Creeping Darkness / Forward Camps 分布 JSON 与 basic-quests 一致", () => {
  expect(basicQuests.find((q) => q.id === "quest:p004")!.distribution).toEqual(demBones);
  expect(basicQuests.find((q) => q.id === "quest:p005")!.distribution).toEqual(risingThreat);
  expect(basicQuests.find((q) => q.id === "quest:p014")!.distribution).toEqual(creepingDarkness);
  expect(basicQuests.find((q) => q.id === "quest:p012")!.distribution).toEqual(forwardCamps);
});

it("R-109 / R-110：Rising Threat 无 lair；They Are Back dark×1 curio×1（Kyries 2026-10-25）", () => {
  expect(risingThreat.counts).toEqual([
    { kind: "empty", count: 2 },
    { kind: "dark", count: 1 },
    { kind: "curio", count: 3 },
    { kind: "treasure", count: 1 },
    { kind: "trap", count: 1 },
  ]);
  expect(basicQuests.find((q) => q.id === "quest:p013")!.distribution.counts).toEqual([
    { kind: "objective", count: 3 },
    { kind: "empty", count: 1 },
    { kind: "dark", count: 1 },
    { kind: "curio", count: 1 },
    { kind: "trap", count: 2 },
  ]);
});

it("R-120：Boss 任务 p016–p019 分布、region、tokenTotal；p019 不进 III 级普通出征池", () => {
  const bossIds = ["quest:p016", "quest:p017", "quest:p018", "quest:p019"] as const;
  for (const id of bossIds) {
    const quest = basicQuests.find((q) => q.id === id)!;
    expect("bossQuest" in quest && quest.bossQuest).toBe(true);
    expect(quest.xpKind).toBe("flat");
    if (quest.xpKind !== "flat") throw new Error("expected flat boss quest");
    expect(quest.flatXp).toBe(3);
    expect("roomsPerXp" in quest).toBe(false);
    expect("maxRooms" in quest).toBe(false);
  }
  for (const id of ["quest:p016", "quest:p017", "quest:p018"] as const) {
    const quest = basicQuests.find((q) => q.id === id)!;
    expect(quest.expeditionRegion).toBe("darkestDungeon");
    expect(roomDistributionTokenTotal(quest.distribution)).toBe(16);
    const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), 0, 0);
    expect(["quest_map:p011", "quest_map:p012"]).toContain(layout.id);
  }
  const p019 = basicQuests.find((q) => q.id === "quest:p019")!;
  expect(p019.expeditionRegion).toBe("ruins");
  expect(p019.restPoints).toBe(12);
  expect(roomDistributionTokenTotal(p019.distribution)).toBe(8);
  expect(basicQuests.find((q) => q.id === "quest:p016")!.distribution).toEqual(weAreTheFlame);
  expect(p019.distribution).toEqual(faceTheThreat);
  const level3Pool = questsForCampaignLevel(3).map((q) => q.id);
  for (const id of bossIds) expect(level3Pool).not.toContain(id);
  expect(level3Pool).toContain("quest:p011");
});

it("R-122：Boss 定额摘要用 bossFlatQuestSummarySchema，不走标准清房公式", () => {
  expect(
    standardBasicQuestSummarySchema.safeParse({
      questId: "quest:p016",
      name: "We Are The Flame",
      clearedRoomIds: ["A"],
      xpPerHero: 3,
      stagecoachXp: 3,
      awarded: false,
    }).success,
  ).toBe(false);
  const parsedBoss = bossFlatQuestSummarySchema.safeParse({
    questId: "quest:p016",
    name: "We Are The Flame",
    clearedRoomIds: ["A"],
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: false,
  });
  expect(parsedBoss.success).toBe(true);
});

it("standardBasicQuestSummarySchema 接受新任务待发 XP", () => {
  const parsed = standardBasicQuestSummarySchema.safeParse({
    questId: "quest:p005",
    name: "Rising Threat I",
    clearedRoomIds: ["A", "B"],
    xpPerHero: 2,
    stagecoachXp: 2,
    awarded: false,
  });
  expect(parsed.success).toBe(true);
});
