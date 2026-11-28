import { printSourceIcon } from "../../shared/print-icons";
import { z } from "zod";
import {
  roomDistributionSchema,
  type RoomDistribution,
  type RoomTokenKind,
} from "../../core/tiles/dungeon-layout";

export const COVE_QUEST_FRONT =
  "DARKEST_DUNGEON_PRINT_EN_WAVE 2/MG_DD_05_EN_COVE/DD_EN_COVE_CARDS_70_120_quests_FRONT.pdf";

/** II/III 级（FRONT p6–p15）仅登记排除，不进 I 级印刷目录。 */
export const COVE_QUEST_EXCLUDED_IDS = [
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

/**
 * 底栏分布：仅映射与 Weald `WEALD_QUEST_TOKEN_HASH` **同 hash** 的图标（R-048）。
 * Cove 专有新 hash（objective / empty / trap / lair 等变体）待 Kyries 裁定前不写入 kind。
 */
/** 与 Weald 已裁定 **同 hash**（经 `printSourceIcon` 引用 Weald 快照，R-048）。 */
export const COVE_QUEST_TOKEN_HASH: Readonly<Record<string, RoomTokenKind>> = {
  [printSourceIcon("extension/weald/raw/quest.json:quest:weald:p001:front:7")]: "dark",
  [printSourceIcon("extension/weald/raw/quest.json:quest:weald:p001:front:8")]: "curio",
  [printSourceIcon("extension/weald/raw/quest.json:quest:weald:p002:front:9")]: "treasure",
};

export const coveQuestCardSchema = z
  .strictObject({
    id: z.string().regex(/^quest:cove:p00[1-5]$/),
    name: z.string().min(1),
    level: z.literal(1),
    restPoints: z.int().positive(),
    printedLines: z.array(z.string()).min(1),
    specialRuleLines: z.array(z.string()),
    distribution: roomDistributionSchema,
    source: z.strictObject({
      front: z.literal(COVE_QUEST_FRONT),
      back: z.null(),
      page: z.int().min(1).max(5),
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
  });

export const coveQuestCardsSchema = z
  .strictObject({
    schema: z.literal("ddbg-cove-quest-cards-v1"),
    scope: z.literal("level_one_normal"),
    excludedQuestIds: z.array(z.enum(COVE_QUEST_EXCLUDED_IDS)).length(10),
    cards: z.array(coveQuestCardSchema).length(5),
  })
  .superRefine((file, ctx) => {
    const pages = file.cards.map((c) => c.source.page).sort((a, b) => a - b);
    if (pages.join() !== "1,2,3,4,5") {
      ctx.addIssue({ code: "custom", message: "I 级五张须为 FRONT p1–p5" });
    }
  });

export type CoveQuestCards = z.infer<typeof coveQuestCardsSchema>;

export function coveDistributionMatchesCatalog(
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
