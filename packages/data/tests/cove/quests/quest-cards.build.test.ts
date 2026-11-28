import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { cardContentPack } from "../../../src/shared/content-packs";
import { basicQuests, questsForContentPacks } from "../../../src/core/quests/basic-quests";
import {
  COVE_QUEST_EXCLUDED_IDS,
  coveQuestCardSchema,
  coveQuestCardsSchema,
} from "../../../src/cove/quests/quest-cards";
import {
  buildCoveLevelOneQuestCards,
  parseCoveQuestDistributionLines,
} from "../../../src/cove/quests/quest-cards.build";
import {
  loadNormalizedCoveLevelOneQuestCards,
  writeNormalizedCoveLevelOneQuestCards,
} from "../../../src/cove/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveLevelOneQuestCards();

const raw = rawFileSchema.parse(read("extract/extension/cove/raw/quest.json"));
const built = loadNormalizedCoveLevelOneQuestCards();

describe("Cove I 级五张任务印刷目录（未接 basicQuests / 出征）", () => {
  it("重建结果与提交的 quest_cards.json 一致", () => {
    expect(coveQuestCardsSchema.parse(read("normalized/extension/cove/quest_cards.json"))).toEqual(
      built,
    );
    expect(buildCoveLevelOneQuestCards(raw)).toEqual(built);
  });

  it("单卡拒绝印刷页与任务 ID 漂移", () => {
    const card = built.cards[0]!;
    const other = built.cards[1]!;
    expect(coveQuestCardSchema.safeParse({ ...card, id: other.id }).success).toBe(false);
    expect(
      coveQuestCardSchema.safeParse({ ...card, source: { ...card.source, page: 2 } }).success,
    ).toBe(false);
  });

  it("五张均属 cove 命名空间，排除 II/III 清单完整", () => {
    for (const card of built.cards) {
      expect(cardContentPack(card)).toBe("cove");
      expect(card.id.startsWith("quest:cove:p00")).toBe(true);
      expect(card.level).toBe(1);
    }
    expect(built.excludedQuestIds).toEqual([...COVE_QUEST_EXCLUDED_IDS]);
    expect(raw.cards.map((c) => c.id)).toEqual(
      expect.arrayContaining([...COVE_QUEST_EXCLUDED_IDS]),
    );
  });

  it("底栏已裁定 hash 与目录 distribution 一致", () => {
    for (const card of built.cards) {
      const rawCard = raw.cards.find((c) => c.id === card.id)!;
      const lines = rawCard.faces.front.lines.map((l) => l.text);
      const end = lines.indexOf("XP");
      const footer = end < 0 ? [] : lines.slice(end + 1);
      expect(parseCoveQuestDistributionLines(footer)).toEqual(card.distribution.counts);
    }
  });

  it("未写入 basicQuests，核心包出征池不含 Cove 任务", () => {
    expect(basicQuests.every((q) => !q.id.startsWith("quest:cove:"))).toBe(true);
    const coreOnly = questsForContentPacks(1, ["core"]).map((q) => q.id);
    for (const card of built.cards) {
      expect(coreOnly).not.toContain(card.id);
    }
    const withCove = questsForContentPacks(1, ["core", "cove"]).map((q) => q.id);
    for (const card of built.cards) {
      expect(withCove).not.toContain(card.id);
    }
  });

  it("休息点与印刷标题一致", () => {
    expect(built.cards.map((c) => [c.id, c.name, c.restPoints] as const)).toEqual([
      ["quest:cove:p001", "Test the Waters", 12],
      ["quest:cove:p002", "Deep Waters", 8],
      ["quest:cove:p003", "Deep Horrors", 12],
      ["quest:cove:p004", "Unclean Waters", 12],
      ["quest:cove:p005", "Purify the Eldritch Signs", 12],
    ]);
  });
});
