import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { cardContentPack } from "../../../src/shared/content-packs";
import {
  basicQuests,
  matchesQuestCounts,
  questsForCampaignLevel,
  questsForContentPacks,
} from "../../../src/core/quests/basic-quests";
import {
  WARRENS_QUEST_TOKEN_HASH,
  warrensQuestCardSchema,
  warrensQuestCardsSchema,
  warrensDistributionMatchesRegistry,
} from "../../../src/warrens/quests/quest-cards";
import {
  buildWarrensLevelOneQuestCards,
  parseWarrensQuestDistributionLines,
} from "../../../src/warrens/quests/quest-cards.build";
import {
  loadNormalizedWarrensLevelOneQuestCards,
  writeNormalizedWarrensLevelOneQuestCards,
} from "../../../src/warrens/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWarrensLevelOneQuestCards();

const raw = rawFileSchema.parse(read("extract/extension/warrens/raw/quest.json"));
const built = loadNormalizedWarrensLevelOneQuestCards();

describe("Warrens I 级五张任务规范化", () => {
  it("重建结果与提交的 quest_cards.json 一致", () => {
    expect(
      warrensQuestCardsSchema.parse(read("normalized/extension/warrens/quest_cards.json")),
    ).toEqual(built);
    expect(buildWarrensLevelOneQuestCards(raw)).toEqual(built);
  });

  it("单卡拒绝印刷页与任务 ID 漂移", () => {
    const card = built.cards[0]!;
    const other = built.cards[1]!;
    expect(warrensQuestCardSchema.safeParse({ ...card, id: other.id }).success).toBe(false);
  });

  it("raw 卡底行解析与登记分布一致", () => {
    for (const card of built.cards) {
      const rawCard = raw.cards.find((c) => c.id === card.id)!;
      const lines = rawCard.faces.front.lines.map((l) => l.text);
      const distLines = lines.filter((l) =>
        Object.keys(WARRENS_QUEST_TOKEN_HASH).some((hash) => l.includes(`{icon:${hash}}`)),
      );
      expect(
        matchesQuestCounts(parseWarrensQuestDistributionLines(distLines), card.distribution.counts),
      ).toBe(true);
    }
  });

  it("未选 Warrens 包时不进村庄 I 级任务池", () => {
    const coreOnly = questsForContentPacks(1, ["core"]);
    expect(coreOnly.every((q) => cardContentPack(q) === "core")).toBe(true);
    expect(coreOnly.map((q) => q.id)).not.toContain("quest:warrens:p001");
    const withWarrens = questsForContentPacks(1, ["core", "warrens"]).map((q) => q.id);
    expect(withWarrens).not.toContain("quest:warrens:p001");
    expect(questsForCampaignLevel(1)).toHaveLength(5);
  });

  it("p004 分布与登记表一致", () => {
    const worm = built.cards.find((c) => c.id === "quest:warrens:p004")!;
    expect(
      warrensDistributionMatchesRegistry(
        worm.distribution,
        basicQuests.find((q) => q.id === worm.id)!.distribution,
      ),
    ).toBe(true);
  });
});
