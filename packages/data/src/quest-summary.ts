import { z } from "zod";

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
    awarded: z.literal(false),
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
    awarded: z.literal(false),
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
    awarded: z.literal(false),
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
export const dungeonQuestSummarySchema = z.union([
  scoutQuestSummarySchema,
  wipeQuestSummarySchema,
  fundraiserQuestSummarySchema,
]);
export type DungeonQuestSummary = z.infer<typeof dungeonQuestSummarySchema>;
