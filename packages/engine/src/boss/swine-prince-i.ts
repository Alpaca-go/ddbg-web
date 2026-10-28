import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const SWINE_PRINCE_I_SCRIPT_ID = "boss:warrens:swine_prince:1" as const;

/**
 * Boss Description I（风味面）。
 * Warrens `DD_EN_WARRENS_CARDS_70_120_Boss_Abilities` 正面 p7；extract 占位 id。
 */
export const SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID =
  "boss_ability:warrens:swine_prince:p001" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面 I（PDF 正面 p10 / 背面 p10）。
 * 地牢侧「Uneasy Times I」、村庄侧「Bestial Rage」。
 */
export const SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID =
  "boss_ability:warrens:swine_prince:p002" as const;

/**
 * Swine Prince I 战斗卡（Beast · Large · 84 Life · Warrens）。
 * Warrens `monster_large` PDF p5。
 */
export const SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID =
  "monster_large:warrens:swine_prince:p001" as const;

/** Wilbur I（Beast · Small）；Boss 战伴，不进 `combatEntry`。Warrens medium PDF p20。 */
export const SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID =
  "monster_medium:warrens:wilbur:p001" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "beastMonsterDamageBonus",
  damageDelta: 2,
  sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "survivalistBlocked",
  blockedBuildings: ["survivalist"],
  sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID],
});

export const swinePrinceIBossScript: BossScriptDefinition = {
  id: SWINE_PRINCE_I_SCRIPT_ID,
  displayName: "Swine Prince I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 2；Enraged Destruction / Wilbur（medium p20）双单位与 Mark AI 未接；Wilbur 能力卡不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: SWINE_PRINCE_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: SWINE_PRINCE_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 2,
    printedActionsPerRound: 2,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: (ctx) => ({
      status: "stub",
      message: `Swine Prince I：Face the Threat / 定威胁进幕 quest=${ctx.questId} 未接线`,
      hold: "quest→Boss 映射待确认 / Warrens 任务卡",
    }),
    bossSlotPlacement: (ctx) => ({
      status: "stub",
      message: `Swine Prince I：Boss 位 layout=${ctx.layoutId} slots=${ctx.bossSlotNodeIds.length}`,
      hold: "R-121 / 归任务卡",
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: () => ({
      status: "stub",
      message: "Swine Prince I：Wilbur 伴战布置与 Enraged Destruction 未接",
      hold: "R38–R39 / Swine Prince + Wilbur",
    }),
  },
};

export function ensureSwinePrinceIBossScriptRegistered(): void {
  if (getBossScript(SWINE_PRINCE_I_SCRIPT_ID)) return;
  registerBossScript(swinePrinceIBossScript);
}
