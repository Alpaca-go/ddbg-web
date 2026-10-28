import { getBossScript, registerBossScript } from "./registry";
import { ensureProphetIBossScriptRegistered } from "./prophet-i";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import type {
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const NECROMANCER_I_SCRIPT_ID = "boss:ruins:necromancer:1" as const;

/** Boss Description，`boss_ability:p001` 正面（等级 I / Necromancer）。 */
export const NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p001" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面，`boss_ability:p004`。
 * 地牢侧「Unsettling Silhouettes」、村庄侧「Graveyard is blocked」均在此卡背面（extract 核实）。
 */
export const NECROMANCER_I_COMBAT_ABILITY_CARD_ID = "boss_ability:p004" as const;

/** Necromancer I 战斗卡，`monster_medium:p089`（normalized：Eldritch · Unholy · Front）。 */
export const NECROMANCER_I_COMBAT_MONSTER_CARD_ID = "monster_medium:p089" as const;

/** R38：Boss 等级 I 时召唤 Bone Rabble（`monster_medium:p040`）。 */
export const NECROMANCER_I_SUMMON_MONSTER_CARD_ID = "monster_medium:p040" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "afterBattleRemoveNonUnholyMonstersPermanently",
  sourceAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", NECROMANCER_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "graveyardBlocked",
  blockedBuildings: ["graveyard"],
  sourceAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", NECROMANCER_I_COMBAT_ABILITY_CARD_ID],
});

export const necromancerIBossScript: BossScriptDefinition = {
  id: NECROMANCER_I_SCRIPT_ID,
  displayName: "Necromancer I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38：先攻 1；召唤按 Boss 等级 Bone Rabble/Soldier/Spearman；Necromancer 死亡后移除其他怪物（encounter 未接）。",
  combatEntry: {
    descriptionAbilityCardId: NECROMANCER_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: NECROMANCER_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: (ctx) => ({
      status: "stub",
      message: `Necromancer I：Face the Threat / 定威胁进幕 quest=${ctx.questId} 未接线`,
      hold: "quest→Boss 映射待确认 / 归任务卡",
    }),
    bossSlotPlacement: (ctx) => ({
      status: "stub",
      message: `Necromancer I：Boss 位 layout=${ctx.layoutId} slots=${ctx.bossSlotNodeIds.length}`,
      hold: "R-121 / 归任务卡",
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
    summon: (): BossSummonOk => ({
      status: "ok",
      value: {
        summonMonsterCardId: NECROMANCER_I_SUMMON_MONSTER_CARD_ID,
        miniaturePlacement: "targetArea",
        rulesRef: ["R31", "R-034", "R38", NECROMANCER_I_COMBAT_ABILITY_CARD_ID],
      },
    }),
  },
};

export function ensureNecromancerIBossScriptRegistered(): void {
  if (getBossScript(NECROMANCER_I_SCRIPT_ID)) return;
  registerBossScript(necromancerIBossScript);
}

/** 注册当前已核实的第一批核心盒 Boss 脚本（Necromancer I、Prophet I）。 */
export function ensureCoreBossScriptsRegistered(): void {
  ensureNecromancerIBossScriptRegistered();
  ensureProphetIBossScriptRegistered();
}
