import { expect, it } from "vitest";
import demBones from "../../data/normalized/corebox/dem_bones_distribution.json";
import risingThreat from "../../data/normalized/corebox/rising_threat_distribution.json";
import creepingDarkness from "../../data/normalized/corebox/creeping_darkness_distribution.json";
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
  "quest:p013": { restPoints: 8, xpKind: "objective", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
  "quest:p014": { restPoints: 8, xpKind: "all", roomsPerXp: 2, maxRooms: 6, tokenTotal: 8 },
  "quest:p015": { restPoints: 8, xpKind: "lair", roomsPerXp: 1, maxRooms: 3, tokenTotal: 8 },
};

it("非 Boss 九张任务：八枚代币、休息点与 XP 口径对齐印刷 extract（p012 待确认跳过）", () => {
  for (const [id, expected] of Object.entries(GOLDEN)) {
    const quest = basicQuests.find((q) => q.id === id);
    expect(quest).toBeDefined();
    expect(quest).toMatchObject({
      restPoints: expected.restPoints,
      xpKind: expected.xpKind,
      roomsPerXp: expected.roomsPerXp,
      maxRooms: expected.maxRooms,
    });
    const total = quest!.distribution.counts.reduce((n, c) => n + c.count, 0);
    expect(total).toBe(expected.tokenTotal);
  }
  expect(basicQuests.map((q) => q.id)).not.toContain("quest:p012");
});

it("Dem Bones / Rising Threat / Creeping Darkness 分布 JSON 与 basic-quests 一致", () => {
  expect(basicQuests.find((q) => q.id === "quest:p004")!.distribution).toEqual(demBones);
  expect(basicQuests.find((q) => q.id === "quest:p005")!.distribution).toEqual(risingThreat);
  expect(basicQuests.find((q) => q.id === "quest:p014")!.distribution).toEqual(creepingDarkness);
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
