import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const PROPHET_I_SCRIPT_ID = "boss:ruins:prophet:1" as const;

/** Boss Description，`boss_ability:p007` 正面（等级 I / Prophet）。 */
export const PROPHET_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p007" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面，`boss_ability:p010`。
 * 地牢侧「Visions of a Torturous End」、村庄侧「Visions of Past Deeds」均在此卡背面（extract 核实）。
 */
export const PROPHET_I_COMBAT_ABILITY_CARD_ID = "boss_ability:p010" as const;

/** Prophet I 战斗卡，`monster_large:p005`（normalized：Unholy · Front · Large）。 */
export const PROPHET_I_COMBAT_MONSTER_CARD_ID = "monster_large:p005" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "stressOnDungeonEntryPerHero",
  stressDelta: 2,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "tavernStressRecoveryDelta",
  recoveryDelta: -1,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

export const prophetIBossScript: BossScriptDefinition = {
  id: PROPHET_I_SCRIPT_ID,
  displayName: "Prophet I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 3；Calamitous Prognostication / Rubble of Ruin 与木长椅（Wooden Pew）完整 AI 未接；无怪物召唤。",
  combatEntry: {
    descriptionAbilityCardId: PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: PROPHET_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 3,
    printedActionsPerRound: 3,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: (ctx) => ({
      status: "stub",
      message: `Prophet I：Face the Threat / 定威胁进幕 quest=${ctx.questId} 未接线`,
      hold: "quest→Boss 映射待确认 / 归任务卡",
    }),
    bossSlotPlacement: (ctx) => ({
      status: "stub",
      message: `Prophet I：Boss 位 layout=${ctx.layoutId} slots=${ctx.bossSlotNodeIds.length}`,
      hold: "R-121 / 归任务卡",
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
    summon: () => ({
      status: "stub",
      message: "Prophet I：Wooden Pew / 区域 d10 放置未接",
      hold: "R38–R39 / Prophet Room",
    }),
  },
};

export function ensureProphetIBossScriptRegistered(): void {
  if (getBossScript(PROPHET_I_SCRIPT_ID)) return;
  registerBossScript(prophetIBossScript);
}
