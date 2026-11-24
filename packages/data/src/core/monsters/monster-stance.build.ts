import { z } from "zod";

const stances = ["aggressive", "defensive", "ranged", "support"] as const;
const slot = z.int().min(1).max(3);
const group = z.union([
  z.strictObject({ stances: z.array(z.enum(stances)).min(1), unavailable: z.literal(true) }),
  z.strictObject({ stances: z.array(z.enum(stances)).min(1), skill: slot }),
  z.strictObject({
    stances: z.array(z.enum(stances)).min(1),
    rollTable: z
      .array(
        z.strictObject({ min: z.int().min(1).max(10), max: z.int().min(1).max(10), skill: slot }),
      )
      .min(1),
  }),
]);

/** R-015（R17、R22、R24）：仅校验人工核实的分组，不从 footer_lines 猜测。 */
export const monsterStanceGroupsSchema = z
  .array(group)
  .min(1)
  .superRefine((groups, ctx) => {
    const seen = new Set<string>();
    groups.forEach((entry, index) => {
      const positions = entry.stances
        .map((stance) => stances.indexOf(stance))
        .sort((a, b) => a - b);
      if (
        entry.stances.some((stance) => seen.has(stance)) ||
        positions.some((position, i) => i > 0 && position !== positions[i - 1]! + 1)
      )
        ctx.addIssue({
          code: "custom",
          message: "姿态分组必须相邻且不能重复",
          path: [index, "stances"],
        });
      entry.stances.forEach((stance) => seen.add(stance));
      if ("rollTable" in entry) {
        const faces = new Set<number>();
        for (const row of entry.rollTable) {
          if (row.min > row.max)
            ctx.addIssue({
              code: "custom",
              message: "骰表区间不能倒置",
              path: [index, "rollTable"],
            });
          for (let face = row.min; face <= row.max; face++) {
            if (faces.has(face))
              ctx.addIssue({
                code: "custom",
                message: "骰表区间不能重叠",
                path: [index, "rollTable"],
              });
            faces.add(face);
          }
        }
        if (faces.size !== 10)
          ctx.addIssue({
            code: "custom",
            message: "骰表必须完整覆盖 d10 的 1–10",
            path: [index, "rollTable"],
          });
      }
    });
    if (seen.size !== 4) ctx.addIssue({ code: "custom", message: "姿态分组必须完整覆盖四种姿态" });
  });

export type MonsterStanceGroups = z.infer<typeof monsterStanceGroupsSchema>;
