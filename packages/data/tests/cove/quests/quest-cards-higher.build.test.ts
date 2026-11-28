import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import { cardContentPack } from "../../../src/shared/content-packs";
import { basicQuests, questsForContentPacks } from "../../../src/core/quests/basic-quests";
import {
  COVE_QUEST_HIGHER_IDS,
  coveQuestHigherCardSchema,
  coveQuestHigherCardsSchema,
} from "../../../src/cove/quests/quest-cards-higher";
import { buildCoveHigherQuestCards } from "../../../src/cove/quests/quest-cards-higher.build";
import { parseCoveQuestDistributionLines } from "../../../src/cove/quests/quest-cards.build";
import {
  loadNormalizedCoveHigherQuestCards,
  writeNormalizedCoveHigherQuestCards,
} from "../../../src/cove/write";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedCoveHigherQuestCards();

const raw = rawFileSchema.parse(read("extract/extension/cove/raw/quest.json"));
const built = loadNormalizedCoveHigherQuestCards();

describe("Cove II/III 任务印刷目录（未接 basicQuests / 出征）", () => {
  it("重建结果与提交的 quest_cards_higher.json 一致", () => {
    expect(
      coveQuestHigherCardsSchema.parse(read("normalized/extension/cove/quest_cards_higher.json")),
    ).toEqual(built);
    expect(buildCoveHigherQuestCards(raw)).toEqual(built);
  });

  it("十张页码与等级一致", () => {
    expect(built.cards.map((c) => c.source.page).join()).toBe("6,7,8,9,10,11,12,13,14,15");
    expect(built.cards.filter((c) => c.level === 2)).toHaveLength(5);
    expect(built.cards.filter((c) => c.level === 3)).toHaveLength(5);
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

  it("未写入 basicQuests", () => {
    expect(basicQuests.every((q) => !q.id.startsWith("quest:cove:"))).toBe(true);
    const withCove = questsForContentPacks(2, ["core", "cove"]).map((q) => q.id);
    for (const card of built.cards) {
      expect(withCove).not.toContain(card.id);
    }
  });

  it("身份、名称、休息点与印刷一致", () => {
    expect(built.cards.map((c) => [c.id, c.name, c.level, c.restPoints] as const)).toEqual([
      ["quest:cove:p006", "Deep Waters 2", 2, 8],
      ["quest:cove:p007", "Unclean Waters 2", 2, 12],
      ["quest:cove:p008", "Deep Horrors 2", 2, 12],
      ["quest:cove:p009", "The Deep Ones", 2, 8],
      ["quest:cove:p010", "Eldritch Purging", 2, 12],
      ["quest:cove:p011", "Deep Waters 3", 3, 8],
      ["quest:cove:p012", "Unclean Waters 3", 3, 12],
      ["quest:cove:p013", "The Deep Ones 2", 3, 8],
      ["quest:cove:p014", "The Shipwrecks", 3, 4],
      ["quest:cove:p015", "Tainted Trinkets", 3, null],
    ]);
    expect(built.cards.map((c) => c.id)).toEqual([...COVE_QUEST_HIGHER_IDS]);
  });

  it("均属 cove 命名空间", () => {
    for (const card of built.cards) {
      expect(cardContentPack(card)).toBe("cove");
      expect(coveQuestHigherCardSchema.safeParse(card).success).toBe(true);
    }
  });
});
