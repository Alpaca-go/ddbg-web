import { z } from "zod";
import { roomDistributionSchema, type RoomDistribution } from "../../core/tiles/dungeon-layout";
import { COVE_QUEST_FRONT } from "./quest-cards";

/** II/III 级（FRONT p6–p15）可审印刷目录。 */
export const COVE_QUEST_HIGHER_IDS = [
  "quest:cove:p006",
  "quest:cove:p007",
  "quest:cove:p008",
  "quest:cove:p009",
  "quest:cove:p010",
  "quest:cove:p011",
  "quest:cove:p012",
  "quest:cove:p013",
  "quest:cove:p014",
  "quest:cove:p015",
] as const;

export const coveQuestHigherCardSchema = z
  .strictObject({
    id: z.enum(COVE_QUEST_HIGHER_IDS),
    name: z.string().min(1),
    level: z.union([z.literal(2), z.literal(3)]),
    restPoints: z.union([z.int().positive(), z.null()]),
    printedLines: z.array(z.string()).min(1),
    specialRuleLines: z.array(z.string()),
    distribution: roomDistributionSchema,
    source: z.strictObject({
      front: z.literal(COVE_QUEST_FRONT),
      back: z.null(),
      page: z.int().min(6).max(15),
    }),
  })
  .superRefine((card, ctx) => {
    const expectedId = `quest:cove:p${String(card.source.page).padStart(3, "0")}`;
    if (card.id !== expectedId)
      ctx.addIssue({ code: "custom", path: ["id"], message: `${card.id} 与印刷页不一致` });
    if (card.distribution.questId !== card.id)
      ctx.addIssue({
        code: "custom",
        path: ["distribution", "questId"],
        message: "Cove 房间分布必须引用所属任务的 canonical ID",
      });
    const expectedLevel = card.source.page <= 10 ? 2 : 3;
    if (card.level !== expectedLevel)
      ctx.addIssue({
        code: "custom",
        path: ["level"],
        message: `p${card.source.page} 应为 ${expectedLevel} 级`,
      });
  });

export const coveQuestHigherCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-quest-cards-higher-v1"),
    scope: z.literal("level_two_three_normal"),
    cards: z.array(coveQuestHigherCardSchema).length(10),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join() !== "6,7,8,9,10,11,12,13,14,15") {
      ctx.addIssue({ code: "custom", message: "II/III 十张须为 FRONT p6–p15" });
    }
  });

export type CoveQuestHigherCards = z.infer<typeof coveQuestHigherCardsSchema>;

export function coveHigherDistributionMatchesCatalog(
  distribution: RoomDistribution,
  template: RoomDistribution,
) {
  if (distribution.questId !== template.questId) return false;
  const actual = distribution.counts;
  const expected = template.counts;
  return (
    actual.length === expected.length &&
    expected.every((e) => actual.some((a) => a.kind === e.kind && a.count === e.count))
  );
}
