import { z } from "zod";
import file from "../normalized/extension/weald/higher_monsters.json";
import { monsterStanceGroupsSchema } from "./normalize/monster-stance";
import { monsterEffectPlanSchema } from "./monster-effects";

const skillSchema = z.strictObject({
  slot: z.int().positive(),
  name: z.string().min(1),
  target: z.enum(["Closest", "Crowded", "Furthest"]),
  range: z.int().nonnegative(),
  targets: z.int().min(1).max(4),
  damage: z.tuple([
    z.int().nonnegative(),
    z.int().nonnegative(),
    z.int().nonnegative(),
    z.int().nonnegative(),
  ]),
  plan: monsterEffectPlanSchema,
});
const cardSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  level: z.union([z.literal(2), z.literal(3)]),
  pages: z.array(z.int().positive()).min(1),
  entityPages: z.array(z.int().positive()).min(1),
  life: z.int().positive(),
  dodge: z.int().nonnegative(),
  speed: z.int().nonnegative(),
  stanceSlots: z.union([z.literal(1), z.literal(2)]),
  type_position_tags: z.array(z.string()),
  resistances: z.array(z.enum(["stun", "blight", "debuff", "shuffle"])),
  immunities: z.array(z.enum(["stun"])),
  stanceGroups: monsterStanceGroupsSchema,
  skills: z.array(skillSchema).min(1),
});
export const wealdHigherMonstersSchema = z.strictObject({
  schema: z.literal("ddbg-weald-higher-monsters-v1"),
  ruling: z.literal("R-263"),
  cards: z.tuple([cardSchema, cardSchema]),
});

/** R-263：独立高等级核准数据，不改变 I 级目录或任务例外。 */
export function readWealdHigherMonsters() {
  return wealdHigherMonstersSchema.parse(file).cards;
}
