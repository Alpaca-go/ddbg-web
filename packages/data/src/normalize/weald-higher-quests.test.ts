import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { rawFileSchema } from "../extract/raw";
import { basicQuests } from "../basic-quests";
import { wealdHigherQuestsSchema } from "../weald-higher-quests";
import { buildWealdHigherQuests } from "./weald-higher-quests";
import { loadNormalizedWealdHigherQuests, writeNormalizedWealdHigherQuests } from "./write-weald";

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8")) as unknown;
if (process.env.WRITE_NORMALIZED === "1") writeNormalizedWealdHigherQuests();
const raw = rawFileSchema.parse(read("extract/extension/weald/raw/quest.json"));

describe("R-264 高等级任务数据批", () => {
  it("可重建全部十卡，II／III 各五张，当前名称与原始转录一致", () => {
    const result = loadNormalizedWealdHigherQuests();
    expect(result).toEqual(
      wealdHigherQuestsSchema.parse(read("normalized/extension/weald/higher_quests.json")),
    );
    expect(result.cards.filter((c) => c.level === 2)).toHaveLength(5);
    expect(result.cards.filter((c) => c.level === 3)).toHaveLength(5);
    expect(result.cards.find((c) => c.source.page === 9)?.name).toBe("Hounds of the Woods");
    expect(result.cards.find((c) => c.source.page === 10)?.name).toBe("Lost Supplies");
    expect(result.cards.filter((c) => c.runtimeReady).map((c) => c.id)).toEqual([
      "quest:weald:p006",
      "quest:weald:p007",
      "quest:weald:p008",
      "quest:weald:p009",
      "quest:weald:p011",
      "quest:weald:p012",
      "quest:weald:p013",
      "quest:weald:p014",
      "quest:weald:p015",
    ]);
    expect(
      basicQuests
        .filter((q) => result.cards.some((c) => c.id === q.id && c.runtimeReady))
        .map((q) => q.id)
        .sort(),
    ).toEqual([
      "quest:weald:p006",
      "quest:weald:p007",
      "quest:weald:p008",
      "quest:weald:p009",
      "quest:weald:p011",
      "quest:weald:p012",
      "quest:weald:p013",
      "quest:weald:p014",
      "quest:weald:p015",
    ]);
  });
  it("p008 固定巢穴3＋随机5，不沿用核心问号分布或误作陷阱3", () => {
    expect(
      buildWealdHigherQuests(raw).cards.find((c) => c.source.page === 8)?.distribution,
    ).toEqual({ counts: [{ kind: "lair", count: 3 }], randomSlots: 5 });
  });
  it("核准覆盖与印刷转录分开保留：腐蚀合并、箱子替换不吞其它奖励", () => {
    const cards = buildWealdHigherQuests(raw).cards;
    expect(cards.find((c) => c.source.page === 11)?.approvedOverrides).toEqual([
      {
        kind: "burnOakTiming",
        waitThroughEmptyBattle: true,
        refillAtIgnitionRoundEnd: true,
        burnAfterRounds: 1,
        burningDoesNotEndBattle: true,
        retainObjectiveOnForcedRetreat: true,
      },
    ]);
    expect(cards.find((c) => c.source.page === 14)?.approvedOverrides).toEqual([
      { kind: "lairDeathBlight", amount: 2, stacks: 2, duration: 2 },
    ]);
    expect(cards.find((c) => c.source.page === 10)?.approvedOverrides).toEqual([
      {
        kind: "lostSupplies",
        skipNormalEmbarkDice: true,
        chestRolls: 2,
        preserveOtherRewards: true,
        returnedGoldPerProvision: 1,
      },
    ]);
    expect(cards.find((c) => c.source.page === 14)?.specialRuleLines.join(" ")).toContain("2t");
  });
  it("拒绝缺失、重复、异地来源、错误等级和错位标题", () => {
    for (const mutate of [
      (r: typeof raw) => {
        r.cards.pop();
      },
      (r: typeof raw) => {
        r.cards[8] = structuredClone(r.cards[9]!);
      },
      (r: typeof raw) => {
        r.cards[8]!.faces.front.file = "corebox/quests.pdf";
      },
      (r: typeof raw) => {
        r.cards[8]!.faces.front.lines.find((l) => l.text === "8 Hounds of the Woods")!.text =
          "8 Searching in the Dark";
      },
      (r: typeof raw) => {
        r.cards[8]!.faces.back!.lines.forEach((l) => {
          l.text = l.text.replace("II", "III");
        });
      },
    ]) {
      const copy = structuredClone(raw);
      mutate(copy);
      expect(() => buildWealdHigherQuests(copy)).toThrow();
    }
    expect(buildWealdHigherQuests(raw)).toEqual(loadNormalizedWealdHigherQuests());
  });
});
