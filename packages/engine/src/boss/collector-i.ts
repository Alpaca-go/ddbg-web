import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const COLLECTOR_I_SCRIPT_ID = "boss:ruins:collector:1" as const;

/** Boss Description，`boss_ability:p013` 正面（等级 I / Collector）。 */
export const COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p013" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面，`boss_ability:p016`（PDF p16）。
 * 地牢侧「Taken Away I」、村庄侧「Missing Artefacts I」。
 */
export const COLLECTOR_I_COMBAT_ABILITY_CARD_ID = "boss_ability:p016" as const;

/** Collector I 战斗卡（Eldritch · Human · Front · `monster_medium` PDF p92）。 */
export const COLLECTOR_I_COMBAT_MONSTER_CARD_ID = "monster_medium:p092" as const;

/** Collect All I 召唤物（不进 `combatEntry`；完整 AI / 区域放置仍 hold）。 */
export const COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID = "monster_medium:p098" as const;
export const COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID = "monster_medium:p095" as const;
export const COLLECTOR_I_COLLECTED_VESTAL_CARD_ID = "monster_medium:p101" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "skipCurioDrawInCurioRooms",
  sourceAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", COLLECTOR_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "nomadWagonBlocked",
  blockedBuildings: ["nomadWagon"],
  sourceAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", COLLECTOR_I_COMBAT_ABILITY_CARD_ID],
});

export const collectorIBossScript: BossScriptDefinition = {
  id: COLLECTOR_I_SCRIPT_ID,
  displayName: "Collector I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38/R39：先攻 1、ACTIONS / Round: 1；Collect All 三 Collected 与宝箱房布置未接；Collected 卡不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: COLLECTOR_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: COLLECTOR_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
    summon: () => ({
      status: "stub",
      message:
        "Collector I：Collect All（Man-at-Arms / Highwayman / Vestal 区域放置 + 3 先攻洗入）未接",
      hold: "R38–R39 / Collector Room",
    }),
  },
};

export function ensureCollectorIBossScriptRegistered(): void {
  if (getBossScript(COLLECTOR_I_SCRIPT_ID)) return;
  registerBossScript(collectorIBossScript);
}
