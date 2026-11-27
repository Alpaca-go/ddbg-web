import { printIcon, printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import { monsterEffectPlanSchema } from "../../core/monsters/monster-effects";
import type { MonsterEffectPlan } from "../../core/monsters/monster-effects";
import { monsterStanceGroupsSchema } from "../../shared/monster-stance";

/** R-232：已确认的完整战斗属性；原始图标命名状态单独保留。 */
export const wealdMonsterProfileSchema = z.strictObject({
  ruling: z.literal("R-232"),
  cardId: z.string().min(1),
  name: z.string().min(1),
  life: z.int().positive(),
  pages: z.array(z.int().positive()).min(1),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
  stanceSlots: z.union([z.literal(1), z.literal(2)]),
  stanceGroups: monsterStanceGroupsSchema,
  resistance: z.enum(["blight", "stun"]),
  resistanceIcon: z.string().regex(/^[a-f0-9]{10}$/),
  immunities: z.array(z.never()).length(0),
});

/** R-230：仅当前五种 I 级怪物；保留原始效果签名，不批准整卡或全局图标。 */
export const wealdMonsterAttackSchema = z.strictObject({
  ruling: z.literal("R-230"),
  cardId: z.string().regex(/^monster_(medium|large):weald:p\d{3}$/),
  slot: z.int().min(1).max(3),
  name: z.string().min(1),
  target: z.enum(["Closest", "Furthest", "Crowded", "Marked -> Closest"]),
  crit: z.int().min(0).max(10),
  criticalDamage: z.int().nonnegative(),
  acc: z.int().min(0).max(10),
  damage: z.int().nonnegative(),
  range: z.int().nonnegative(),
  targets: z.int().min(1).max(4),
  effectSignatures: z.array(z.string().min(1)),
  effects: monsterEffectPlanSchema.shape.effects.optional(),
  summon: z
    .strictObject({
      cardId: z.enum(["monster_medium:weald:p001", "monster_large:weald:p001"]),
      count: z.literal(1),
    })
    .optional(),
});
export type WealdMonsterAttack = z.infer<typeof wealdMonsterAttackSchema>;

const E = "monster_medium:weald:p001";
const G = "monster_medium:weald:p006";
const S = "monster_medium:weald:p009";
const A = "monster_medium:weald:p012";
const L = "monster_large:weald:p001";
function skill(
  cardId: string,
  slot: number,
  name: string,
  numbers: [number, number, number, number],
  range: number,
  targets: number,
  signature = "",
  effects?: MonsterEffectPlan["effects"],
  summon?: "monster_medium:weald:p001" | "monster_large:weald:p001",
) {
  return wealdMonsterAttackSchema.parse({
    ruling: "R-230",
    cardId,
    slot,
    name,
    target:
      cardId === G || (cardId === S && slot === 3)
        ? "Furthest"
        : (cardId === E && slot === 3) ||
            (cardId === A && slot === 2) ||
            (cardId === L && slot === 2)
          ? "Crowded"
          : cardId === S && slot === 2
            ? "Marked -> Closest"
            : "Closest",
    crit: numbers[0],
    criticalDamage: numbers[1],
    acc: numbers[2],
    damage: numbers[3],
    range,
    targets,
    effectSignatures: signature ? [signature] : [],
    ...(effects ? { effects } : {}),
    ...(summon ? { summon: { cardId: summon, count: 1 } } : {}),
  });
}

export const WEALD_MONSTER_ATTACKS = [
  skill(E, 1, "Slime", [1, 7, 9, 4], 1, 1),
  skill(
    E,
    2,
    "Cytokinesis",
    [1, 2, 9, 1],
    1,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1Ectoplasm`,
    undefined,
    E,
  ),
  skill(
    E,
    3,
    "Ectoplasmic Profusion",
    [1, 2, 9, 1],
    1,
    3,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1LargeEctoplasm,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:43")}}+1`,
    [{ type: "stress", scope: "target", amount: 1 }],
    L,
  ),
  skill(
    G,
    1,
    "Rabid Rush",
    [2, 4, 9, 2],
    2,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:24")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Pull2{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}1{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p006:front:19")}}3t,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:45")}}`,
    [
      { type: "shuffle", scope: "self", direction: "pull", distance: 2 },
      { type: "status", scope: "target", kind: "bleed", amount: 1, duration: 3 },
      { type: "disease", scope: "target" },
    ],
  ),
  skill(S, 1, "Groping Swipe", [1, 7, 8, 4], 1, 1),
  skill(
    S,
    2,
    "Rend the Marked",
    [1, 6, 9, 4],
    1,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printIcon("damage", 1)}}+3vs{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:21")}}`,
    [{ type: "damageBonus", condition: "marked", amount: 3 }],
  ),
  skill(
    S,
    3,
    "Harmless Swipe",
    [0, 6, 5, 3],
    2,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:32")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Pull1`,
    [{ type: "shuffle", scope: "self", direction: "pull", distance: 1 }],
  ),
  skill(
    A,
    1,
    "Mark Prey",
    [1, 2, 10, 1],
    2,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:16")}}2t,{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:17")}}2t`,
    [
      { type: "status", scope: "target", kind: "mark", duration: 2 },
      { type: "status", scope: "target", kind: "debuff", duration: 2 },
    ],
  ),
  skill(
    A,
    2,
    "Rain of Blight",
    [1, 2, 10, 1],
    2,
    2,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}2{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:26")}}2t,{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:45")}}`,
    [
      { type: "status", scope: "target", kind: "blight", amount: 2, duration: 2 },
      { type: "disease", scope: "target" },
    ],
  ),
  skill(
    A,
    3,
    "Escape Cloud",
    [1, 2, 10, 1],
    1,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p009:front:32")}}Self{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p004:front:21")}}Push2{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}1{${printSourceIcon("extension/weald/raw/monster_medium.json:monster_medium:weald:p012:front:26")}}3t`,
    [
      { type: "shuffle", scope: "self", direction: "push", distance: 2 },
      { type: "status", scope: "target", kind: "blight", amount: 1, duration: 3 },
    ],
  ),
  skill(L, 1, "Big Slime", [1, 9, 9, 6], 1, 1),
  skill(
    L,
    2,
    "Slime Smack",
    [3, 6, 9, 3],
    1,
    2,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:7")}}1t`,
    [{ type: "status", scope: "target", kind: "stun", duration: 1 }],
  ),
  skill(
    L,
    3,
    "Cytokinesis",
    [1, 6, 9, 3],
    1,
    1,
    `{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:31")}}{${printSourceIcon("extension/weald/raw/monster_large.json:monster_large:weald:p001:front:30")}}1LargeEctoplasm`,
    undefined,
    L,
  ),
] as const;
