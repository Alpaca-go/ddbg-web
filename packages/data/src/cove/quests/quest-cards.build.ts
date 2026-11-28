import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { matchesQuestCounts } from "../../core/quests/basic-quests";
import {
  COVE_QUEST_EXCLUDED_IDS,
  COVE_QUEST_FRONT,
  COVE_QUEST_TOKEN_HASH,
  coveQuestCardsSchema,
  type CoveQuestCards,
} from "./quest-cards";

function printTokenPattern(token: string) {
  return printLine(token).replace(/[{}]/g, "\\$&");
}

const FRONT_LEVEL_I = new RegExp(
  String.raw`\{icon:` +
    printSourceIcon("extension/cove/raw/quest.json:quest:cove:p001:front:1") +
    String.raw`\}\s*I\b`,
);
const DISTRIBUTION_SUFFIX = new RegExp(
  String.raw`^\s*` + printTokenPattern("{print:decor@262}") + String.raw`\s*`,
);
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
  rest = rest.replace(DISTRIBUTION_SUFFIX, "");
  const direct = rest.match(/^(\d+)/);
  if (direct) return Number(direct[1]);
  const beforeNext = rest.split(/\{icon:[a-f0-9]+\}/)[0] ?? "";
  const embedded = beforeNext.match(/(\d+)/);
  return embedded ? Number(embedded[1]) : 1;
}

/** 自底栏行抽取已裁定 hash 的数量；未映射 hash 忽略（R-048）。 */
export function parseCoveQuestDistributionLines(lines: readonly string[]) {
  const counts = new Map<string, number>();
  for (const line of lines.filter((l) => DIST_LINE.test(l))) {
    for (const hash of Object.keys(COVE_QUEST_TOKEN_HASH)) {
      const needle = `{icon:${hash}}`;
      let searchFrom = 0;
      while (true) {
        const index = line.indexOf(needle, searchFrom);
        if (index < 0) break;
        const kind = COVE_QUEST_TOKEN_HASH[hash]!;
        const count = countAfterDistributionIcon(line, hash, index);
        counts.set(kind, (counts.get(kind) ?? 0) + count);
        searchFrom = index + needle.length;
      }
    }
  }
  return [...counts.entries()].map(([kind, count]) => ({ kind, count }));
}

function footerDistributionLines(lines: readonly string[]) {
  const end = lines.indexOf("XP");
  return end < 0 ? [] : lines.slice(end + 1).filter((l) => DIST_LINE.test(l));
}

function distributionSource(page: number, distLines: readonly string[]) {
  const pending = new Set<string>();
  for (const line of distLines) {
    for (const hash of line.match(/\{icon:([a-f0-9]+)\}/g) ?? []) {
      const id = hash.slice(6, -1);
      if (id === printIcon("decor", 262)) continue;
      if (!(id in COVE_QUEST_TOKEN_HASH)) pending.add(id);
    }
  }
  const mapped = Object.entries(COVE_QUEST_TOKEN_HASH)
    .map(([hash, kind]) => `${hash}→${kind}`)
    .join(", ");
  const pendingNote =
    pending.size === 0 ? "" : `; 待确认 hash: ${[...pending].sort().join(", ")}（未写入 counts）`;
  return `DD_EN_COVE_CARDS_70_120_quests_FRONT.pdf p${page}; FRONT-only; 已裁定同 hash: ${mapped}${pendingNote}`;
}

export function buildCoveLevelOneQuestCards(raw: RawFile): CoveQuestCards {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Cove 任务 raw（15 张 FRONT）");
  const source = raw.sources.find((s) => s.front === COVE_QUEST_FRONT);
  if (!source || source.back !== null)
    throw new Error("Cove 任务来源须为 FRONT-only（back: null）");
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
      const { name, restPoints } = parseTitle(lines);
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
    excludedQuestIds: [...COVE_QUEST_EXCLUDED_IDS],
    cards,
  });
}
