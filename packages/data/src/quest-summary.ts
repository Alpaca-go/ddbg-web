import { z } from "zod";
import { basicQuests } from "./basic-quests";

export const questRoomsSchema = z.array(
  z.strictObject({
    id: z.string().min(1),
    kind: z.enum(["empty", "dark", "curio", "lair", "trap", "treasure", "objective"]),
    revealed: z.boolean(),
    cleared: z.boolean().optional(),
  }),
);

/** R14–15 / R29 / R-038：退出后保存待发奖励；回村前不写英雄或驿站 XP。 */
export const scoutQuestSummarySchema = z
  .strictObject({
    questId: z.literal("quest:p001"),
    name: z.literal("Scout Ahead I"),
    clearedRoomIds: z.array(z.string().min(1)).max(6),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((summary, ctx) => {
    if (
      new Set(summary.clearedRoomIds).size !== summary.clearedRoomIds.length ||
      summary.xpPerHero !== Math.floor(summary.clearedRoomIds.length / 2) ||
      summary.stagecoachXp !== summary.xpPerHero
    )
      ctx.addIssue({ code: "custom", message: "Scout Ahead 清理记录 / 待发 XP 不一致" });
  });
export type ScoutQuestSummary = z.infer<typeof scoutQuestSummarySchema>;
export const wipeQuestSummarySchema = z
  .strictObject({
    questId: z.literal("quest:p002"),
    name: z.literal("Wipe ‘Em Out I"),
    clearedRoomIds: z.array(z.string().min(1)).max(3),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.clearedRoomIds).size !== s.clearedRoomIds.length ||
      s.xpPerHero !== s.clearedRoomIds.length ||
      s.stagecoachXp !== s.xpPerHero
    )
      ctx.addIssue({ code: "custom", message: "Wipe ‘Em Out巢穴记录 / 待发XP不一致" });
  });
export const fundraiserQuestSummarySchema = z
  .strictObject({
    questId: z.literal("quest:p003"),
    name: z.literal("Fundraiser I"),
    clearedRoomIds: z.array(z.string().min(1)).max(2),
    earlyLeave: z.boolean(),
    objectiveMet: z.boolean(),
    lairClearedCount: z.int().min(0).max(2),
    donatedGold: z.int().min(0).max(60),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.clearedRoomIds).size !== s.clearedRoomIds.length ||
      s.lairClearedCount !== s.clearedRoomIds.length ||
      s.objectiveMet !== s.lairClearedCount >= 1 ||
      s.earlyLeave === s.objectiveMet ||
      (!s.objectiveMet && s.donatedGold !== 0) ||
      s.xpPerHero !== Math.floor(s.donatedGold / 20) ||
      s.stagecoachXp !== s.xpPerHero
    )
      ctx.addIssue({ code: "custom", message: "Fundraiser捐献 / 巢穴 / 待发XP不一致" });
  });
/** QUEST p7–8、R15/R29、R-038：仅接受已核对的两张II级任务，不放宽I级schema。 */
export const forwardCampsQuestSummarySchema = z
  .strictObject({
    questId: z.literal("quest:p012"),
    name: z.literal("Forward Camps III"),
    clearedRoomIds: z.array(z.string().min(1)),
    forwardCampSetups: z.int().min(0),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (
      new Set(s.clearedRoomIds).size !== s.clearedRoomIds.length ||
      s.xpPerHero !== Math.min(3, s.forwardCampSetups) ||
      s.stagecoachXp !== s.xpPerHero
    )
      ctx.addIssue({
        code: "custom",
        message: "Forward Camps 设营次数 / 清理记录 / 待发 XP 不一致",
      });
  });

export const level2QuestSummarySchema = z
  .strictObject({
    questId: z.enum(["quest:p007", "quest:p008"]),
    name: z.string(),
    clearedRoomIds: z.array(z.string().min(1)).max(6),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const quest = basicQuests.find((q) => q.id === s.questId)!;
    if (!("roomsPerXp" in quest) || !("maxRooms" in quest)) {
      ctx.addIssue({ code: "custom", message: "II级任务身份无效" });
      return;
    }
    if (
      s.name !== quest.name ||
      new Set(s.clearedRoomIds).size !== s.clearedRoomIds.length ||
      s.clearedRoomIds.length > quest.maxRooms ||
      s.xpPerHero !== Math.floor(s.clearedRoomIds.length / quest.roomsPerXp) ||
      s.stagecoachXp !== s.xpPerHero
    )
      ctx.addIssue({ code: "custom", message: "II级任务身份 / 清理记录 / 待发XP不一致" });
  });

const LEGACY_QUEST_SUMMARY_IDS = new Set([
  "quest:p001",
  "quest:p002",
  "quest:p003",
  "quest:p007",
  "quest:p008",
]);

/** 2026-10-25 非 Boss 任务卡：标准 XP 公式（不含 Fundraiser 捐献）。 */
export const standardBasicQuestSummarySchema = z
  .strictObject({
    questId: z.string().min(1),
    name: z.string().min(1),
    clearedRoomIds: z.array(z.string().min(1)),
    xpPerHero: z.int().min(0).max(3),
    stagecoachXp: z.int().min(0).max(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const quest = basicQuests.find((q) => q.id === s.questId);
    if (
      !quest ||
      LEGACY_QUEST_SUMMARY_IDS.has(s.questId) ||
      quest.xpKind === "gold" ||
      quest.xpKind === "camp" ||
      quest.xpKind === "flat"
    ) {
      ctx.addIssue({ code: "custom", message: "非标准任务摘要身份" });
      return;
    }
    if (!("roomsPerXp" in quest) || !("maxRooms" in quest)) {
      ctx.addIssue({ code: "custom", message: "任务身份无效" });
      return;
    }
    if (
      s.name !== quest.name ||
      new Set(s.clearedRoomIds).size !== s.clearedRoomIds.length ||
      s.clearedRoomIds.length > quest.maxRooms ||
      s.xpPerHero !== Math.min(3, Math.floor(s.clearedRoomIds.length / quest.roomsPerXp)) ||
      s.stagecoachXp !== s.xpPerHero
    )
      ctx.addIssue({ code: "custom", message: "任务身份 / 清理记录 / 待发 XP 不一致" });
  });

/** Boss / 最暗定额任务（R-122）；击败后固定 3 XP；回村发放走 `finishReturnToHamlet`。 */
export const bossFlatQuestSummarySchema = z
  .strictObject({
    questId: z.enum(["quest:p016", "quest:p017", "quest:p018", "quest:p019"]),
    name: z.string().min(1),
    clearedRoomIds: z.array(z.string().min(1)),
    xpPerHero: z.literal(3),
    stagecoachXp: z.literal(3),
    awarded: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const quest = basicQuests.find((q) => q.id === s.questId);
    if (!quest || quest.xpKind !== "flat" || quest.flatXp !== 3 || s.name !== quest.name)
      ctx.addIssue({ code: "custom", message: "Boss 定额任务身份不一致" });
  });

export const dungeonQuestSummarySchema = z.union([
  scoutQuestSummarySchema,
  wipeQuestSummarySchema,
  fundraiserQuestSummarySchema,
  forwardCampsQuestSummarySchema,
  level2QuestSummarySchema,
  standardBasicQuestSummarySchema,
  bossFlatQuestSummarySchema,
]);
export type DungeonQuestSummary = z.infer<typeof dungeonQuestSummarySchema>;
