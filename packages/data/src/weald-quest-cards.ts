import { z } from "zod";
import {
  roomDistributionSchema,
  type RoomDistribution,
  type RoomTokenKind,
} from "./dungeon-layout";

export const WEALD_QUEST_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_70_120_quests_FRONT.pdf";
export const WEALD_QUEST_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_06_EN_WEALD/DD_EN_WEALD_CARDS_70_120_quests_BACK.pdf";

/** R-240、R-249：Weald 任务底栏分布图标 → 房间代币 kind；重叠检出 hash 映射到已裁定 kind。 */
export const WEALD_QUEST_TOKEN_HASH: Readonly<Record<string, RoomTokenKind>> = {
  d3a3e38ee9: "objective",
  "6f701b5f5f": "empty",
  af3ce426ec: "dark",
  adcdfc394a: "dark",
  "67dc216fc3": "curio",
  "509c4a958c": "curio",
  e7b30e2005: "trap",
  a488fd5ff1: "treasure",
  "1154a8a4d4": "lair",
};

export const wealdQuestCardSchema = z.strictObject({
  id: z.string().regex(/^quest:weald:p00[1-5]$/),
  name: z.string().min(1),
  level: z.literal(1),
  restPoints: z.int().positive(),
  printedLines: z.array(z.string()).min(1),
  specialRuleLines: z.array(z.string()),
  distribution: roomDistributionSchema,
  source: z.strictObject({
    front: z.literal(WEALD_QUEST_FRONT),
    back: z.literal(WEALD_QUEST_BACK),
    page: z.int().min(1).max(5),
  }),
  /** 数据层裁定摘要；不含未确认运行时状态机（R-246 等）。 */
  verifiedRules: z.array(z.string()).min(1),
});

export const wealdQuestCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-weald-quest-cards-v1"),
    scope: z.literal("level_one_normal"),
    cards: z.array(wealdQuestCardSchema).length(5),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join() !== "1,2,3,4,5") {
      ctx.addIssue({ code: "custom", message: "I 级五张须为 FRONT p1–p5" });
    }
    for (const card of file.cards) {
      const expectedId = `quest:weald:p${String(card.source.page).padStart(3, "0")}`;
      if (card.id !== expectedId) {
        ctx.addIssue({ code: "custom", message: `${card.id} 与印刷页不一致` });
      }
    }
  });

export type WealdQuestCards = z.infer<typeof wealdQuestCardsSchema>;

/** 核对规范化分布与出征定义登记的模板一致。 */
export function wealdDistributionMatchesRegistry(
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
