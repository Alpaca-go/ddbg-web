import { z } from "zod";
import { roomTokenKindSchema } from "./dungeon-layout";
import { WEALD_QUEST_FRONT, WEALD_QUEST_BACK } from "./weald-quest-cards";

export const wealdHigherQuestsSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-higher-quests-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string().regex(/^quest:weald:p0(?:0[6-9]|1[0-5])$/),
          name: z.string().min(1),
          level: z.union([z.literal(2), z.literal(3)]),
          restPoints: z.union([z.literal(8), z.literal(12)]),
          source: z.strictObject({
            front: z.literal(WEALD_QUEST_FRONT),
            back: z.literal(WEALD_QUEST_BACK),
            page: z.int().min(6).max(15),
          }),
          specialRuleLines: z.array(z.string()).min(1),
          distribution: z.strictObject({
            counts: z
              .array(z.strictObject({ kind: roomTokenKindSchema, count: z.int().positive() }))
              .min(1),
            randomSlots: z.union([z.literal(0), z.literal(5)]),
          }),
          xp: z.strictObject({
            subject: z.enum([
              "viragoKilled",
              "treasureCleared",
              "lairCleared",
              "objectiveCleared",
              "provisionsReturned",
              "oakBurnt",
              "roomsCleared",
            ]),
            per: z.union([z.literal(1), z.literal(2)]),
            cap: z.literal(3),
          }),
          approvedOverrides: z.array(
            z.discriminatedUnion("kind", [
              z.strictObject({
                kind: z.literal("lairDeathBlight"),
                amount: z.literal(4),
                duration: z.literal(2),
              }),
              z.strictObject({
                kind: z.literal("burnOakTiming"),
                waitThroughEmptyBattle: z.literal(true),
                refillAtIgnitionRoundEnd: z.literal(true),
                burnAfterRounds: z.literal(1),
                burningDoesNotEndBattle: z.literal(true),
                retainObjectiveOnForcedRetreat: z.literal(true),
              }),
              z.strictObject({
                kind: z.literal("lostSupplies"),
                skipNormalEmbarkDice: z.literal(true),
                chestRolls: z.literal(2),
                preserveOtherRewards: z.literal(true),
                returnedGoldPerProvision: z.literal(1),
              }),
            ]),
          ),
          verifiedRules: z.tuple([z.literal("R-264")]),
          runtimeReady: z.boolean(),
        }),
      )
      .length(10),
  })
  .superRefine(({ cards }, ctx) => {
    if (new Set(cards.map((card) => card.id)).size !== 10)
      ctx.addIssue({ code: "custom", message: "任务重复" });
    for (const card of cards) {
      const { counts, randomSlots } = card.distribution;
      if (
        card.id !== `quest:weald:p${String(card.source.page).padStart(3, "0")}` ||
        card.level !== (card.source.page <= 10 ? 2 : 3) ||
        card.runtimeReady !== (card.source.page === 7 || card.source.page === 15) ||
        counts.reduce<number>((sum, row) => sum + row.count, randomSlots) !== 8 ||
        new Set(counts.map((row) => row.kind)).size !== counts.length ||
        (randomSlots === 5 &&
          (card.source.page !== 8 ||
            counts.length !== 1 ||
            counts[0]?.kind !== "lair" ||
            counts[0].count !== 3))
      )
        ctx.addIssue({ code: "custom", message: "任务身份、等级或分布漂移" });
    }
  });
