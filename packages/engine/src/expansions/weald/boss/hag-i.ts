import { getBossScript, registerBossScript } from "../../../boss/registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "../../../boss/rules";
import {
  defaultBossSlotPlacementHook,
  defaultFaceTheThreatEmbarkHook,
} from "../../../boss/default-boss-hooks";
import type {
  BossIntoThePotOk,
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "../../../boss/types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const HAG_I_SCRIPT_ID = "boss:weald:hag:1" as const;

/**
 * Boss Description I（风味面）。
 * R-254：官方 Weald Boss Abilities p13。
 */
export const HAG_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:weald:p013" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面 I。
 * R-254：官方 Boss Abilities p16；背面为地牢／村庄威胁。
 */
export const HAG_I_COMBAT_ABILITY_CARD_ID = "boss_ability:weald:p016" as const;

/** R-254：Cauldron 能力正反面，官方 Boss Abilities p19。 */
export const HAG_I_CAULDRON_ABILITY_CARD_ID = "boss_ability:weald:p019" as const;

/**
 * Hag I 战斗卡（Human · Large · Weald）。
 * R-254：官方 Weald monster_large PDF p10 正面。
 */
export const HAG_I_COMBAT_MONSTER_CARD_ID = "monster_large:weald:p010" as const;

/**
 * Cauldron Empty I（Large · 2 格）；Boss 战伴，不进 `combatEntry`。
 * R-254：官方 monster_large p13 正面。
 */
export const HAG_I_CAULDRON_EMPTY_MONSTER_CARD_ID = "monster_large:weald:p013" as const;

/**
 * Cauldron Full I（Large · 2 格）；Into the Pot! 后 Empty→Full 切换，不进 `combatEntry`。
 * R-254：同一 p13 组件背面的运行视图，不增加 raw 卡或 BattleEntity。
 */
export const HAG_I_CAULDRON_FULL_MONSTER_CARD_ID = "monster_large:weald:p013:back" as const;

/**
 * Hag I 战斗卡 · Into the Pot! 技能 slot。
 * R-254：官方 monster_large p10，技能 slot 1。
 */
export const HAG_I_INTO_THE_POT_SKILL_SLOT = 1 as const;

/** 每轮 Hag 首次行动在 `hagActionsThisRound` 上的索引（0-based，行动前）。 */
export const HAG_I_FIRST_ACTION_INDEX = 0 as const;

/** Weald 规则书 W4：空锅开战位于 Ranged（Large 占 2 格）。 */
export function hagICauldronBattleStartStance(): "ranged" {
  return "ranged";
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
    "R38/R39：先攻 2（ACTIONS / Round: 2）；Cauldron Empty 开战 + Into the Pot! / Empty→Full 最小运行时已接；boss_ability:weald:p019 / 先攻洗入 / 锅完整生命周期仍 hold。",
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
        message: "Hag I：Cauldron 能力卡 boss_ability:weald:p019 / 技能召唤 / 先攻洗入未接",
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
