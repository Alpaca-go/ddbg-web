import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { cardContentPack } from "../content-packs";
import {
  basicQuests,
  matchesQuestCounts,
  questsForCampaignLevel,
  questsForContentPacks,
} from "../basic-quests";
import {
  WEALD_QUEST_TOKEN_HASH,
  wealdQuestCardsSchema,
  wealdDistributionMatchesRegistry,
} from "../weald-quest-cards";
import {
  buildWealdLevelOneQuestCards,
  parseWealdQuestDistributionLines,
} from "./weald-quest-cards";
import {
  loadNormalizedWealdLevelOneQuestCards,
  writeNormalizedWealdLevelOneQuestCards,
} from "./write-weald";

const read = (file: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${file}`, import.meta.url), "utf8")) as unknown;

if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdLevelOneQuestCards();

const raw = rawFileSchema.parse(read("extract/extension/weald/raw/quest.json"));
const built = loadNormalizedWealdLevelOneQuestCards();

describe("Weald I 级五张任务规范化（R-240–R-249）", () => {
  it("重建结果与提交的 quest_cards.json 一致", () => {
    expect(
      wealdQuestCardsSchema.parse(read("normalized/extension/weald/quest_cards.json")),
    ).toEqual(built);
    expect(buildWealdLevelOneQuestCards(raw)).toEqual(built);
  });

  it("分布 hash kind 覆盖五张已裁定组合", () => {
    for (const kind of new Set(Object.values(WEALD_QUEST_TOKEN_HASH))) {
      expect(built.cards.some((c) => c.distribution.counts.some((row) => row.kind === kind))).toBe(
        ["lair", "treasure", "objective", "empty", "dark", "curio", "trap"].includes(kind),
      );
    }
    const p004 = built.cards.find((c) => c.id === "quest:weald:p004")!;
    expect(p004.distribution.counts.map((c) => c.kind).sort()).toEqual(["dark", "lair", "trap"]);
    expect(wealdDistributionMatchesRegistry(p004.distribution, p004.distribution)).toBe(true);
  });

  it("raw 卡底行解析与登记分布一致", () => {
    for (const card of built.cards) {
      const rawCard = raw.cards.find((c) => c.id === card.id)!;
      const lines = rawCard.faces.front.lines.map((l) => l.text);
      const distLines = lines.filter((l) =>
        Object.keys(WEALD_QUEST_TOKEN_HASH).some((hash) => l.includes(`{icon:${hash}}`)),
      );
      expect(
        matchesQuestCounts(parseWealdQuestDistributionLines(distLines), card.distribution.counts),
      ).toBe(true);
    }
  });

  it("未选 Weald 包时不进村庄 I 级任务池", () => {
    const coreOnly = questsForContentPacks(1, ["core"]);
    expect(coreOnly.every((q) => cardContentPack(q) === "core")).toBe(true);
    expect(coreOnly.map((q) => q.id)).not.toContain("quest:weald:p001");
    const withWeald = questsForContentPacks(1, ["core", "weald"]).map((q) => q.id);
    expect(withWeald).not.toContain("quest:weald:p001");
    expect(questsForCampaignLevel(1)).toHaveLength(5);
  });

  it("p004 登记 R-248 数据标志且不含运行时抽牌", () => {
    const purge = basicQuests.find((q) => q.id === "quest:weald:p004")!;
    expect(purge.monsterDrawScope).toBe("wealdLocalOnly");
  });
});
