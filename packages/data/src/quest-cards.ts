import { z } from "zod";

export const QUEST_FRONT = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf";
export const QUEST_BACK = "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_quests_BACK.pdf";
export const questCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-quest-cards-v1"),
    cards: z
      .array(
        z.strictObject({
          id: z.string(),
          name: z.string().min(1),
          level: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]),
          restPoints: z.int().positive(),
          printedLines: z.array(z.string()).min(1),
          specialRuleLines: z.array(z.string()),
          source: z.strictObject({
            front: z.literal(QUEST_FRONT),
            back: z.literal(QUEST_BACK),
            page: z.int().min(1).max(19),
          }),
        }),
      )
      .length(19),
  })
  .superRefine((file, ctx) => {
    for (const [i, c] of file.cards.entries()) {
      const page = i + 1;
      const level = page <= 5 ? 1 : page <= 10 ? 2 : page <= 18 ? 3 : null;
      if (
        c.id !== `quest:p${String(page).padStart(3, "0")}` ||
        c.source.page !== page ||
        c.level !== level
      )
        ctx.addIssue({ code: "custom", message: "任务身份/印刷等级/页序不符" });
      const start = c.printedLines.indexOf("SPECIAL RULES");
      const end = c.printedLines.indexOf("XP");
      const expected = start < 0 ? [] : c.printedLines.slice(start + 1, end);
      if (
        end < 0 ||
        (start >= 0 && start >= end) ||
        JSON.stringify(expected) !== JSON.stringify(c.specialRuleLines)
      )
        ctx.addIssue({ code: "custom", message: "任务SPECIAL段落不符" });
    }
  });
export type QuestCards = z.infer<typeof questCardsSchema>;

/** 原始印刷卡文字查询；不替代执行器或出征可用性判定。 */
export function readQuestCard(file: QuestCards, id: string) {
  return questCardsSchema.parse(file).cards.find((c) => c.id === id);
}
