import { printIcon } from "../../shared/print-icons";
import { z } from "zod";
import {
  roomDistributionSchema,
  type RoomDistribution,
  type RoomTokenKind,
} from "../../core/tiles/dungeon-layout";

export const WARRENS_QUEST_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_70_120_quests_FRONT.pdf";
export const WARRENS_QUEST_BACK =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_04_EN_WARRENS/DD_EN_WARRENS_CARDS_70_120_quests_BACK.pdf";

/** 与核心／Weald 同几何的分布 kind；Warrens 专属 hash 见 Q-WARRENS-01–05（待印核）。 */
export const WARRENS_QUEST_TOKEN_HASH: Readonly<Record<string, RoomTokenKind>> = {
  [printIcon("decor", 167)]: "empty",
  // 跨包已裁定 hash
  "6f701b5f5f": "empty",
  d3a3e38ee9: "objective",
  a488fd5ff1: "treasure",
  e7b30e2005: "trap",
  "509c4a958c": "curio",
  "0fd90af65e": "dark",
  // Q-WARRENS-01：Warrens 巢穴行图标（待 Kyries 印核；语义暂定 lair）
  be78e95113: "lair",
  // Q-WARRENS-02：与 R-110 dark 同槽位几何的另一 hash（待印核）
  "7b075a3925": "dark",
  // Q-WARRENS-03–05：待印核
  "365b7941a4": "curio",
  e473d2b695: "treasure",
  f1011c773e: "empty",
};

export const warrensQuestCardSchema = z
  .strictObject({
    id: z.string().regex(/^quest:warrens:p00[1-5]$/),
    name: z.string().min(1),
    level: z.literal(1),
    restPoints: z.int().nonnegative(),
    printedLines: z.array(z.string()).min(1),
    specialRuleLines: z.array(z.string()),
    distribution: roomDistributionSchema,
    source: z.strictObject({
      front: z.literal(WARRENS_QUEST_FRONT),
      back: z.literal(WARRENS_QUEST_BACK),
      page: z.int().min(1).max(5),
    }),
    verifiedRules: z.array(z.string()).min(1),
    pendingConfirmation: z.array(z.string()),
  })
  .superRefine((card, ctx) => {
    const expectedId = `quest:warrens:p${String(card.source.page).padStart(3, "0")}`;
    if (card.id !== expectedId)
      ctx.addIssue({ code: "custom", path: ["id"], message: `${card.id} 与印刷页不一致` });
    if (card.distribution.questId !== card.id)
      ctx.addIssue({
        code: "custom",
        path: ["distribution", "questId"],
        message: "Warrens 房间分布必须引用所属任务的 canonical ID",
      });
  });

export const warrensQuestCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-warrens-quest-cards-v1"),
    scope: z.literal("level_one_normal"),
    cards: z.array(warrensQuestCardSchema).length(5),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join() !== "1,2,3,4,5") {
      ctx.addIssue({ code: "custom", message: "I 级五张须为 FRONT p1–p5" });
    }
  });

export type WarrensQuestCards = z.infer<typeof warrensQuestCardsSchema>;

export function warrensDistributionMatchesRegistry(
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
