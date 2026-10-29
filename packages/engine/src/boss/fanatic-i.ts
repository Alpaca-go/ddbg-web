import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type {
  BossScriptDefinition,
  BossThreatPassiveDungeonOk,
  BossThreatPassiveHamletOk,
} from "./types";

/** 引擎脚本 id；与印刷卡 id 分离。 */
export const FANATIC_I_SCRIPT_ID = "boss:ruins:fanatic:1" as const;

/** Boss Description，`boss_ability:p019` 正面（等级 I / Fanatic）。 */
export const FANATIC_I_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p019" as const;

/**
 * Boss Abilities 战斗面 + 威胁面背面，`boss_ability:p022`（PDF p22）。
 * 地牢侧「Marked for Death」、村庄侧「The Black Sheep」。
 */
export const FANATIC_I_COMBAT_ABILITY_CARD_ID = "boss_ability:p022" as const;

/** Fanatic I 战斗卡（Human · Front · Large · `monster_large` PDF p8）。 */
export const FANATIC_I_COMBAT_MONSTER_CARD_ID = "monster_large:p008" as const;

/** Pyre I（远程姿态开局；不进 `combatEntry`；Sentence Rendered / 先攻洗入仍 hold）。 */
export const FANATIC_I_PYRE_MONSTER_CARD_ID = "monster_large:p011" as const;

const dungeonThreatPassive = (): BossThreatPassiveDungeonOk => ({
  status: "ok",
  effect: "markOnBattleStartLowestD10",
  markTurns: 2,
  sourceAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R-048", FANATIC_I_COMBAT_ABILITY_CARD_ID],
});

const hamletThreatPassive = (): BossThreatPassiveHamletOk => ({
  status: "ok",
  effect: "blackSheepBeforeHamletEvent",
  stressDelta: 4,
  sourceAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
  rulesRef: ["R11", "R32", FANATIC_I_COMBAT_ABILITY_CARD_ID],
});

export const fanaticIBossScript: BossScriptDefinition = {
  id: FANATIC_I_SCRIPT_ID,
  displayName: "Fanatic I",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "R38–R39：先攻 4（Fanatic 3 + Pyre 1）、ACTIONS / Round: 3；Pyre 远程 + Sentence Rendered / Pit Toss 未接；Pyre 卡不进 combatEntry。",
  combatEntry: {
    descriptionAbilityCardId: FANATIC_I_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: FANATIC_I_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: FANATIC_I_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 4,
    printedActionsPerRound: 3,
  },
  hooks: {
    threatPassiveDungeon: dungeonThreatPassive,
    threatPassiveHamlet: hamletThreatPassive,
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
    summon: () => ({
      status: "stub",
      message: "Fanatic I：Pyre 远程姿态开局 + Sentence Rendered 位移 / 丢入 Pyre 区域未接",
      hold: "R38–R39 / Fanatic Room",
    }),
  },
};

export function ensureFanaticIBossScriptRegistered(): void {
  if (getBossScript(FANATIC_I_SCRIPT_ID)) return;
  registerBossScript(fanaticIBossScript);
}
