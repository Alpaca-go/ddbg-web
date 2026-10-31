import { readDarkestBossEncounter } from "./darkest-content";
import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type { BossScriptDefinition, BossScriptId } from "./types";
type DarkestQuestId = "quest:p016" | "quest:p017" | "quest:p018";

export const DARKEST_SHUFFLING_HORROR_SCRIPT_ID =
  "boss:darkest:shuffling-horror" as const satisfies BossScriptId;
export const DARKEST_TEMPLARS_SCRIPT_ID = "boss:darkest:templars" as const satisfies BossScriptId;
export const DARKEST_MAMMOTH_CYST_SCRIPT_ID =
  "boss:darkest:mammoth-cyst" as const satisfies BossScriptId;

const SCRIPT_BY_QUEST: Record<DarkestQuestId, BossScriptId> = {
  "quest:p016": DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  "quest:p017": DARKEST_TEMPLARS_SCRIPT_ID,
  "quest:p018": DARKEST_MAMMOTH_CYST_SCRIPT_ID,
};

const DISPLAY: Record<DarkestQuestId, string> = {
  "quest:p016": "Shuffling Horror",
  "quest:p017": "Templars",
  "quest:p018": "Mammoth Cyst",
};

function buildDarkestMidBossScript(questId: DarkestQuestId): BossScriptDefinition {
  const encounter = readDarkestBossEncounter(questId)!;
  const primary = encounter.actors[0]!;
  const actions =
    primary.actionsPerRound === "special" ? undefined : primary.actionsPerRound;
  const id = SCRIPT_BY_QUEST[questId];
  if (primary.actionsPerRound === "special")
    throw new Error(`最暗中途 Boss 脚本不应为 Special 行动数：${questId}`);
  return {
    id,
    displayName: DISPLAY[questId],
    questIds: [questId],
    rules: DEFAULT_BOSS_BATTLE_RULES,
    notes:
      "A-4 中途最暗 Boss：身份与先攻/行动数来自 darkest_boss_content；技能/召唤/几何 combatReady: false。",
    combatEntry: {
      descriptionAbilityCardId: primary.abilityCardId,
      combatAbilityCardId: primary.abilityCardId,
      combatMonsterCardId: primary.cardId,
      printedInitiativeCards: encounter.actors.reduce(
        (sum, actor) => sum + actor.initiativeCards,
        0,
      ),
      printedActionsPerRound: primary.actionsPerRound,
    },
    hooks: {
      threatPassiveDungeon: () => ({
        status: "stub",
        message: `${DISPLAY[questId]}：最暗任务 Boss 无村庄威胁被动`,
        hold: "R35",
      }),
      threatPassiveHamlet: () => ({
        status: "stub",
        message: `${DISPLAY[questId]}：最暗任务 Boss 无 hamlet 威胁被动`,
        hold: "R35",
      }),
      faceTheThreatEmbark: () => ({
        status: "stub",
        message: `${questId} 为定额最暗任务，非 Face the Threat`,
        hold: "quest→Boss 映射",
      }),
      bossSlotPlacement: () => ({
        status: "stub",
        message: `${DISPLAY[questId]}：目标房专属房间几何 hold`,
        hold: "R-048 / Room Tile",
      }),
      monsterTurnActionCount: () =>
        actions === undefined
          ? {
              status: "stub",
              message: `${DISPLAY[questId]} 行动数为 Special 或多主体，待 encounter 接线`,
              hold: "R39–41",
            }
          : { status: "ok", value: actions },
      summon: () => ({
        status: "stub",
        message: `${DISPLAY[questId]} 召唤/传送/Pit Toss 未接`,
        hold: "R39–41 / darkest_boss_abilities",
      }),
    },
  };
}

const SCRIPTS = (["quest:p016", "quest:p017", "quest:p018"] as const).map((questId) =>
  buildDarkestMidBossScript(questId),
);

export function darkestMidBossScriptIdForQuest(questId: string): BossScriptId | undefined {
  return SCRIPT_BY_QUEST[questId as DarkestQuestId];
}

export function readDarkestMidBossRequiredCombatCardIds(questId: string): readonly string[] {
  const encounter = readDarkestBossEncounter(questId);
  return encounter?.actors.map((actor) => actor.cardId) ?? [];
}

export function ensureDarkestMidBossScriptsRegistered(): void {
  for (const script of SCRIPTS) {
    if (!getBossScript(script.id)) registerBossScript(script);
  }
}
