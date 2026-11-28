import { z } from "zod";
import { roomTokenKindSchema } from "../../core/tiles/dungeon-layout";
import { WARRENS_QUEST_FRONT, WARRENS_QUEST_BACK } from "./quest-cards";

export const warrensHigherQuestsSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-higher-quests-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string().regex(/^quest:warrens:p0(?:0[6-9]|1[0-5])$/),
          name: z.string().min(1),
          level: z.union([z.literal(2), z.literal(3)]),
          restPoints: z.int().nonnegative(),
          source: z.strictObject({
            front: z.literal(WARRENS_QUEST_FRONT),
            back: z.literal(WARRENS_QUEST_BACK),
            page: z.int().min(6).max(15),
          }),
          specialRuleLines: z.array(z.string()),
          distribution: z.strictObject({
            counts: z
              .array(z.strictObject({ kind: roomTokenKindSchema, count: z.int().positive() }))
              .min(1),
            randomSlots: z.union([z.literal(0), z.literal(5)]),
          }),
          xp: z.strictObject({
            subject: z.enum([
              "lairCleared",
              "objectiveCleared",
              "roomsCleared",
              "trinketReturned",
              "largeMonsterSlain",
              "swineSkiverSlain",
            ]),
            per: z.union([z.literal(1), z.literal(2)]),
            cap: z.literal(3),
          }),
          pendingConfirmation: z.array(z.string()).min(1),
          verifiedRules: z.array(z.string()),
          runtimeReady: z.literal(false),
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
        card.id !== `quest:warrens:p${String(card.source.page).padStart(3, "0")}` ||
        card.level !== (card.source.page <= 10 ? 2 : 3) ||
        card.runtimeReady !== false ||
        counts.reduce<number>((sum, row) => sum + row.count, randomSlots) !== 8 ||
        new Set(counts.map((row) => row.kind)).size !== counts.length
      )
        ctx.addIssue({ code: "custom", message: `任务身份、等级或分布漂移：${card.id}` });
    }
  });
