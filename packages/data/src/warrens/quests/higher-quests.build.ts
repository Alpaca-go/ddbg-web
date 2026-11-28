import { printSourceIcon } from "../../shared/print-icons";
import type { RawFile } from "../../shared/extract/raw";
import { WARRENS_QUEST_FRONT, WARRENS_QUEST_BACK } from "./quest-cards";
import { warrensHigherQuestsSchema } from "./higher-quests";

const rows = [
  [
    6,
    2,
    "Ringleaders",
    12,
    { objective: 3, empty: 1, dark: 1, treasure: 2, trap: 1 },
    "swineSkiverSlain",
    1,
    ["Q-WARRENS-08", "Q-WARRENS-09"],
  ],
  [
    7,
    2,
    "Carrion Infestation",
    4,
    { objective: 3, curio: 1, dark: 2, trap: 2 },
    "largeMonsterSlain",
    1,
    ["Q-WARRENS-10", "Q-WARRENS-11"],
  ],
  [
    8,
    2,
    "Bait Them Out",
    12,
    { empty: 3, curio: 1, lair: 1, treasure: 1, trap: 2 },
    "swineSkiverSlain",
    1,
    ["Q-WARRENS-12"],
  ],
  [
    9,
    2,
    "Mapping the Sewers",
    0,
    { empty: 1, dark: 1, curio: 1, lair: 2, treasure: 2, trap: 1 },
    "roomsCleared",
    2,
    ["Q-WARRENS-02"],
  ],
  [
    10,
    2,
    "A New Breed",
    8,
    { empty: 1, dark: 1, curio: 1, lair: 3, trap: 2 },
    "lairCleared",
    1,
    ["Q-WARRENS-03", "Q-WARRENS-13"],
  ],
  [
    11,
    3,
    "Deep in the Warrens",
    0,
    { curio: 2, objective: 2, lair: 2, trap: 2 },
    "roomsCleared",
    2,
    ["Q-WARRENS-14", "Q-WARRENS-15"],
  ],
  [
    12,
    3,
    "Alpha Swine",
    8,
    { dark: 2, curio: 1, lair: 3, trap: 2 },
    "lairCleared",
    1,
    ["Q-WARRENS-16"],
  ],
  [
    13,
    3,
    "Foul Arsenal",
    12,
    { objective: 3, empty: 2, dark: 1, treasure: 1, trap: 1 },
    "objectiveCleared",
    1,
    ["Q-WARRENS-07", "Q-WARRENS-17"],
  ],
  [
    14,
    3,
    "Infighting",
    8,
    { empty: 2, objective: 1, lair: 3, trap: 2 },
    "lairCleared",
    1,
    ["Q-WARRENS-18", "Q-WARRENS-19"],
  ],
  [
    15,
    3,
    "Drums of Doom",
    8,
    { dark: 1, curio: 1, empty: 1, lair: 2, trap: 3 },
    "lairCleared",
    1,
    ["Q-WARRENS-20", "Q-WARRENS-21"],
  ],
] as const;

/** 印刷数据批；专属运行时未接通，runtimeReady 恒为 false。 */
export function buildWarrensHigherQuests(raw: RawFile) {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Warrens 任务来源");
  const cards = rows.map(([page, level, name, restPoints, counts, subject, per, pending]) => {
    const id = `quest:warrens:p${String(page).padStart(3, "0")}`;
    const matches = raw.cards.filter((card) => card.id === id);
    const source = matches[0];
    if (matches.length !== 1 || !source) throw new Error(`任务缺失或重复：${id}`);
    const front = source.faces.front,
      back = source.faces.back;
    const printedLines = front.lines.map((line) => line.text);
    const numeral = level === 2 ? "II" : "III";
    if (
      source.source_set !== "extension" ||
      source.copies !== 1 ||
      front.file !== WARRENS_QUEST_FRONT ||
      back?.file !== WARRENS_QUEST_BACK ||
      front.page !== page ||
      back.page !== page ||
      !printedLines.some(
        (line) =>
          line.includes(
            `{icon:${printSourceIcon("extension/warrens/raw/quest.json:quest:warrens:p001:front:1")}}`,
          ) && line.endsWith(` ${numeral}`),
      ) ||
      !back.lines.some((line) => line.text.endsWith(` ${numeral}`))
    )
      throw new Error(`任务来源或等级不符：${id}`);
    const titleOk =
      restPoints === 0
        ? printedLines.some((l) => l === `- ${name}`)
        : printedLines.some(
            (l) =>
              l.startsWith(`${restPoints} ${name}`) ||
              (l === String(restPoints) && printedLines.includes(name)),
          );
    if (!titleOk) throw new Error(`任务标题不匹配：${id}`);
    const start = printedLines.indexOf("SPECIAL RULES"),
      end = printedLines.indexOf("XP");
    if (end < 0) throw new Error(`任务 XP 节缺失：${id}`);
    return {
      id,
      name,
      level,
      restPoints,
      source: { front: WARRENS_QUEST_FRONT, back: WARRENS_QUEST_BACK, page },
      specialRuleLines: start < 0 || end <= start ? [] : printedLines.slice(start + 1, end),
      distribution: {
        counts: Object.entries(counts).map(([kind, count]) => ({ kind, count })),
        randomSlots: 0 as const,
      },
      xp: { subject, per, cap: 3 as const },
      pendingConfirmation: [...pending],
      verifiedRules: [] as string[],
      runtimeReady: false as const,
    };
  });
  return warrensHigherQuestsSchema.parse({ schema: "ddbg-warrens-higher-quests-v1", cards });
}
