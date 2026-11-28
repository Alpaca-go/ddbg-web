import { printIcon, printLine, printSourceIcon } from "../../shared/print-icons";
import { COVE_QUEST_FRONT, COVE_QUEST_TOKEN_HASH } from "./quest-cards";

function printTokenPattern(token: string) {
  return printLine(token).replace(/[{}]/g, "\\$&");
}

const COVE_LEVEL_MARK = printSourceIcon("extension/cove/raw/quest.json:quest:cove:p001:front:1");

export const FRONT_LEVEL_I = new RegExp(
  String.raw`\{icon:` + COVE_LEVEL_MARK + String.raw`\}\s*I\b`,
);
export const FRONT_LEVEL_II = new RegExp(
  String.raw`\{icon:` + COVE_LEVEL_MARK + String.raw`\}\s*II\b`,
);
export const FRONT_LEVEL_III = new RegExp(
  String.raw`\{icon:` + COVE_LEVEL_MARK + String.raw`\}\s*III\b`,
);

const DISTRIBUTION_SUFFIX = new RegExp(
  String.raw`^\s*` + printTokenPattern("{print:decor@262}") + String.raw`\s*`,
);
const DIST_LINE = /\{icon:[a-f0-9]+\}/;

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

export function footerDistributionLines(lines: readonly string[]) {
  const end = lines.indexOf("XP");
  return end < 0 ? [] : lines.slice(end + 1).filter((l) => DIST_LINE.test(l));
}

export function distributionSource(page: number, distLines: readonly string[]) {
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

export function parseLevelOneTitle(lines: readonly string[]) {
  const levelLine = lines.find((l) => FRONT_LEVEL_I.test(l));
  const titleLine = lines.find((l) => /^\d+(?:\s|$)/.test(l));
  if (!levelLine || !titleLine) throw new Error("缺少正面等级行或标题行");
  const m = titleLine.match(/^(\d+)\s*(.*)$/);
  if (!m) throw new Error("正面休息点或名称漂移");
  return { restPoints: Number(m[1]), name: m[2]!.trim() };
}

export function parseHigherQuestTitle(lines: readonly string[]) {
  const hasIi = lines.some((l) => FRONT_LEVEL_II.test(l));
  const hasIii = lines.some((l) => FRONT_LEVEL_III.test(l));
  if (!hasIi && !hasIii) throw new Error("缺少正面 II/III 等级行");
  const headerEnd = lines.indexOf("SPECIAL RULES");
  const header = headerEnd < 0 ? lines : lines.slice(0, headerEnd);
  const numericTitle = header.find((l) => /^\d+\s+\S/.test(l) && !/\bXp\b/i.test(l));
  if (numericTitle) {
    const m = numericTitle.match(/^(\d+)\s*(.*)$/);
    if (!m) throw new Error("正面休息点或名称漂移");
    return { restPoints: Number(m[1]), name: m[2]!.trim() };
  }
  const dashTitle = header.find((l) => /^-\s/.test(l));
  if (!dashTitle) throw new Error("缺少标题行（数字前缀或 `-` 标题）");
  const m = dashTitle.match(/^-\s*(.*)$/);
  if (!m) throw new Error("`-` 标题行解析失败");
  return { restPoints: null, name: m[1]!.trim() };
}

export function parseHigherQuestLevel(lines: readonly string[]): 2 | 3 {
  if (lines.some((l) => FRONT_LEVEL_III.test(l))) return 3;
  if (lines.some((l) => FRONT_LEVEL_II.test(l))) return 2;
  throw new Error("无法从正面判定 II/III");
}

export function assertCoveQuestRaw(raw: {
  category: string;
  cards: unknown[];
  sources: unknown[];
}) {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Cove 任务 raw（15 张 FRONT）");
  const source = (raw.sources as { front: string; back: null }[]).find(
    (s) => s.front === COVE_QUEST_FRONT,
  );
  if (!source || source.back !== null)
    throw new Error("Cove 任务来源须为 FRONT-only（back: null）");
}
