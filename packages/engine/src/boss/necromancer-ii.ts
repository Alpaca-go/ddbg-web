import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type { BossScriptDefinition } from "./types";

export const NECROMANCER_II_SCRIPT_ID = "boss:ruins:necromancer:2" as const;
export const NECROMANCER_II_COMBAT_MONSTER_CARD_ID = "monster_medium:p090" as const;
export const NECROMANCER_II_SUMMON_MONSTER_CARD_ID = "monster_medium:p001" as const;

/** C-019：战斗与 Army 已接；Haunted Graveyard 仍停点，不自动注册到正式迫近池。 */
export const necromancerIIBossScript: BossScriptDefinition = {
  id: NECROMANCER_II_SCRIPT_ID,
  displayName: "Necromancer II",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "三招、Bone Soldier 召唤 / 死亡清场与 Army of the Dead 已接；Haunted Graveyard 未完成，正式池仍停点。",
  combatEntry: {
    descriptionAbilityCardId: "boss_ability:p002",
    combatAbilityCardId: "boss_ability:p005",
    combatMonsterCardId: NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: () => ({
      status: "ok",
      effect: "firstBattleBoneCaptain",
      monsterCardId: "monster_large:p001",
      sourceAbilityCardId: "boss_ability:p005",
      rulesRef: ["R11", "R16–17", "boss_ability:p005"],
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

/** 仅显式场景注册；Haunted Graveyard 收齐后才加入 ensureCoreBossScriptsRegistered。 */
export function ensureNecromancerIIBossScriptRegistered(): void {
  if (!getBossScript(NECROMANCER_II_SCRIPT_ID)) registerBossScript(necromancerIIBossScript);
}
