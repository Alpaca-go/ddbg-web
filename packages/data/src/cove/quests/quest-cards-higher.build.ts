import type { RawFile } from "../../shared/extract/raw";
import { matchesQuestCounts } from "../../core/quests/basic-quests";
import { COVE_QUEST_FRONT } from "./quest-cards";
import {
  assertCoveQuestRaw,
  distributionSource,
  footerDistributionLines,
  FRONT_LEVEL_II,
  FRONT_LEVEL_III,
  parseCoveQuestDistributionLines,
  parseHigherQuestLevel,
  parseHigherQuestTitle,
} from "./quest-cards.parse";
import { coveQuestHigherCardsSchema, type CoveQuestHigherCards } from "./quest-cards-higher";

export function buildCoveHigherQuestCards(raw: RawFile): CoveQuestHigherCards {
  assertCoveQuestRaw(raw);
  const cards = [...raw.cards]
    .filter((card) => {
      const lines = card.faces.front.lines.map((l) => l.text);
      const page = card.faces.front.page;
      return (
        page >= 6 &&
        page <= 15 &&
        lines.some((l) => FRONT_LEVEL_II.test(l) || FRONT_LEVEL_III.test(l))
      );
    })
    .sort((a, b) => a.faces.front.page - b.faces.front.page)
    .map((card) => {
      const front = card.faces.front;
      if (card.source_set !== "extension" || card.copies !== 1 || front.file !== COVE_QUEST_FRONT)
        throw new Error(`任务来源不符：${card.id}`);
      const lines = front.lines.map((l) => l.text);
      const { name, restPoints } = parseHigherQuestTitle(lines);
      const level = parseHigherQuestLevel(lines);
      const start = lines.indexOf("SPECIAL RULES");
      const end = lines.indexOf("XP");
      const specialRuleLines = start < 0 || end < 0 ? [] : lines.slice(start + 1, end);
      const footerLines = footerDistributionLines(lines);
      const parsedCounts = parseCoveQuestDistributionLines(footerLines);
      if (!parsedCounts.length)
        throw new Error(`卡底无已裁定分布 hash：${card.id}（见审阅稿待确认项）`);
      return {
        id: card.id as CoveQuestHigherCards["cards"][number]["id"],
        name,
        level,
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
  if (cards.length !== 10) throw new Error("II/III 十张筛选失败");
  for (const card of cards) {
    const rawCard = raw.cards.find((c) => c.id === card.id)!;
    const lines = rawCard.faces.front.lines.map((l) => l.text);
    const footerLines = footerDistributionLines(lines);
    if (!matchesQuestCounts(parseCoveQuestDistributionLines(footerLines), card.distribution.counts))
      throw new Error(`卡底已裁定分布漂移：${card.id}`);
  }
  return coveQuestHigherCardsSchema.parse({
    schema: "ddbg-cove-quest-cards-higher-v1",
    scope: "level_two_three_normal",
    cards,
  });
}
