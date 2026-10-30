import { getBossScript, registerBossScript } from "./registry";
import { DEFAULT_BOSS_BATTLE_RULES } from "./rules";
import { defaultBossSlotPlacementHook, defaultFaceTheThreatEmbarkHook } from "./default-boss-hooks";
import { RUINS_COMBAT_LEVELS } from "./ruins-combat-levels";
import { collectorCollectedPartStance } from "./collector-i";
import type { BossScriptDefinition, HigherRuinsThreat } from "./types";

type Kind = HigherRuinsThreat["kind"];
const threat = (kind: Kind, amount: number, source: string): HigherRuinsThreat => ({
  status: "ok",
  effect: "ruinsHigherThreat",
  kind,
  amount,
  sourceAbilityCardId: source,
  rulesRef: ["R11", "R32–35", source],
});

export const higherRuinsBossScripts: readonly BossScriptDefinition[] = [
  ...RUINS_COMBAT_LEVELS.prophet.slice(1).map((row, index): BossScriptDefinition => ({
    id: row.script,
    displayName: `Prophet ${index === 0 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: row.description,
      combatAbilityCardId: row.ability,
      combatMonsterCardId: row.card,
      printedInitiativeCards: 3,
      printedActionsPerRound: 3,
    },
    hooks: {
      faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
      bossSlotPlacement: defaultBossSlotPlacementHook,
      threatPassiveDungeon: () =>
        threat(index === 0 ? "scoutStress" : "unholySpawnStress", 1, row.ability),
      threatPassiveHamlet: () => ({
        status: "ok",
        effect: "tavernStressRecoveryDelta",
        recoveryDelta: index === 0 ? -2 : -3,
        sourceAbilityCardId: row.ability,
        rulesRef: ["R33", row.ability],
      }),
      monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
      calamitousPrognostication: () => ({
        status: "ok",
        effect: "rollFourD10PlaceWoodenPewsOnFirstActionEachRound",
        pewCount: 4,
        sourceAbilityCardId: row.ability,
        rulesRef: ["R38–39", row.ability],
      }),
      rubbleOfRuin: () => ({
        status: "ok",
        effect: "useRubbleSkillOnThirdActionEachRound",
        skillSlot: 3,
        sourceAbilityCardId: row.ability,
        rulesRef: ["R38–39", row.ability],
      }),
      summon: (ctx) =>
        ctx.purpose === "calamitousWoodenPew" && ctx.woodenPewIndex !== undefined
          ? {
              status: "ok",
              value: {
                summonMonsterCardId: "room:p011:wooden_pew",
                woodenPewIndex: ctx.woodenPewIndex,
                miniaturePlacement: "areaD10Marker",
                rulesRef: ["R38–39", row.ability],
              },
            }
          : { status: "notApplicable", message: "先知技能不召唤怪物", rulesRef: [row.ability] },
    },
  })),
  ...RUINS_COMBAT_LEVELS.collector.slice(1).map((row, index): BossScriptDefinition => ({
    id: row.script,
    displayName: `Collector ${index === 0 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: row.description,
      combatAbilityCardId: row.ability,
      combatMonsterCardId: row.card,
      printedInitiativeCards: 1,
      printedActionsPerRound: 1,
    },
    hooks: {
      faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
      bossSlotPlacement: defaultBossSlotPlacementHook,
      threatPassiveDungeon: () =>
        threat(index === 0 ? "curioTheft" : "campFour", index === 0 ? 5 : 4, row.ability),
      threatPassiveHamlet: () =>
        threat(index === 0 ? "hamletGoldTheft" : "hamletTrinketTheft", 1, row.ability),
      monsterTurnActionCount: () => ({ status: "ok", value: 1 }),
      collectAll: () => ({
        status: "ok",
        effect: "summonThreeCollectedIfNoneInPlayAtTurnStart",
        sourceAbilityCardId: row.ability,
        rulesRef: ["R39", row.ability],
      }),
      summon: (ctx) =>
        ctx.purpose === "collectAllPart" && ctx.collectedPart
          ? {
              status: "ok",
              value: {
                summonMonsterCardId: row.collected[ctx.collectedPart],
                collectedPart: ctx.collectedPart,
                fixedStance: collectorCollectedPartStance(ctx.collectedPart),
                miniaturePlacement: "stanceArea",
                rulesRef: ["R39", row.ability],
              },
            }
          : { status: "notApplicable", message: "仅 Collect All 召唤", rulesRef: [row.ability] },
    },
  })),
  ...RUINS_COMBAT_LEVELS.fanatic.slice(1).map((row, index): BossScriptDefinition => ({
    id: row.script,
    displayName: `Fanatic ${index === 0 ? "II" : "III"}`,
    rules: DEFAULT_BOSS_BATTLE_RULES,
    combatEntry: {
      descriptionAbilityCardId: row.description,
      combatAbilityCardId: row.ability,
      combatMonsterCardId: row.card,
      printedInitiativeCards: 4,
      printedActionsPerRound: 3,
    },
    hooks: {
      faceTheThreatEmbark: defaultFaceTheThreatEmbarkHook,
      bossSlotPlacement: defaultBossSlotPlacementHook,
      threatPassiveDungeon: () => threat("battleMarkAll", index === 0 ? 3 : 2, row.ability),
      threatPassiveHamlet: () =>
        threat(index === 0 ? "hamletSkillDebuff" : "lynchMob", index === 0 ? 4 : 2, row.ability),
      monsterTurnActionCount: () => ({ status: "ok", value: 3 }),
      sentenceRendered: () => ({
        status: "ok",
        effect: "moveTowardClosestHeroOrTossIntoPyreArea",
        sourceAbilityCardId: row.ability,
        rulesRef: ["R39", row.ability],
      }),
      pitToss: () => ({
        status: "ok",
        effect: "tossReachHeroIntoPyreArea",
        sourceAbilityCardId: row.ability,
        rulesRef: ["R39", row.ability],
      }),
      summon: (ctx) =>
        ctx.purpose === "battleStartPyre"
          ? {
              status: "ok",
              value: {
                summonMonsterCardId: row.pyre,
                fixedStance: "ranged",
                miniaturePlacement: "stanceArea",
                rulesRef: ["R39", row.ability],
              },
            }
          : { status: "notApplicable", message: "狂信者三招无召唤", rulesRef: [row.ability] },
    },
  })),
];

export function ensureHigherRuinsBossScriptsRegistered(): void {
  for (const script of higherRuinsBossScripts)
    if (!getBossScript(script.id)) registerBossScript(script);
}
