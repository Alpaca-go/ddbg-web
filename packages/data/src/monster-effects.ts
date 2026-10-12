import { z } from "zod";

const scope = z.enum(["self", "target"]);
const status = z
  .strictObject({
    type: z.literal("status"),
    scope,
    kind: z.enum([
      "bleed",
      "blight",
      "stun",
      "buff",
      "debuff",
      "mark",
      "guard",
      "riposte",
      "protection",
    ]),
    duration: z.int().positive(),
    amount: z.int().positive().optional(),
  })
  .superRefine((effect, ctx) => {
    if ((effect.kind === "bleed" || effect.kind === "blight") !== (effect.amount !== undefined))
      ctx.addIssue({ code: "custom", message: "仅 Bleed / Blight 必须提供面值" });
  });
export const monsterEffectPlanSchema = z.strictObject({
  source: z.literal("print_front"),
  signatures: z.array(z.string().min(1)).min(1),
  effects: z
    .array(
      z.discriminatedUnion("type", [
        status,
        z.strictObject({
          type: z.literal("stress"),
          scope: z.literal("target"),
          amount: z.int().positive(),
        }),
        z.strictObject({ type: z.literal("light"), scope, amount: z.int().refine((n) => n !== 0) }),
        z.strictObject({
          type: z.literal("shuffle"),
          scope,
          direction: z.enum(["push", "pull"]),
          distance: z.int().positive(),
        }),
        z.strictObject({
          type: z.literal("damageBonus"),
          condition: z.literal("marked"),
          amount: z.int().positive(),
        }),
        z.strictObject({ type: z.literal("disease"), scope: z.literal("target") }),
      ]),
    )
    .min(1),
});
export type MonsterEffectPlan = z.infer<typeof monsterEffectPlanSchema>;
