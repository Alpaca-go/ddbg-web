import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type { BossScriptDefinition } from "./types";

export const NECROMANCER_II_SCRIPT_ID = "boss:ruins:necromancer:2" as const;
export const NECROMANCER_II_COMBAT_MONSTER_CARD_ID = "monster_medium:p090" as const;
export const NECROMANCER_II_SUMMON_MONSTER_CARD_ID = "monster_medium:p001" as const;

/** C-019 首切片：R38 战斗；p005 两项威胁仍显式停点，不自动注册到正式迫近池。 */
export const necromancerIIBossScript: BossScriptDefinition = {
  id: NECROMANCER_II_SCRIPT_ID,
  displayName: "Necromancer II",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes: "三招与 Bone Soldier 召唤 / 死亡清场可测；II 映射与两项威胁被动未接，不开放正式战役。",
  combatEntry: {
    descriptionAbilityCardId: "boss_ability:p002",
    combatAbilityCardId: "boss_ability:p005",
    combatMonsterCardId: NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: () => ({
      status: "stub",
      message: "Army of the Dead：地牢首次战斗首位生成 Bone Captain，运行时未接（p005）",
      hold: "C-019 / boss_ability:p005",
    }),
    threatPassiveHamlet: () => ({
      status: "stub",
      message: "Haunted Graveyard：首日最低 d10 英雄去墓地守卫，运行时未接（p005）",
      hold: "C-019 / boss_ability:p005",
    }),
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
    summon: () => ({
      status: "ok",
      value: {
        summonMonsterCardId: NECROMANCER_II_SUMMON_MONSTER_CARD_ID,
        miniaturePlacement: "targetArea",
        rulesRef: ["R31", "R38", "R-034", "boss_ability:p005"],
      },
    }),
  },
};

/** 仅显式战斗场景注册；两项被动与映射收齐后才加入 ensureCoreBossScriptsRegistered。 */
export function ensureNecromancerIIBossScriptRegistered(): void {
  if (!getBossScript(NECROMANCER_II_SCRIPT_ID)) registerBossScript(necromancerIIBossScript);
}
