import { z } from "zod";

/** QUEST p1：Scout Ahead I提供8点；R15：休息后弃柴火。 */
export const SCOUT_REST_POINTS = 8;
export const scoutRestSchema = z
  .strictObject({
    questId: z.literal("quest:p001"),
    used: z.boolean(),
    plan: z
      .strictObject({
        mode: z.enum(["collective", "equal"]),
        spend: z
          .array(
            z.strictObject({
              heroId: z.string().min(1),
              heal: z.int().min(0).max(8),
              stress: z.int().min(0).max(8),
            }),
          )
          .length(4),
      })
      .optional(),
  })
  .superRefine((rest, ctx) => {
    const spend = rest.plan?.spend ?? [];
    const total = spend.reduce((n, s) => n + s.heal + s.stress, 0);
    if (
      total > 8 ||
      (rest.used ? total !== 8 : total === 8) ||
      new Set(spend.map((s) => s.heroId)).size !== spend.length ||
      (rest.plan?.mode === "equal" && spend.some((s) => s.heal + s.stress > 2))
    )
      ctx.addIssue({ code: "custom", message: "柴火 / 休息分配不守恒" });
  });
export type ScoutRest = z.infer<typeof scoutRestSchema>;
