import { z } from "zod";
import file from "../normalized/extension/weald/quest_exception_monsters.json";
import { monsterStanceGroupsSchema } from "./normalize/monster-stance";

export const CRONE_CARD_ID = "monster_medium:weald:p015";
/** R-253：核准任务例外，不授予随机池资格。 */
export function readWealdCroneProfile() {
  return z
    .object({
      id: z.literal(CRONE_CARD_ID),
      name: z.literal("Crone"),
      level: z.literal(2),
      life: z.literal(12),
      speed: z.literal(3),
      dodge: z.literal(3),
      resistances: z.tuple([z.literal("blight"), z.literal("debuff")]),
      immunities: z.array(z.never()).length(0),
      type_position_tags: z.tuple([z.literal("Human"), z.literal("Back")]),
      stanceGroups: monsterStanceGroupsSchema,
      combatReady: z.literal(true),
      deploymentOnly: z.literal(false),
      verifiedRuleRulings: z.array(z.string()).refine((r) => r.includes("R-253")),
    })
    .parse(file.cards[0]);
}
