import { z } from "zod";

import type { NormalizedMonsterLargeFile, NormalizedMonsterMediumFile } from "../../shared/schema";

export const ABSOLUTE_NOTHINGNESS_PRINTED_NAME = "Absolute Nothingness" as const;

export const BOSS_ABILITY_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf" as const;
export const MONSTER_MEDIUM_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf" as const;
export const MONSTER_LARGE_SOURCE =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_140x140_monster_large_FRONT.pdf" as const;

export const absoluteNothingnessSupportSchema = z.strictObject({
  schema: z.literal("ddbg-absolute-nothingness-support-v1"),
  /** 核心盒 Monster & Boss Cards 中尚无同名战斗卡；规则仅列 3 枚 punchboard 棋子。 */
  status: z.enum(["pending_monster_card", "linked"]),
  expectedName: z.literal(ABSOLUTE_NOTHINGNESS_PRINTED_NAME),
  miniatureCount: z.literal(3),
  bossActorCardId: z.literal("monster_large:p018"),
  abilityCardId: z.literal("boss_ability:p035"),
  supportCardIds: z.array(z.string()),
  placements: z.tuple([
    z.literal("monster_defense"),
    z.literal("monster_ranged"),
    z.literal("monster_support"),
  ]),
  combatReady: z.boolean(),
  sources: z.strictObject({
    rules: z.literal("02_DD_CARDS_COREBOX/DD_EN_COREBOX_RULES.pdf"),
    bossAbility: z.literal(BOSS_ABILITY_SOURCE),
    bossAbilityPage: z.literal(35),
    monsterMediumPdf: z.literal(MONSTER_MEDIUM_SOURCE),
    monsterLargePdf: z.literal(MONSTER_LARGE_SOURCE),
    searchedMediumPages: z.literal("1-111"),
    searchedLargePages: z.literal("1-20"),
  }),
  notes: z.array(z.string()),
});

export type AbsoluteNothingnessSupport = z.infer<typeof absoluteNothingnessSupportSchema>;

export function findAbsoluteNothingnessMonsterCards(
  medium: NormalizedMonsterMediumFile,
  large: NormalizedMonsterLargeFile,
) {
  return [...medium.cards, ...large.cards].filter((c) =>
    "card_kind" in c && c.card_kind === "large_monster_reference"
      ? false
      : c.name === ABSOLUTE_NOTHINGNESS_PRINTED_NAME,
  );
}

export function readAbsoluteNothingnessSupport(file: AbsoluteNothingnessSupport) {
  return absoluteNothingnessSupportSchema.parse(file);
}
