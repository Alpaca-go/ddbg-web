import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossOneBodyMorphOk,
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
  FleshOneBodyPart,
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

/** One Body 共享 Life 池（引擎 id）。 */
export const FLESH_I_ONE_BODY_POOL_ID = "flesh-i-one-body-pool" as const;

/** 四部位顺序；开战缺位时按 `fleshOneBodyPartStance` 补全姿态轨。 */
export const FLESH_I_ONE_BODY_PART_ORDER = ["head", "bone", "heart", "butt"] as const;

const PART_CARD_IDS: Record<FleshOneBodyPart, string> = {
  head: FLESH_I_HEAD_MONSTER_CARD_ID,
  bone: FLESH_I_BONE_MONSTER_CARD_ID,
  heart: FLESH_I_HEART_MONSTER_CARD_ID,
  butt: FLESH_I_BUTT_MONSTER_CARD_ID,
};

/** 开战姿态：Head→进攻、Bone→防御、Heart→远程、Butt→支援（待 Kyries 对照 Boss Abilities p16 核实）。 */
export function fleshOneBodyPartStance(
  part: FleshOneBodyPart,
): "aggressive" | "defensive" | "ranged" | "support" {
  switch (part) {
    case "head":
      return "aggressive";
    case "bone":
      return "defensive";
    case "heart":
      return "ranged";
    case "butt":
      return "support";
  }
}

export function fleshOneBodyPartCardId(part: FleshOneBodyPart): string {
  return PART_CARD_IDS[part];
}

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

const oneBodyPartSummon = (part: FleshOneBodyPart): BossSummonOk => ({
  status: "ok",
  value: {
    summonMonsterCardId: fleshOneBodyPartCardId(part),
    miniaturePlacement: "stanceArea",
    fixedStance: fleshOneBodyPartStance(part),
    oneBodyPart: part,
    rulesRef: ["R38", "spec:§14.5", FLESH_I_COMBAT_ABILITY_CARD_ID],
  },
});

export const fleshIBossScript: BossScriptDefinition = {
  id: FLESH_I_SCRIPT_ID,
  displayName: "The Flesh I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 4（四部位各 1 行动 / Round: 4）；One Body 开战四部位 + 共享 Life 已接最小运行时；morph 随机表 hold。",
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
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      if (ctx.purpose === "battleStartOneBodyPart" && ctx.oneBodyPart) {
        return oneBodyPartSummon(ctx.oneBodyPart);
      }
      return {
        status: "stub",
        message: "The Flesh I：技能召唤 / 中途 Large 未接",
        hold: "R31 / Big Troubles 战斗中途 Large",
      };
    },
    oneBodyMorph: (): BossOneBodyMorphOk => ({
      status: "ok",
      effect: "randomPartCardPerStanceEachRoundStart",
      sourceAbilityCardId: FLESH_I_COMBAT_ABILITY_CARD_ID,
      rulesRef: ["R38", "spec:§14.5", FLESH_I_COMBAT_ABILITY_CARD_ID],
    }),
  },
};

export function ensureFleshIBossScriptRegistered(): void {
  if (getBossScript(FLESH_I_SCRIPT_ID)) return;
  registerBossScript(fleshIBossScript);
}
