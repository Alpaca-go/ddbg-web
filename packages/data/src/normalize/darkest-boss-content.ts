import type { RawFile } from "../extract/raw";
import { darkestBossContentSchema } from "../darkest-boss-content";
import type { NormalizedMonsterMediumFile, NormalizedMonsterLargeFile } from "./schema";

/** 仅录入R39–41明确的先攻/行动数量与卡牌身份，不补未审Speed/选招/几何。 */
export function buildDarkestBossContent(
  quests: RawFile,
  abilities: RawFile,
  medium: NormalizedMonsterMediumFile,
  large: NormalizedMonsterLargeFile,
) {
  const actor = (
    cardId: string,
    abilityPage: number,
    name: string,
    stance: "aggressive" | "ranged",
    initiativeCards: number,
    actionsPerRound: number | "special",
  ) => {
    const card = [...medium.cards, ...large.cards].find((c) => c.id === cardId);
    const ability = abilities.cards.find(
      (c) => c.id === `boss_ability:p${String(abilityPage).padStart(3, "0")}`,
    );
    const text = ability?.faces.front.lines.map((l) => l.text ?? "").join("\n") ?? "";
    const actionLabel = `ACTIONS / Round: ${actionsPerRound === "special" ? "Special" : actionsPerRound}`;
    if (
      !card ||
      card.level !== 3 ||
      !ability ||
      ability.source_set !== "base" ||
      ability.faces.front.page !== abilityPage ||
      ability.faces.front.file !==
        "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf" ||
      !text.includes(name) ||
      !text.includes(actionLabel)
    )
      throw new Error(`最暗Boss身份/能力卡/行动数与印刷转录不符：${cardId}`);
    const normalizedNames: Record<string, string> = {
      "Ancestor 1st Form": "Ancestor 1",
      "Ancestor 2nd Form": "Ancestor 2",
    };
    if (card.name !== (normalizedNames[name] ?? name)) throw new Error("最暗Boss战斗卡名称漂移");
    return { cardId, abilityCardId: ability.id, stance, initiativeCards, actionsPerRound };
  };
  const encounters = [
    {
      questId: "quest:p016",
      roomCardId: "room:p023",
      actors: [actor("monster_large:p017", 33, "Shuffling Horror", "aggressive", 2, 2)],
      supportCardIds: ["monster_medium:p072", "monster_medium:p075"],
      supportAbilityCardIds: [],
      skipFinalForm: "ancestor2",
      combatReady: false,
    },
    {
      questId: "quest:p017",
      roomCardId: "room:p022",
      actors: [
        actor("monster_large:p015", 28, "Templar Impaler", "aggressive", 2, 2),
        actor("monster_large:p014", 26, "Templar Warlord", "ranged", 2, 2),
      ],
      supportCardIds: [],
      supportAbilityCardIds: [],
      skipFinalForm: "ancestor1",
      combatReady: false,
    },
    {
      questId: "quest:p018",
      roomCardId: "room:p024",
      actors: [actor("monster_large:p016", 30, "Mammoth Cyst", "aggressive", 2, 2)],
      supportCardIds: ["monster_medium:p104"],
      supportAbilityCardIds: [
        actor("monster_medium:p104", 31, "White Cell Stalk", "aggressive", 2, 2).abilityCardId,
      ],
      skipFinalForm: "gestatingHeart",
      combatReady: false,
    },
  ];
  for (const e of encounters) {
    const q = quests.cards.find((c) => c.id === e.questId);
    const text = q?.faces.front.lines.map((l) => l.text ?? "").join("\n") ?? "";
    const expected =
      e.questId === "quest:p016"
        ? "2nd Form"
        : e.questId === "quest:p017"
          ? "1st Form"
          : "Gestating Heart";
    if (
      !q ||
      q.source_set !== "base" ||
      q.faces.front.file !== "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf" ||
      !text.includes(expected) ||
      e.actors.some(
        (a) =>
          !text.includes([...medium.cards, ...large.cards].find((c) => c.id === a.cardId)!.name),
      )
    )
      throw new Error("最暗任务SPECIAL与Boss/取消形态不符");
  }
  return darkestBossContentSchema.parse({
    schema: "ddbg-darkest-boss-content-v1",
    source: {
      abilities: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_Boss_Abilities_FRONT.pdf",
      quests: "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_quests_FRONT.pdf",
    },
    encounters,
    finalBattle: {
      roomCardId: "room:p025",
      preparationDays: 4,
      drawHamletEvent: false,
      exploration: false,
      rollProvisions: true,
      forms: [
        {
          id: "ancestor1",
          actor: actor("monster_medium:p105", 34, "Ancestor 1st Form", "aggressive", 4, "special"),
          supportCardIds: ["monster_medium:p106", "monster_medium:p109"],
          combatReady: false,
        },
        {
          id: "ancestor2",
          actor: actor("monster_large:p018", 35, "Ancestor 2nd Form", "aggressive", 2, 2),
          supportCardIds: [],
          combatReady: false,
        },
        {
          id: "gestatingHeart",
          actor: actor("monster_large:p019", 36, "Gestating Heart", "aggressive", 1, 1),
          supportCardIds: [],
          combatReady: false,
        },
        {
          id: "heartOfDarkness",
          actor: actor("monster_large:p020", 37, "Heart of Darkness", "aggressive", 2, 2),
          supportCardIds: [],
          combatReady: false,
        },
      ],
    },
  });
}
