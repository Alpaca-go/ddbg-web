import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossCollectAllOk,
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
  CollectorCollectedPart,
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

/** Collect All I 召唤物（不进 `combatEntry`；先攻洗入 / 最近区域挤占仍 hold）。 */
export const COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID = "monster_medium:p098" as const;
export const COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID = "monster_medium:p095" as const;
export const COLLECTOR_I_COLLECTED_VESTAL_CARD_ID = "monster_medium:p101" as const;

/** Collect All 召唤顺序（boss_ability:p016 / spec §14.5 R39）。 */
export const COLLECTOR_I_COLLECT_ALL_PART_ORDER = [
  "manAtArms",
  "highwayman",
  "vestal",
] as const satisfies readonly CollectorCollectedPart[];

const PART_CARD_IDS: Record<CollectorCollectedPart, string> = {
  manAtArms: COLLECTOR_I_COLLECTED_MAN_AT_ARMS_CARD_ID,
  highwayman: COLLECTOR_I_COLLECTED_HIGHWAYMAN_CARD_ID,
  vestal: COLLECTOR_I_COLLECTED_VESTAL_CARD_ID,
};

/** Collect All：Man-at-Arms→防御、Highwayman→远程、Vestal→支援（boss_ability:p016 图标 + 卡文）。 */
export function collectorCollectedPartStance(
  part: CollectorCollectedPart,
): "aggressive" | "defensive" | "ranged" | "support" {
  switch (part) {
    case "manAtArms":
      return "defensive";
    case "highwayman":
      return "ranged";
    case "vestal":
      return "support";
  }
}

export function collectorCollectedPartCardId(part: CollectorCollectedPart): string {
  return PART_CARD_IDS[part];
}

export function collectorCollectedCardIds(): readonly string[] {
  return COLLECTOR_I_COLLECT_ALL_PART_ORDER.map((part) => collectorCollectedPartCardId(part));
}

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

const collectAllPartSummon = (part: CollectorCollectedPart): BossSummonOk => ({
  status: "ok",
  value: {
    summonMonsterCardId: collectorCollectedPartCardId(part),
    miniaturePlacement: "stanceArea",
    fixedStance: collectorCollectedPartStance(part),
    collectedPart: part,
    rulesRef: ["R39", "spec:§14.5", "R-034", COLLECTOR_I_COMBAT_ABILITY_CARD_ID],
  },
});

const collectAllHook = (): BossCollectAllOk => ({
  status: "ok",
  effect: "summonThreeCollectedIfNoneInPlayAtTurnStart",
  sourceAbilityCardId: COLLECTOR_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R39", "spec:§14.5", COLLECTOR_I_COMBAT_ABILITY_CARD_ID],
});

export const collectorIBossScript: BossScriptDefinition = {
  id: COLLECTOR_I_SCRIPT_ID,
  displayName: "Collector I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38/R39：先攻 1、ACTIONS / Round: 1；Collect All 三 Collected + 姿态区域已接最小运行时；宝箱房 / 先攻洗入 / 最近区域挤占仍 hold。",
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
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      if (ctx.purpose === "collectAllPart" && ctx.collectedPart) {
        return collectAllPartSummon(ctx.collectedPart);
      }
      return {
        status: "stub",
        message: "Collector I：怪物技能召唤未接",
        hold: "Collector 怪物技能 / R31",
      };
    },
    collectAll: collectAllHook,
  },
};

export function ensureCollectorIBossScriptRegistered(): void {
  if (getBossScript(COLLECTOR_I_SCRIPT_ID)) return;
  registerBossScript(collectorIBossScript);
}
