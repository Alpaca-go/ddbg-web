import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossIntoThePotOk,
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

/**
 * Cauldron Full I（Large · 2 格）；Into the Pot! 后 Empty→Full 切换，不进 `combatEntry`。
 * TTS/CE 54213（待 Weald `monster_large` extract 页序核实）；占位 id。
 */
export const HAG_I_CAULDRON_FULL_MONSTER_CARD_ID =
  "monster_large:weald:cauldron_full:p001" as const;

/**
 * Hag I 战斗卡 · Into the Pot! 技能 slot。
 * Weald `monster_large` extract / PDF p10 页序待 Kyries 核实前，运行时与单测均用本常量。
 */
export const HAG_I_INTO_THE_POT_SKILL_SLOT = 1 as const;

/** 每轮 Hag 首次行动在 `hagActionsThisRound` 上的索引（0-based，行动前）。 */
export const HAG_I_FIRST_ACTION_INDEX = 0 as const;

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

const intoThePotHook = (): BossIntoThePotOk => ({
  status: "ok",
  effect: "forceIntoThePotWhileCauldronEmptyOnFirstActionEachRound",
  skillSlot: HAG_I_INTO_THE_POT_SKILL_SLOT,
  sourceAbilityCardId: HAG_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R39", "spec:§14.5", HAG_I_COMBAT_ABILITY_CARD_ID],
});

export const hagIBossScript: BossScriptDefinition = {
  id: HAG_I_SCRIPT_ID,
  displayName: "Hag I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38/R39：先攻 2（ACTIONS / Round: 2）；Cauldron Empty 开战 + Into the Pot! / Empty→Full 最小运行时已接；42418 / 先攻洗入 / 锅完整生命周期仍 hold。",
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
      if (ctx.purpose === "cauldronFullMorph") {
        return {
          status: "ok",
          value: {
            summonMonsterCardId: HAG_I_CAULDRON_FULL_MONSTER_CARD_ID,
            miniaturePlacement: "stanceArea",
            fixedStance: hagICauldronBattleStartStance(),
            rulesRef: ["R39", "spec:§14.5", HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID],
          },
        };
      }
      return {
        status: "stub",
        message: "Hag I：Cauldron 能力卡 42418 / 技能召唤 / 先攻洗入未接",
        hold: "R38–R39 / Hag 锅完整生命周期",
      };
    },
    intoThePot: intoThePotHook,
  },
};

export function ensureHagIBossScriptRegistered(): void {
  if (getBossScript(HAG_I_SCRIPT_ID)) return;
  registerBossScript(hagIBossScript);
}
