import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossEnragedDestructionOk,
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
  BossWilburMarkOk,
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
export const SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID = "monster_medium:warrens:wilbur:p001" as const;

/**
 * Swine Prince I 战斗卡 · Enraged Destruction 技能 slot。
 * Warrens `monster_large` extract / PDF p5 页序待 Kyries 核实前，运行时与单测均用本常量。
 */
export const SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT = 3 as const;

/**
 * Wilbur I · End This One（Mark）技能 slot。
 * Warrens `monster_medium` extract / PDF p20 页序待 Kyries 核实前，运行时与单测均用本常量。
 */
export const SWINE_PRINCE_I_WILBUR_MARK_SKILL_SLOT = 1 as const;

/** 开战伴战姿态（Small · 1 格）；待 Kyries 对照 Boss Abilities p10 / medium p20。 */
export function swinePrinceIWilburBattleStartStance(): "support" {
  return "support";
}

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

const enragedDestructionHook = (): BossEnragedDestructionOk => ({
  status: "ok",
  effect: "princeUsesSkillWhenWilburDamaged",
  skillSlot: SWINE_PRINCE_I_ENRAGED_DESTRUCTION_SKILL_SLOT,
  targetPolicy: "offendingHero",
  sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R39", "spec:§14.5", SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID],
});

const wilburMarkHook = (): BossWilburMarkOk => ({
  status: "ok",
  effect: "forceMarkSkillWhilePrinceAlive",
  skillSlot: SWINE_PRINCE_I_WILBUR_MARK_SKILL_SLOT,
  sourceAbilityCardId: SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: [
    "R39",
    "spec:§14.5",
    SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID,
    SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
  ],
});

export const swinePrinceIBossScript: BossScriptDefinition = {
  id: SWINE_PRINCE_I_SCRIPT_ID,
  displayName: "Swine Prince I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 2、ACTIONS / Round: 2；Wilbur 开战伴战 + Enraged + Wilbur Mark 最小运行时已接；Wilbur 先攻洗入 / End These Two 仍 hold。",
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
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 2 }),
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      if (ctx.purpose === "battleStartWilbur") {
        return {
          status: "ok",
          value: {
            summonMonsterCardId: SWINE_PRINCE_I_WILBUR_MONSTER_CARD_ID,
            miniaturePlacement: "stanceArea",
            fixedStance: swinePrinceIWilburBattleStartStance(),
            rulesRef: ["R39", "spec:§14.5", "R-034", SWINE_PRINCE_I_COMBAT_ABILITY_CARD_ID],
          },
        };
      }
      return {
        status: "stub",
        message: "Swine Prince I：Wilbur 非 Mark 技能召唤未接",
        hold: "R38–R39 / Wilbur 其他技能",
      };
    },
    enragedDestruction: enragedDestructionHook,
    wilburMark: wilburMarkHook,
  },
};

export function ensureSwinePrinceIBossScriptRegistered(): void {
  if (getBossScript(SWINE_PRINCE_I_SCRIPT_ID)) return;
  registerBossScript(swinePrinceIBossScript);
}
