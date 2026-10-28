import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const SIREN_I_SCRIPT_ID = "boss:cove:siren:1" as const;

/**
 * Boss Description I（风味面）。
 * Cove `DD_EN_COVE_CARDS_70_120_Boss_Abilities` 正面 p7；extract 占位 id。
 */
export const SIREN_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:cove:siren:p001" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面 I（PDF 正面 p10 / 背面 p10）。
 * 地牢侧「Distressing Times I」、村庄侧「Captivating Call I」。
 */
export const SIREN_I_COMBAT_ABILITY_CARD_ID = "boss_ability:cove:siren:p002" as const;

/**
 * Siren I 战斗卡（Eldritch · Large · Cove）。
 * Cove `monster_large` PDF p5。
 */
export const SIREN_I_COMBAT_MONSTER_CARD_ID = "monster_large:cove:siren:p001" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "eldritchMonsterDamageBonus",
  damageDelta: 2,
  sourceAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", SIREN_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "abbeyBlocked",
  blockedBuildings: ["abbey"],
  sourceAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", SIREN_I_COMBAT_ABILITY_CARD_ID],
});

export const sirenIBossScript: BossScriptDefinition = {
  id: SIREN_I_SCRIPT_ID,
  displayName: "Siren I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 2；Song of Desire / High Tide 召唤与魅惑完整 AI 未接；Pelagic 召唤物不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: SIREN_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: SIREN_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: SIREN_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 2,
    printedActionsPerRound: 2,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: () => ({
      status: "stub",
      message: "Siren I：High Tide 召唤 Pelagic 与 Song of Desire 未接",
      hold: "R38–R39 / Siren 魅惑 + 召唤",
    }),
  },
};

export function ensureSirenIBossScriptRegistered(): void {
  if (getBossScript(SIREN_I_SCRIPT_ID)) return;
  registerBossScript(sirenIBossScript);
}
