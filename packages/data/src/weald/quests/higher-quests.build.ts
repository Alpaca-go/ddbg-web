import type { RawFile } from "../../shared/extract/raw";
import { WEALD_QUEST_FRONT, WEALD_QUEST_BACK } from "./quest-cards";
import { wealdHigherQuestsSchema } from "./higher-quests";

const rows = [
  [
    6,
    2,
    "Spreaders of Miasma",
    12,
    { objective: 3, empty: 1, dark: 1, curio: 1, lair: 1, trap: 1 },
    "viragoKilled",
    1,
  ],
  [7, 2, "Lost Treasures", 12, { dark: 2, treasure: 3, lair: 1, trap: 2 }, "treasureCleared", 1],
  [8, 2, "Searching in the Dark", 12, { lair: 3 }, "lairCleared", 1],
  [
    9,
    2,
    "Hounds of the Woods",
    8,
    { objective: 3, empty: 1, dark: 2, curio: 1, lair: 1 },
    "objectiveCleared",
    1,
  ],
  [
    10,
    2,
    "Lost Supplies",
    12,
    { empty: 1, dark: 1, treasure: 2, lair: 2, trap: 2 },
    "provisionsReturned",
    2,
  ],
  [11, 3, "No Other Way", 8, { objective: 3, dark: 2, lair: 2, trap: 1 }, "oakBurnt", 1],
  [
    12,
    3,
    "Great Unclean Ones",
    12,
    { objective: 3, empty: 2, curio: 1, treasure: 1, lair: 1 },
    "objectiveCleared",
    1,
  ],
  [
    13,
    3,
    "Final Swipe",
    12,
    { dark: 1, curio: 2, treasure: 2, lair: 2, trap: 1 },
    "roomsCleared",
    2,
  ],
  [14, 3, "The Infected", 8, { dark: 2, curio: 1, lair: 3, trap: 2 }, "lairCleared", 1],
  [
    15,
    3,
    "Whispering Woods",
    8,
    { empty: 1, dark: 1, curio: 1, treasure: 1, lair: 3, trap: 1 },
    "lairCleared",
    1,
  ],
] as const;

/** R-264：核准印刷数据批；未完成专属运行时的任务不进入 basicQuests。 */
export function buildWealdHigherQuests(raw: RawFile) {
  if (raw.category !== "quest" || raw.cards.length !== 15)
    throw new Error("需要完整 Weald 任务来源");
  const cards = rows.map(([page, level, name, restPoints, counts, subject, per]) => {
    const id = `quest:weald:p${String(page).padStart(3, "0")}`;
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
      JSON.stringify(source.pages) !== `[${page}]` ||
      front.file !== WEALD_QUEST_FRONT ||
      back?.file !== WEALD_QUEST_BACK ||
      front.page !== page ||
      back.page !== page ||
      !printedLines.includes(`${restPoints} ${name}`) ||
      !printedLines.includes(`{icon:56ea9289ab} ${numeral}`) ||
      !back.lines.some((line) => line.text.endsWith(` ${numeral}`))
    )
      throw new Error(`任务来源、等级或标题漂移：${id}`);
    const start = printedLines.indexOf("SPECIAL RULES"),
      end = printedLines.indexOf("XP");
    if (start < 0 || end <= start) throw new Error(`任务 SPECIAL／XP 缺失：${id}`);
    return {
      id,
      name,
      level,
      restPoints,
      source: { front: WEALD_QUEST_FRONT, back: WEALD_QUEST_BACK, page },
      specialRuleLines: printedLines.slice(start + 1, end),
      distribution: {
        counts: Object.entries(counts).map(([kind, count]) => ({ kind, count })),
        randomSlots: page === 8 ? 5 : 0,
      },
      xp: { subject, per, cap: 3 },
      approvedOverrides:
        page === 14
          ? [{ kind: "lairDeathBlight", amount: 2, duration: 2, stacks: 2 }]
          : page === 10
            ? [
                {
                  kind: "lostSupplies",
                  skipNormalEmbarkDice: true,
                  chestRolls: 2,
                  preserveOtherRewards: true,
                  returnedGoldPerProvision: 1,
                },
              ]
            : page === 11
              ? [
                  {
                    kind: "burnOakTiming",
                    waitThroughEmptyBattle: true,
                    refillAtIgnitionRoundEnd: true,
                    burnAfterRounds: 1,
                    burningDoesNotEndBattle: true,
                    retainObjectiveOnForcedRetreat: true,
                  },
                ]
              : [],
      verifiedRules: [
        "R-264",
        ...([6, 8, 9, 12, 13, 14].includes(page) ? ["R-265"] : []),
        ...(page === 10 ? ["R-266"] : []),
      ],
      runtimeReady: true,
    };
  });
  return wealdHigherQuestsSchema.parse({ schema: "ddbg-weald-higher-quests-v1", cards });
}
