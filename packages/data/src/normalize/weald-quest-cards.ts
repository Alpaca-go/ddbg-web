import type { RawFile } from "../extract/raw";
import { basicQuests, matchesQuestCounts } from "../basic-quests";
import {
  WEALD_QUEST_BACK,
  WEALD_QUEST_FRONT,
  WEALD_QUEST_TOKEN_HASH,
  wealdQuestCardsSchema,
  type WealdQuestCards,
} from "../weald-quest-cards";

const BACK_LEVEL_I = /\{icon:0c9e989b70\}\s*I\b/;
const FRONT_LEVEL_I = /\{icon:56ea9289ab\}\s*I\b/;
const DIST_LINE = /\{icon:[a-f0-9]+\}/;

function parseTitle(lines: readonly string[]) {
  const levelLine = lines.find((l) => FRONT_LEVEL_I.test(l));
  const titleLine = lines.find((l) => /^\d+(?:\s|$)/.test(l));
  if (!levelLine || !titleLine) throw new Error("缺少正面等级行或标题行");
  const m = titleLine.match(/^(\d+)\s*(.*)$/);
  if (!m) throw new Error("正面休息点或名称漂移");
  return { restPoints: Number(m[1]), name: m[2]!.trim() };
}

function countAfterDistributionIcon(line: string, hash: string, index: number) {
  let rest = line.slice(index + `{icon:${hash}}`.length);
  rest = rest.replace(/^\s*\{icon:a2e7f1dd7b\}\s*/, "");
  const direct = rest.match(/^(\d+)/);
  if (direct) return Number(direct[1]);
  const beforeNext = rest.split(/\{icon:[a-f0-9]+\}/)[0] ?? "";
  const embedded = beforeNext.match(/(\d+)/);
  return embedded ? Number(embedded[1]) : 1;
}

/** 自底栏行抽取 hash→count；灰色角标 a2e7f1dd7b 只作数量后缀（R-249）。 */
export function parseWealdQuestDistributionLines(lines: readonly string[]) {
  const counts = new Map<string, number>();
  for (const line of lines.filter((l) => DIST_LINE.test(l))) {
    for (const hash of Object.keys(WEALD_QUEST_TOKEN_HASH)) {
      const needle = `{icon:${hash}}`;
      let searchFrom = 0;
      while (true) {
        const index = line.indexOf(needle, searchFrom);
        if (index < 0) break;
        const kind = WEALD_QUEST_TOKEN_HASH[hash]!;
        const count = countAfterDistributionIcon(line, hash, index);
        counts.set(kind, (counts.get(kind) ?? 0) + count);
        searchFrom = index + needle.length;
      }
    }
  }
  return [...counts.entries()].map(([kind, count]) => ({ kind, count }));
}

export function buildWealdLevelOneQuestCards(raw: RawFile): WealdQuestCards {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Weald 任务 raw");
  const wealdL1 = basicQuests.filter((q) => q.id.startsWith("quest:weald:p00"));
  if (wealdL1.length !== 5) throw new Error("basicQuests 须有 I 级五张 Weald 登记");
  const cards = [...raw.cards]
    .filter((card) => card.faces.front.page <= 5)
    .sort((a, b) => a.faces.front.page - b.faces.front.page)
    .map((card) => {
      const front = card.faces.front,
        back = card.faces.back;
      const lines = front.lines.map((l) => l.text);
      const backLines = back?.lines.map((l) => l.text) ?? [];
      if (
        card.source_set !== "extension" ||
        card.copies !== 1 ||
        front.file !== WEALD_QUEST_FRONT ||
        back?.file !== WEALD_QUEST_BACK ||
        back?.page !== front.page ||
        !BACK_LEVEL_I.test(backLines[0] ?? "")
      )
        throw new Error(`任务来源或背面等级不符：${card.id}`);
      const { name, restPoints } = parseTitle(lines);
      const quest = basicQuests.find((q) => q.id === card.id);
      if (
        !quest ||
        quest.id !== card.id ||
        !quest.id.startsWith("quest:weald:p00") ||
        quest.name !== name ||
        quest.restPoints !== restPoints ||
        quest.level !== 1
      )
        throw new Error(`任务与 basicQuests 登记漂移：${card.id}`);
      const start = lines.indexOf("SPECIAL RULES"),
        end = lines.indexOf("XP");
      const specialRuleLines = start < 0 || end < 0 ? [] : lines.slice(start + 1, end);
      const distLines = lines.filter((l) =>
        Object.keys(WEALD_QUEST_TOKEN_HASH).some((hash) => l.includes(`{icon:${hash}}`)),
      );
      const parsedCounts = parseWealdQuestDistributionLines(distLines);
      if (!matchesQuestCounts(parsedCounts, quest.distribution.counts))
        throw new Error(`卡底分布与登记不一致：${card.id}`);
      const rulingIds =
        "verifiedRuleRulings" in quest ? [...quest.verifiedRuleRulings] : ([] as string[]);
      if (!rulingIds.length) throw new Error(`缺少 verifiedRuleRulings：${card.id}`);
      return {
        id: card.id,
        name,
        level: 1 as const,
        restPoints,
        printedLines: lines,
        specialRuleLines,
        distribution: quest.distribution,
        source: { front: WEALD_QUEST_FRONT, back: WEALD_QUEST_BACK, page: front.page },
        verifiedRules: rulingIds,
      };
    });
  if (cards.length !== 5) throw new Error("I 级五张筛选失败");
  return wealdQuestCardsSchema.parse({
    schema: "ddbg-weald-quest-cards-v1",
    scope: "level_one_normal",
    cards,
  });
}
