import { z } from "zod";
import { basicQuests } from "./basic-quests";
import type { BasicQuestId } from "./basic-quests";

/** QUEST：已接通任务的休息点数；R15休息后弃柴火。 */
export const SCOUT_REST_POINTS = 8;
export const restPoints = (id: BasicQuestId) => basicQuests.find((q) => q.id === id)!.restPoints;
const wiredQuestIds = basicQuests.map((q) => q.id) as [BasicQuestId, ...BasicQuestId[]];

export const scoutRestSchema = z
  .strictObject({
    questId: z.enum(wiredQuestIds),
    used: z.boolean(),
    restPointOverride: z.literal(4).optional(),
    plan: z
      .strictObject({
        mode: z.enum(["collective", "equal"]),
        spend: z
          .array(
            z.strictObject({
              heroId: z.string().min(1),
              heal: z.int().min(0).max(12),
              stress: z.int().min(0).max(12),
            }),
          )
          .length(4),
      })
      .optional(),
  })
  .superRefine((rest, ctx) => {
    const spend = rest.plan?.spend ?? [];
    const total = spend.reduce((n, s) => n + s.heal + s.stress, 0);
    const budget = rest.restPointOverride ?? restPoints(rest.questId);
    if (
      total > budget ||
      (rest.used ? total !== budget : total === budget) ||
      new Set(spend.map((s) => s.heroId)).size !== spend.length ||
      (rest.plan?.mode === "equal" && spend.some((s) => s.heal + s.stress > budget / 4))
    )
      ctx.addIssue({ code: "custom", message: "柴火 / 休息分配不守恒" });
  });
export type ScoutRest = z.infer<typeof scoutRestSchema>;
