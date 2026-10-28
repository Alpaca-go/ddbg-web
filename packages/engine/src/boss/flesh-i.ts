import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const FLESH_I_SCRIPT_ID = "boss:warrens:flesh:1" as const;

/**
 * Boss Description I（风味面）。
 * Warrens `DD_EN_WARRENS_CARDS_70_120_Boss_Abilities` 正面 p13；extract 占位 id。
 */
export const FLESH_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:warrens:flesh:p001" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面 I（PDF 正面 p16 / 背面 p16）。
 * 地牢侧「Big Troubles I」、村庄侧「Creeping Sickness I」。
 */
export const FLESH_I_COMBAT_ABILITY_CARD_ID = "boss_ability:warrens:flesh:p002" as const;

/**
 * Flesh 战代表卡（One Body；`combatEntry` 仅挂主引用）。
 * 四部位战斗卡不进 `combatEntry`（见部位 id 常量）。
 */
export const FLESH_I_COMBAT_MONSTER_CARD_ID = "monster_medium:warrens:flesh_head:p001" as const;

export const FLESH_I_HEAD_MONSTER_CARD_ID = "monster_medium:warrens:flesh_head:p001" as const;
export const FLESH_I_BONE_MONSTER_CARD_ID = "monster_medium:warrens:flesh_bone:p001" as const;
export const FLESH_I_HEART_MONSTER_CARD_ID = "monster_medium:warrens:flesh_heart:p001" as const;
export const FLESH_I_BUTT_MONSTER_CARD_ID = "monster_medium:warrens:flesh_butt:p001" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "guardOnLargeMonsterSpawn",
  guardTurns: 2,
  sourceAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", FLESH_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "creepingSicknessBuildingWounds",
  woundsPerUnvisitedBuilding: 1,
  sourceAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", FLESH_I_COMBAT_ABILITY_CARD_ID],
});

export const fleshIBossScript: BossScriptDefinition = {
  id: FLESH_I_SCRIPT_ID,
  displayName: "The Flesh I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 4（四部位各 1 行动 / Round: 4）；One Body 位移与 morph 未接；四部位卡不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: FLESH_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: FLESH_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 4,
    printedActionsPerRound: 4,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
    summon: () => ({
      status: "stub",
      message: "The Flesh I：One Body 部位 morph / 位移未接",
      hold: "R38–R39 / The Flesh 四部位",
    }),
  },
};

export function ensureFleshIBossScriptRegistered(): void {
  if (getBossScript(FLESH_I_SCRIPT_ID)) return;
  registerBossScript(fleshIBossScript);
}
