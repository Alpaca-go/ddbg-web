import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossScriptDefinition,
  BossSummonOk,
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

/**
 * Cauldron Empty I（Large · 2 格）；Boss 战伴，不进 `combatEntry`。
 * TTS/CE 54212；Weald `monster_large` extract 入库前用占位 id。
 */
export const HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID =
  "monster_large:weald:cauldron_empty:p001" as const;

/** 开战 Cauldron 姿态（Large 占 2 格）；待 Kyries 对照 54212 / Boss Abilities 42415。 */
export function hagICauldronBattleStartStance(): "aggressive" {
  return "aggressive";
}

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
    "R38/R39：先攻 2（ACTIONS / Round: 2）；Cauldron Empty 开战 summon 最小运行时已接；Into the Pot! / Full 切换 / 42418 能力卡仍 hold。",
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
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      if (ctx.purpose === "battleStartCauldron") {
        return {
          status: "ok",
          value: {
            summonMonsterCardId: HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID,
            miniaturePlacement: "stanceArea",
            fixedStance: hagICauldronBattleStartStance(),
            rulesRef: ["R39", "spec:§14.5", "R-034", HAG_I_COMBAT_ABILITY_CARD_ID],
          },
        };
      }
      return {
        status: "stub",
        message: "Hag I：Into the Pot! / Cauldron Full 与技能召唤未接",
        hold: "R38–R39 / Hag 锅生命周期",
      };
    },
  },
};

export function ensureHagIBossScriptRegistered(): void {
  if (getBossScript(HAG_I_SCRIPT_ID)) return;
  registerBossScript(hagIBossScript);
}
