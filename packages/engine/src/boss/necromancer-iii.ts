import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type { BossScriptDefinition } from "./types";

export const NECROMANCER_III_SCRIPT_ID = "boss:ruins:necromancer:3" as const;
export const NECROMANCER_III_COMBAT_MONSTER_CARD_ID = "monster_medium:p091" as const;
export const NECROMANCER_III_SUMMON_MONSTER_CARD_ID = "monster_medium:p013" as const;

/** R38 / 当前版 FRONT p091：三招、复活与墓地守卫；正式房间仍归 R-121。 */
export const necromancerIIIBossScript: BossScriptDefinition = {
  id: NECROMANCER_III_SCRIPT_ID,
  displayName: "Necromancer III",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes: "三招、Bone Spearman、Reanimation 与首日墓地守卫已接；正式房间仍 hold。",
  combatEntry: {
    descriptionAbilityCardId: "boss_ability:p003",
    combatAbilityCardId: "boss_ability:p006",
    combatMonsterCardId: NECROMANCER_III_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
    bossSlotPlacement: defaultBossSlotPlacementHook,
    threatPassiveDungeon: () => ({
      status: "ok",
      effect: "ruinsHigherThreat",
      kind: "reanimation",
      amount: 1,
      sourceAbilityCardId: "boss_ability:p006",
      rulesRef: ["R11", "R31", "boss_ability:p006"],
    }),
    threatPassiveHamlet: () => ({
      status: "ok",
      effect: "firstDayGraveyardGuard",
      sourceAbilityCardId: "boss_ability:p006",
      rulesRef: ["R33", "R-125", "boss_ability:p006"],
    }),
    monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
    summon: () => ({
      status: "ok",
      value: {
        summonMonsterCardId: NECROMANCER_III_SUMMON_MONSTER_CARD_ID,
        miniaturePlacement: "targetArea",
        rulesRef: ["R31", "R38", "R-034", "boss_ability:p006"],
      },
    }),
  },
};

export function ensureNecromancerIIIBossScriptRegistered(): void {
  if (!getBossScript(NECROMANCER_III_SCRIPT_ID)) registerBossScript(necromancerIIIBossScript);
}
