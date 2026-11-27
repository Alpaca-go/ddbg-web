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

export const directAttackSchema = z.strictObject({
  stances: z.array(z.enum(["support", "ranged", "defensive", "aggressive"])).min(1),
  range: z.int().nonnegative(),
  monsterTargets: z.int().positive(),
  hit: z.strictObject({ threshold: z.int().nonnegative(), damage: z.int().nonnegative() }),
  critical: z.strictObject({ threshold: z.int().nonnegative(), damage: z.int().nonnegative() }),
  onHit: z.array(statusEffectSchema),
});

export type DirectAttack = Readonly<z.infer<typeof directAttackSchema>>;
