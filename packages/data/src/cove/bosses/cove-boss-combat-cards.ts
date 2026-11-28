import { z } from "zod";
import { coveBossIdSchema } from "./cove-boss-abilities";

const PRINT_ROOT = "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/";
export const COVE_BOSS_LARGE_FRONT = `${PRINT_ROOT}DD_EN_COVE_CARDS_140x140_monster_large_FRONT.pdf`;
export const COVE_BOSS_MEDIUM_FRONT = `${PRINT_ROOT}DD_EN_COVE_CARDS_70_120_monsters_medium_FRONT.pdf`;

export const coveBossCombatCardManifest = [
  {
    id: "monster_large:cove:p003",
    bossId: "shambler",
    name: "Shambler",
    level: 1,
    size: "large",
    role: "boss",
    roomId: "room:cove:11",
  },
  {
    id: "monster_large:cove:p004",
    bossId: "shambler",
    name: "Shambler",
    level: 2,
    size: "large",
    role: "boss",
    roomId: "room:cove:11",
  },
  {
    id: "monster_large:cove:p005",
    bossId: "shambler",
    name: "Shambler",
    level: 3,
    size: "large",
    role: "boss",
    roomId: "room:cove:11",
  },
  {
    id: "monster_large:cove:p006",
    bossId: "siren",
    name: "Siren",
    level: 1,
    size: "large",
    role: "boss",
    roomId: "room:cove:10",
  },
  {
    id: "monster_large:cove:p007",
    bossId: "siren",
    name: "Siren",
    level: 2,
    size: "large",
    role: "boss",
    roomId: "room:cove:10",
  },
  {
    id: "monster_large:cove:p008",
    bossId: "siren",
    name: "Siren",
    level: 3,
    size: "large",
    role: "boss",
    roomId: "room:cove:10",
  },
  {
    id: "monster_large:cove:p009",
    bossId: "drowned_crew",
    name: "Drowned Crew",
    level: 1,
    size: "large",
    role: "boss",
    roomId: "room:cove:12",
  },
  {
    id: "monster_large:cove:p010",
    bossId: "drowned_crew",
    name: "Drowned Crew",
    level: 2,
    size: "large",
    role: "boss",
    roomId: "room:cove:12",
  },
  {
    id: "monster_large:cove:p011",
    bossId: "drowned_crew",
    name: "Drowned Crew",
    level: 3,
    size: "large",
    role: "boss",
    roomId: "room:cove:12",
  },
  {
    id: "monster_medium:cove:p023",
    bossId: "shambler",
    name: "Shambler Tentacle",
    level: 1,
    size: "medium",
    role: "summon",
  },
  {
    id: "monster_medium:cove:p025",
    bossId: "shambler",
    name: "Shambler Tentacle",
    level: 2,
    size: "medium",
    role: "summon",
  },
  {
    id: "monster_medium:cove:p027",
    bossId: "shambler",
    name: "Shambler Tentacle",
    level: 3,
    size: "medium",
    role: "summon",
  },
  {
    id: "monster_medium:cove:p029",
    bossId: "drowned_crew",
    name: "Drowned Anchorman",
    level: 1,
    size: "medium",
    role: "summon",
  },
  {
    id: "monster_medium:cove:p030",
    bossId: "drowned_crew",
    name: "Drowned Anchorman",
    level: 2,
    size: "medium",
    role: "summon",
  },
  {
    id: "monster_medium:cove:p031",
    bossId: "drowned_crew",
    name: "Drowned Anchorman",
    level: 3,
    size: "medium",
    role: "summon",
  },
] as const;

const cardSchema = z.strictObject({
  id: z.string(),
  bossId: coveBossIdSchema,
  name: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  size: z.enum(["large", "medium"]),
  role: z.enum(["boss", "summon"]),
  roomId: z
    .string()
    .regex(/^room:cove:\d{2}$/)
    .optional(),
  printedType: z.string().min(1),
  sourcePage: z.int().positive(),
  sourceFile: z.string().min(1),
  printedLines: z.array(z.string()).min(1),
  boss: z.literal(true),
  poolEligible: z.literal(false),
  combatReady: z.literal(false),
  pendingReview: z.array(z.string()).min(1),
});

export const coveBossCombatCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-boss-combat-cards-v1"),
    textOnly: z.literal(true),
    cards: z.array(cardSchema).length(coveBossCombatCardManifest.length),
  })
  .superRefine((file, ctx) => {
    if (file.cards.length !== coveBossCombatCardManifest.length) {
      ctx.addIssue({ code: "custom", message: "Cove Boss 战斗卡数量不符" });
      return;
    }
    for (const [i, expected] of coveBossCombatCardManifest.entries()) {
      const card = file.cards[i];
      if (!card || card.id !== expected.id) {
        ctx.addIssue({ code: "custom", message: `Cove Boss 战斗卡顺序或 ID 不符：${expected.id}` });
      }
    }
  });

export type CoveBossCombatCards = z.infer<typeof coveBossCombatCardsSchema>;
