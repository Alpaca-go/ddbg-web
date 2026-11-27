import { z } from "zod";
import { STATUS_DEFINITIONS, STATUS_KINDS } from "./status-kinds";

/** 可执行效果词条。卡牌只提供本次执行需要的参数。 */
export const EFFECTS = {
  status: STATUS_DEFINITIONS,
  shortenCondition: { turns: 1 },
} as const;

export const statusEffectSchema = z
  .strictObject({
    kind: z.enum(STATUS_KINDS),
    duration: z.int().positive(),
    amount: z.int().nonnegative().optional(),
  })
  .refine(
    ({ kind, amount }) => (EFFECTS.status[kind].turnStart === "wounds") === (amount !== undefined),
    { path: ["amount"], message: "持续伤害需要面值，其他状态不接受面值" },
  );

export const conditionalDamageSchema = z.strictObject({
  amount: z.int().positive(),
  condition: z.enum(["marked", "unholy", "stunned", "human", "blighted", "eldritch"]),
});
export type ConditionalDamage = Readonly<z.infer<typeof conditionalDamageSchema>>;

export const directAttackSchema = z
  .strictObject({
    stances: z.array(z.enum(["support", "ranged", "defensive", "aggressive"])).min(1),
    range: z.int().nonnegative(),
    rangeMinimum: z.int().nonnegative().optional(),
    monsterTargets: z.int().positive(),
    hit: z.strictObject({ threshold: z.int().nonnegative(), damage: z.int().nonnegative() }),
    critical: z.strictObject({ threshold: z.int().nonnegative(), damage: z.int().nonnegative() }),
    onHit: z.array(statusEffectSchema),
    onUse: z.array(statusEffectSchema).optional(),
    targetLight: z.int().min(-5).max(5).optional(),
    selfHeal: z.int().positive().optional(),
    combinedHealMarker: z.literal(true).optional(),
    selfWound: z.int().positive().optional(),
    selfStress: z.int().optional(),
    requiredForm: z.enum(["human", "beast"]).optional(),
    damageBonus: conditionalDamageSchema.optional(),
    selfShuffle: z
      .strictObject({ direction: z.enum(["push", "pull"]), distance: z.int().positive() })
      .optional(),
  })
  .refine(({ range, rangeMinimum }) => rangeMinimum === undefined || rangeMinimum <= range, {
    path: ["rangeMinimum"],
    message: "最小射程不能超过最大射程",
  });

export type DirectAttack = Readonly<z.infer<typeof directAttackSchema>>;
