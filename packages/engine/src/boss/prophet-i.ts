import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossCalamitousPrognosticationOk,
  BossRubbleOfRuinOk,
  BossScriptDefinition,
  BossSummonOk,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
  ProphetWoodenPewIndex,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const PROPHET_I_SCRIPT_ID = "boss:ruins:prophet:1" as const;

/** Boss Description，`boss_ability:p007` 正面（等级 I / Prophet）。 */
export const PROPHET_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p007" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面，`boss_ability:p010`。
 * 地牢侧「Visions of a Torturous End」、村庄侧「Visions of Past Deeds」均在此卡背面（extract 核实）。
 */
export const PROPHET_I_COMBAT_ABILITY_CARD_ID = "boss_ability:p010" as const;

/** Prophet I 战斗卡，`monster_large:p005`（normalized：Unholy · Front · Large）。 */
export const PROPHET_I_COMBAT_MONSTER_CARD_ID = "monster_large:p005" as const;

/**
 * Wooden Pew 为 Prophet Room 卡面代币（非 normalized 怪物 deck 卡）。
 * 引擎 summon 声明用 id；运行时写入 `battle.woodenPews` 区域标记。
 */
export const PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID = "room:p011:wooden_pew" as const;

/** Prophet Room 房间卡 id（`room.json` · d10 标记来源）。 */
export const PROPHET_ROOM_CARD_ID = "room:p011" as const;

/**
 * `room:p011` 上 `{icon:096ea91bb9}` 标记的印刷数字/范围（顺序同 normalized `printedLines`）。
 * 区域与标记几何对应仍 hold（R-048）；运行时依赖 `prophetRoomD10AreaTable` 绑定。
 */
export const PROPHET_ROOM_D10_MARKERS = ["4", "3", "1-2", "6", "5", "7-8", "10", "9"] as const;

export type ProphetRoomD10Marker = (typeof PROPHET_ROOM_D10_MARKERS)[number];

export function prophetD10RollMatchesMarker(roll: number, marker: string): boolean {
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) return false;
  if (marker.includes("-")) {
    const [lowRaw, highRaw] = marker.split("-");
    const low = Number(lowRaw);
    const high = Number(highRaw);
    if (!Number.isInteger(low) || !Number.isInteger(high)) return false;
    return roll >= low && roll <= high;
  }
  const exact = Number(marker);
  return Number.isInteger(exact) && roll === exact;
}

/** 返回首个匹配的 room 卡 d10 标记；无匹配时 null（不猜落点）。 */
export function prophetRoomMarkerForD10Roll(roll: number): ProphetRoomD10Marker | null {
  for (const marker of PROPHET_ROOM_D10_MARKERS) {
    if (prophetD10RollMatchesMarker(roll, marker)) return marker;
  }
  return null;
}

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "stressOnDungeonEntryPerHero",
  stressDelta: 2,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "spec:§2.3", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "tavernStressRecoveryDelta",
  recoveryDelta: -1,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

const woodenPewSummon = (pewIndex: ProphetWoodenPewIndex): BossSummonOk => ({
  status: "ok",
  value: {
    summonMonsterCardId: PROPHET_I_WOODEN_PEW_SUMMON_TOKEN_ID,
    miniaturePlacement: "areaD10Marker",
    woodenPewIndex: pewIndex,
    rulesRef: ["R38", "R39", "spec:§14.5", "R-034", PROPHET_I_COMBAT_ABILITY_CARD_ID],
  },
});

const calamitousHook = (): BossCalamitousPrognosticationOk => ({
  status: "ok",
  effect: "rollFourD10PlaceWoodenPewsOnFirstActionEachRound",
  pewCount: 4,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R38", "R39", "spec:§14.5", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

const rubbleHook = (): BossRubbleOfRuinOk => ({
  status: "ok",
  effect: "useRubbleSkillOnThirdActionEachRound",
  skillSlot: 3,
  sourceAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R38", "R39", "spec:§14.5", "boss_ability:p010", PROPHET_I_COMBAT_ABILITY_CARD_ID],
});

/** 战斗卡 `monster_large:p005` · slot 3（Rubble of Ruin · Special）。 */
export const PROPHET_I_RUBBLE_SKILL_SLOT = 3 as const;

export const prophetIBossScript: BossScriptDefinition = {
  id: PROPHET_I_SCRIPT_ID,
  displayName: "Prophet I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "C-013 / R38：开战与 Calamitous 前校验完整 d10→区域绑定；缺表拒绝，不退回普通选招。Prophet Room 生产几何仍 hold；先攻 / 第 2 行动 / Rubble 沿用原范围。",
  combatEntry: {
    descriptionAbilityCardId: PROPHET_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: PROPHET_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: PROPHET_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 3,
    printedActionsPerRound: 3,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
    summon: (ctx): BossSummonOk | { status: "stub"; message: string; hold?: string } => {
      if (ctx.purpose === "calamitousWoodenPew" && ctx.woodenPewIndex !== undefined) {
        return woodenPewSummon(ctx.woodenPewIndex);
      }
      return {
        status: "stub",
        message: "Prophet I：怪物技能召唤未接",
        hold: "Prophet 怪物技能 / R38–R39",
      };
    },
    calamitousPrognostication: calamitousHook,
    rubbleOfRuin: rubbleHook,
  },
};

export function ensureProphetIBossScriptRegistered(): void {
  if (getBossScript(PROPHET_I_SCRIPT_ID)) return;
  registerBossScript(prophetIBossScript);
}
