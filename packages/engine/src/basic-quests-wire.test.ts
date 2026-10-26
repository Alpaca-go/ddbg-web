import { expect, it } from "vitest";
import demBones from "../../data/normalized/corebox/dem_bones_distribution.json";
import risingThreat from "../../data/normalized/corebox/rising_threat_distribution.json";
import creepingDarkness from "../../data/normalized/corebox/creeping_darkness_distribution.json";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import { roomDistributionTokenTotal } from "../../data/src/dungeon-layout";
import { basicQuests } from "../../data/src/basic-quests";
import { standardBasicQuestSummarySchema } from "../../data/src/quest-summary";

const GOLDEN: Record<
  string,
  { restPoints: number; xpKind: string; roomsPerXp: number; maxRooms: number; tokenTotal: number }
> = {
  "quest:p004": { restPoints: 8, xpKind: "objective", roomsPerXp: 1, maxRooms: 1, tokenTotal: 8 },
  "quest:p005": { restPoints: 12, xpKind: "curio", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p006": { restPoints: 12, xpKind: "objective", roomsPerXp: 1, maxRooms: 2, tokenTotal: 8 },
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
