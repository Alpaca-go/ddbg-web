import { printLine, printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import porkChop from "../../../normalized/extension/warrens/pork_chop_distribution.json";
import exploreTheSewers from "../../../normalized/extension/warrens/explore_the_sewers_distribution.json";
import familyTrinkets from "../../../normalized/extension/warrens/family_trinkets_distribution.json";
import wormSquash from "../../../normalized/extension/warrens/worm_squash_distribution.json";
import disarmThem from "../../../normalized/extension/warrens/disarm_them_distribution.json";
import { roomDistributionSchema, type RoomDistribution } from "../../core/tiles/dungeon-layout";
function matchesQuestCounts(
  actual: readonly { kind: string; count: number }[],
  expected: readonly { kind: string; count: number }[],
) {
  return (
    actual.length === expected.length &&
    expected.every((e) => actual.some((a) => a.kind === e.kind && a.count === e.count))
  );
}
import {
  WARRENS_QUEST_BACK,
  WARRENS_QUEST_FRONT,
  WARRENS_QUEST_TOKEN_HASH,
  warrensQuestCardsSchema,
  type WarrensQuestCards,
} from "./quest-cards";

function printTokenPattern(token: string) {
  return printLine(token).replace(/[{}]/g, "\\$&");
}

const BACK_LEVEL_I = new RegExp(
  "Quest\\s+\\{icon:" +
    printSourceIcon("extension/warrens/raw/quest.json:quest:warrens:p001:back:0") +
    String.raw`\}\s*I\b`,
);
const FRONT_LEVEL_I = new RegExp(
  String.raw`\{icon:` +
    printSourceIcon("extension/warrens/raw/quest.json:quest:warrens:p001:front:1") +
    String.raw`\}\s*I\b`,
);
const DISTRIBUTION_SUFFIX = new RegExp(
  String.raw`^\s*` + printTokenPattern("{print:decor@262}") + String.raw`\s*`,
);
const DIST_LINE = /\{icon:[a-f0-9]+\}/;

function parseTitle(lines: readonly string[]) {
  const levelLine = lines.find((l) => FRONT_LEVEL_I.test(l));
  if (!levelLine) throw new Error("缺少正面等级行");
  const beforeXp = (() => {
    const xp = lines.indexOf("XP");
    return xp < 0 ? lines : lines.slice(0, xp);
  })();
  const dash = beforeXp.find((l) => l.startsWith("- "));
  if (dash) return { restPoints: 0, name: dash.slice(2).trim() };
  const combined = beforeXp.find((l) => /^\d+\s+\S/.test(l) && !/^1 Xp/i.test(l));
  if (combined) {
    const m = combined.match(/^(\d+)\s*(.*)$/);
    if (!m) throw new Error("正面休息点或名称漂移");
    return { restPoints: Number(m[1]), name: m[2]!.trim() };
  }
  const restOnly = beforeXp.findIndex(
    (l, i) => /^\d+$/.test(l) && beforeXp[i + 1] && !beforeXp[i + 1]!.startsWith("{"),
  );
  if (restOnly >= 0) {
    return { restPoints: Number(beforeXp[restOnly]), name: beforeXp[restOnly + 1]!.trim() };
  }
  throw new Error("缺少正面标题行");
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

/** 自底栏行抽取各图标数量；灰色角标按 R-249 后缀计数。 */
export function parseWarrensQuestDistributionLines(lines: readonly string[]) {
  const counts = new Map<string, number>();
  for (const line of lines.filter((l) => DIST_LINE.test(l))) {
    for (const hash of Object.keys(WARRENS_QUEST_TOKEN_HASH)) {
      const needle = `{icon:${hash}}`;
      let searchFrom = 0;
      while (true) {
        const index = line.indexOf(needle, searchFrom);
        if (index < 0) break;
        const kind = WARRENS_QUEST_TOKEN_HASH[hash]!;
        const count = countAfterDistributionIcon(line, hash, index);
        counts.set(kind, (counts.get(kind) ?? 0) + count);
        searchFrom = index + needle.length;
      }
    }
  }
  return [...counts.entries()].map(([kind, count]) => ({ kind, count }));
}

const LEVEL_ONE_REGISTRY: readonly {
  readonly id: string;
  readonly name: string;
  readonly restPoints: number;
  readonly distribution: RoomDistribution;
  readonly verifiedRules: readonly string[];
}[] = [
  {
    id: "quest:warrens:p001",
    name: "Pork Chop",
    restPoints: 8,
    distribution: roomDistributionSchema.parse(porkChop),
    verifiedRules: ["Q-WARRENS-00", "Q-WARRENS-01"],
  },
  {
    id: "quest:warrens:p002",
    name: "Explore the Sewers",
    restPoints: 0,
    distribution: roomDistributionSchema.parse(exploreTheSewers),
    verifiedRules: ["Q-WARRENS-00", "Q-WARRENS-02"],
  },
  {
    id: "quest:warrens:p003",
    name: "Family Trinkets",
    restPoints: 0,
    distribution: roomDistributionSchema.parse(familyTrinkets),
    verifiedRules: ["Q-WARRENS-00", "Q-WARRENS-03", "Q-WARRENS-04"],
  },
  {
    id: "quest:warrens:p004",
    name: "Worm Squash",
    restPoints: 12,
    distribution: roomDistributionSchema.parse(wormSquash),
    verifiedRules: ["Q-WARRENS-00", "Q-WARRENS-05", "Q-WARRENS-06"],
  },
  {
    id: "quest:warrens:p005",
    name: "Disarm Them",
    restPoints: 12,
    distribution: roomDistributionSchema.parse(disarmThem),
    verifiedRules: ["Q-WARRENS-00", "Q-WARRENS-05", "Q-WARRENS-07"],
  },
];

export function buildWarrensLevelOneQuestCards(raw: RawFile): WarrensQuestCards {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Warrens 任务 raw");
  if (LEVEL_ONE_REGISTRY.length !== 5) throw new Error("I 级登记表缺失");
  const pendingByPage: Record<number, string[]> = {
    1: ["Q-WARRENS-01"],
    2: ["Q-WARRENS-02"],
    3: ["Q-WARRENS-03", "Q-WARRENS-04"],
    4: ["Q-WARRENS-05", "Q-WARRENS-06"],
    5: ["Q-WARRENS-05", "Q-WARRENS-06", "Q-WARRENS-07"],
  };
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
        front.file !== WARRENS_QUEST_FRONT ||
        back?.file !== WARRENS_QUEST_BACK ||
        back?.page !== front.page ||
        !BACK_LEVEL_I.test(backLines[0] ?? "")
      )
        throw new Error(`任务来源或背面等级不符：${card.id}`);
      const { name, restPoints } = parseTitle(lines);
      const quest = LEVEL_ONE_REGISTRY.find((q) => q.id === card.id);
      if (!quest || quest.name !== name || quest.restPoints !== restPoints)
        throw new Error(`任务与登记表漂移：${card.id}`);
      const start = lines.indexOf("SPECIAL RULES"),
        end = lines.indexOf("XP");
      const specialRuleLines = start < 0 || end < 0 ? [] : lines.slice(start + 1, end);
      const distLines = lines.filter((l) =>
        Object.keys(WARRENS_QUEST_TOKEN_HASH).some((hash) => l.includes(`{icon:${hash}}`)),
      );
      const parsedCounts = parseWarrensQuestDistributionLines(distLines);
      if (!matchesQuestCounts(parsedCounts, quest.distribution.counts))
        throw new Error(`卡底分布与登记不一致：${card.id}`);
      const rulingIds = [...quest.verifiedRules];
      return {
        id: card.id,
        name,
        level: 1 as const,
        restPoints,
        printedLines: lines,
        specialRuleLines,
        distribution: quest.distribution,
        source: { front: WARRENS_QUEST_FRONT, back: WARRENS_QUEST_BACK, page: front.page },
        verifiedRules: rulingIds,
        pendingConfirmation: pendingByPage[front.page] ?? ["Q-WARRENS-00"],
      };
    });
  if (cards.length !== 5) throw new Error("I 级五张筛选失败");
  return warrensQuestCardsSchema.parse({
    schema: "ddbg-warrens-quest-cards-v1",
    scope: "level_one_normal",
    cards,
  });
}
