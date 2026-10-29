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

/**
 * Pelagic I（High Tide 召唤；不进 `combatEntry`）。
 * Cove `monster_medium` extract 入库前用占位 id。
 */
export const SIREN_I_PELAGIC_MONSTER_CARD_ID = "monster_medium:cove:pelagic:p001" as const;

/**
 * Siren I · High Tide 技能 slot。
 * Cove Boss Abilities p10 / extract 入库前由常量 + 测试夹具对齐。
 */
export const SIREN_I_HIGH_TIDE_SKILL_SLOT = 2 as const;

/** High Tide 召唤 Pelagic 的怪物姿态；待 Kyries 对照卡面 / medium extract。 */
export function sirenIPelagicHighTideStance(): "support" {
  return "support";
}

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
    "R38：先攻 2；High Tide → Pelagic 最小 summon 运行时已接；Song of Desire 魅惑 / 完整 AI 仍 hold。",
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
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      const highTide =
        ctx.purpose === "highTidePelagic" ||
        (ctx.purpose === "skill" && ctx.skillSlot === SIREN_I_HIGH_TIDE_SKILL_SLOT);
      if (highTide) {
        return {
          status: "ok",
          value: {
            summonMonsterCardId: SIREN_I_PELAGIC_MONSTER_CARD_ID,
            miniaturePlacement: "targetArea",
            fixedStance: sirenIPelagicHighTideStance(),
            rulesRef: ["R31", "R-034", "R38", SIREN_I_COMBAT_ABILITY_CARD_ID],
          },
        };
      }
      return {
        status: "stub",
        message: "Siren I：非 High Tide 技能召唤与 Song of Desire 未接",
        hold: "R38–R39 / Siren 魅惑 + 其它召唤",
      };
    },
  },
};

export function ensureSirenIBossScriptRegistered(): void {
  if (getBossScript(SIREN_I_SCRIPT_ID)) return;
  registerBossScript(sirenIBossScript);
}
