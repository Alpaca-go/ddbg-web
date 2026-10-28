import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const HAG_I_SCRIPT_ID = "boss:weald:hag:1" as const;

/**
 * Boss Description I（风味面）。
 * Weald extract 占位 id；TTS/CE 物理卡 42412（待 `extract/extension/weald` Boss PDF 入库后对齐页序）。
 */
export const HAG_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:weald:hag:p001" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面 I。
 * 地牢侧「Painfully Soothing I」、村庄侧「No Rest for the Wicked I」；TTS/CE 42415。
 */
export const HAG_I_COMBAT_ABILITY_CARD_ID = "boss_ability:weald:hag:p002" as const;

/**
 * Hag I 战斗卡（Human · Large · Weald）。
 * Weald `monster_large` PDF p10；TTS/CE 54209。
 */
export const HAG_I_COMBAT_MONSTER_CARD_ID = "monster_large:weald:hag:p001" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "stressOnHeroProvisionUse",
  stressDelta: 1,
  sourceAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", HAG_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "sanitariumHealLifeDelta",
  healDelta: -3,
  sourceAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", HAG_I_COMBAT_ABILITY_CARD_ID],
});

export const hagIBossScript: BossScriptDefinition = {
  id: HAG_I_SCRIPT_ID,
  displayName: "Hag I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38/R39：先攻 2（ACTIONS / Round: 2）；Cauldron（42418）与 Into the Pot! / 锅生命周期未接；单独 Cauldron 能力卡不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: HAG_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: HAG_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 2,
    printedActionsPerRound: 2,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: (ctx) => ({
      status: "stub",
      message: `Hag I：Face the Threat / 定威胁进幕 quest=${ctx.questId} 未接线`,
      hold: "quest→Boss 映射待确认 / Weald 任务卡",
    }),
    bossSlotPlacement: (ctx) => ({
      status: "stub",
      message: `Hag I：Boss 位 layout=${ctx.layoutId} slots=${ctx.bossSlotNodeIds.length}`,
      hold: "R-121 / 归任务卡",
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: () => ({
      status: "stub",
      message: "Hag I：Cauldron Empty/Full、Into the Pot! 未接",
      hold: "R38–R39 / Hag + Cauldron 双单位",
    }),
  },
};

export function ensureHagIBossScriptRegistered(): void {
  if (getBossScript(HAG_I_SCRIPT_ID)) return;
  registerBossScript(hagIBossScript);
}
