import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import type { BossScriptDefinition } from "./types";

export const NECROMANCER_II_SCRIPT_ID = "boss:ruins:necromancer:2" as const;
export const NECROMANCER_II_COMBAT_MONSTER_CARD_ID = "monster_medium:p090" as const;
export const NECROMANCER_II_SUMMON_MONSTER_CARD_ID = "monster_medium:p001" as const;
/** p002 为 II 级描述/威胁面；p005 为战斗面。 */
export const NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID = "boss_ability:p002" as const;
export const NECROMANCER_II_COMBAT_ABILITY_CARD_ID = "boss_ability:p005" as const;

/** C-019：II 战斗与两项威胁被动已接；正式 Boss 房间由 deployNecromancerII 接 R-166。 */
export const necromancerIIBossScript: BossScriptDefinition = {
  id: NECROMANCER_II_SCRIPT_ID,
  displayName: "Necromancer II",
  rules: DEFAULT_BOSS_BATTLE_RULES,
  notes:
    "三招、召唤 / 死亡清场与两项威胁已接；II 出征按 R-124 实际威胁匹配，正式房间见 R-166 生产入口。",
  combatEntry: {
    descriptionAbilityCardId: NECROMANCER_II_DESCRIPTION_ABILITY_CARD_ID,
    combatAbilityCardId: NECROMANCER_II_COMBAT_ABILITY_CARD_ID,
    combatMonsterCardId: NECROMANCER_II_COMBAT_MONSTER_CARD_ID,
    printedInitiativeCards: 1,
    printedActionsPerRound: 1,
  },
  hooks: {
    threatPassiveDungeon: () => ({
      status: "ok",
      effect: "firstBattleBoneCaptain",
      monsterCardId: "monster_large:p001",
      sourceAbilityCardId: NECROMANCER_II_COMBAT_ABILITY_CARD_ID,
      rulesRef: ["R11", "R16–17", "boss_ability:p005"],
    }),
    threatPassiveHamlet: () => ({
      status: "ok",
      effect: "firstDayGraveyardGuard",
      sourceAbilityCardId: NECROMANCER_II_COMBAT_ABILITY_CARD_ID,
      rulesRef: ["R11", "R33", "R-125", "boss_ability:p005"],
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

/** 幂等注册；正式迫近威胁可通过 p002 解析。 */
export function ensureNecromancerIIBossScriptRegistered(): void {
  if (!getBossScript(NECROMANCER_II_SCRIPT_ID)) registerBossScript(necromancerIIBossScript);
}
