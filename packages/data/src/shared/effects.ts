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

export const CONDITIONAL_DAMAGE_SUFFIX = {
  marked: "{mark}",
  stunned: "{stun}",
  blighted: "{blight}",
  human: "Humans",
  eldritch: "Eldritch",
  unholy: "Unholy",
} as const satisfies Readonly<Record<ConditionalDamage["condition"], string>>;

const attackShuffleSchema = z.strictObject({
  direction: z.enum(["push", "pull"]),
  distance: z.int().positive(),
});

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
    damageBonuses: z.array(conditionalDamageSchema).min(2).optional(),
    damageWithOwnBleedOrBlight: z.int().positive().optional(),
    ignoresProtection: z.literal(true).optional(),
    ignoresGuard: z.literal(true).optional(),
    selfShuffle: attackShuffleSchema.optional(),
    targetShuffle: attackShuffleSchema.optional(),
  })
  .refine(({ range, rangeMinimum }) => rangeMinimum === undefined || rangeMinimum <= range, {
    path: ["rangeMinimum"],
    message: "最小射程不能超过最大射程",
  })
  .refine(({ damageBonus, damageBonuses }) => !damageBonus || !damageBonuses, {
    path: ["damageBonuses"],
    message: "单条和多条条件伤害不能同时登记",
  });

export type DirectAttack = Readonly<z.infer<typeof directAttackSchema>>;

export const healSupportSchema = z
  .strictObject({
    stances: z.array(z.enum(["support", "ranged", "defensive", "aggressive"])).min(1),
    range: z.int().nonnegative().optional(),
    rangeMinimum: z.int().nonnegative().optional(),
    selfRange: z.literal(true).optional(),
    heroTargets: z.int().nonnegative(),
    effect: z.literal("heal").optional(),
    hit: z
      .strictObject({
        threshold: z.int().nonnegative(),
        heal: z.int().nonnegative().optional(),
      })
      .optional(),
    critical: z
      .strictObject({
        threshold: z.int().nonnegative(),
        heal: z.int().nonnegative().optional(),
      })
      .optional(),
    selfHeal: z.int().nonnegative().optional(),
    selfStress: z.int().optional(),
    selfHealStress: z.strictObject({ heal: z.int().nonnegative(), stress: z.int() }).optional(),
    combinedHealMarker: z.literal(true).optional(),
    targetHeal: z.int().nonnegative().optional(),
    targetStress: z.int().optional(),
    targetLight: z.int().min(-5).max(5).optional(),
    onHit: z.array(statusEffectSchema).optional(),
    onUse: z.array(statusEffectSchema).optional(),
    removal: z
      .array(
        z.strictObject({
          scope: z.enum(["self", "target"]),
          kinds: z
            .array(z.enum(["bleed", "blight"]))
            .length(2)
            .refine((kinds) => new Set(kinds).size === kinds.length, "移除状态种类不得重复"),
        }),
      )
      .min(1)
      .optional(),
  })
  .refine(
    ({ range, rangeMinimum, selfRange }) => {
      if (selfRange) return range === undefined && rangeMinimum === undefined;
      if (range === undefined) return false;
      return rangeMinimum === undefined || rangeMinimum <= range;
    },
    { path: ["rangeMinimum"], message: "自身射程不能再登记距离，最小射程不能超过最大射程" },
  )
  .refine(({ hit, critical }) => !critical || hit !== undefined, {
    path: ["critical"],
    message: "有暴击判定时必须同时登记命中判定",
  })
  .refine(
    ({ selfHeal, selfStress, selfHealStress }) =>
      !selfHealStress || (selfHeal === undefined && selfStress === undefined),
    { path: ["selfHealStress"], message: "成对自身治疗减压不能与单独自身治疗或压力同时登记" },
  );

export type HealSupport = Readonly<z.infer<typeof healSupportSchema>>;
