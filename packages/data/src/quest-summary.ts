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
