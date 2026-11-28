import type { RawFile } from "../../shared/extract/raw";
import { matchesQuestCounts } from "../../core/quests/basic-quests";
import { COVE_QUEST_FRONT, coveQuestCardsSchema, type CoveQuestCards } from "./quest-cards";
import {
  assertCoveQuestRaw,
  distributionSource,
  footerDistributionLines,
  FRONT_LEVEL_I,
  parseCoveQuestDistributionLines,
  parseLevelOneTitle,
} from "./quest-cards.parse";

export { parseCoveQuestDistributionLines } from "./quest-cards.parse";

export function buildCoveLevelOneQuestCards(raw: RawFile): CoveQuestCards {
  assertCoveQuestRaw(raw);
  const cards = [...raw.cards]
    .filter((card) => {
      const lines = card.faces.front.lines.map((l) => l.text);
      return card.faces.front.page <= 5 && lines.some((l) => FRONT_LEVEL_I.test(l));
    })
    .sort((a, b) => a.faces.front.page - b.faces.front.page)
    .map((card) => {
      const front = card.faces.front;
      if (card.source_set !== "extension" || card.copies !== 1 || front.file !== COVE_QUEST_FRONT)
        throw new Error(`任务来源不符：${card.id}`);
      const lines = front.lines.map((l) => l.text);
      const { name, restPoints } = parseLevelOneTitle(lines);
      const start = lines.indexOf("SPECIAL RULES");
      const end = lines.indexOf("XP");
      const specialRuleLines = start < 0 || end < 0 ? [] : lines.slice(start + 1, end);
      const footerLines = footerDistributionLines(lines);
      const parsedCounts = parseCoveQuestDistributionLines(footerLines);
      if (!parsedCounts.length)
        throw new Error(`卡底无已裁定分布 hash：${card.id}（见审阅稿待确认项）`);
      return {
        id: card.id,
        name,
        level: 1 as const,
        restPoints,
        printedLines: lines,
        specialRuleLines,
        distribution: {
          questId: card.id,
          source: distributionSource(front.page, footerLines),
          counts: parsedCounts,
        },
        source: { front: COVE_QUEST_FRONT, back: null, page: front.page },
      };
    });
  if (cards.length !== 5) throw new Error("I 级五张筛选失败");
  for (const card of cards) {
    const rawCard = raw.cards.find((c) => c.id === card.id)!;
    const lines = rawCard.faces.front.lines.map((l) => l.text);
    const footerLines = footerDistributionLines(lines);
    if (!matchesQuestCounts(parseCoveQuestDistributionLines(footerLines), card.distribution.counts))
      throw new Error(`卡底已裁定分布漂移：${card.id}`);
  }
  return coveQuestCardsSchema.parse({
    schema: "ddbg-cove-quest-cards-v1",
    scope: "level_one_normal",
    cards,
  });
}
