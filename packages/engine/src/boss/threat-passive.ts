import { runBossHook } from "./hooks";
import type { BossScriptDefinition, BossScriptId, BossThreatPassiveHamletResult } from "./types";

/** 战斗后需永久移出游戏的怪物卡（地牢侧威胁）；不含 Unholy 类型标签的卡。 */
export function cardIdsPermanentlyRemovedAfterBattle(
  script: BossScriptDefinition,
  battleMonsterCards: readonly { readonly cardId: string; readonly typeTags: readonly string[] }[],
): readonly string[] {
  const passive = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  if (
    passive.status !== "ok" ||
    passive.effect !== "afterBattleRemoveNonUnholyMonstersPermanently"
  ) {
    return [];
  }
  return battleMonsterCards
    .filter((m) => !m.typeTags.some((tag) => tag.toLowerCase() === "unholy"))
    .map((m) => m.cardId);
}

/** 进地牢时每名英雄额外承受的压力（地牢侧威胁）；未接线 encounter 时供调用方合并。 */
export function stressOnDungeonEntryPerHeroFromBossThreat(
  script: BossScriptDefinition,
): number {
  const passive = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  if (passive.status !== "ok" || passive.effect !== "stressOnDungeonEntryPerHero") return 0;
  return passive.stressDelta;
}

/** 村庄侧威胁被动：追加封锁建筑（不含看守人 weekBlockedBuildings）。运行时未接 campaign 威胁层时供调用方合并。 */
export function hamletBuildingsBlockedByBossThreat(
  scriptId: BossScriptId,
  script: BossScriptDefinition | undefined,
): readonly string[] {
  if (!script || script.id !== scriptId) return [];
  const passive = runBossHook(script, "threatPassiveHamlet", {
    scriptId: script.id,
    side: "hamlet",
  }) as BossThreatPassiveHamletResult;
  if (passive.status !== "ok") return [];
  if (passive.effect === "graveyardBlocked" || passive.effect === "survivalistBlocked") {
    return passive.blockedBuildings;
  }
  return [];
}

/** Beast 类型怪物伤害修正（地牢侧威胁）；未接线 encounter 时供调用方合并。 */
export function beastMonsterDamageBonusFromBossThreat(script: BossScriptDefinition): number {
  const passive = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  if (passive.status !== "ok" || passive.effect !== "beastMonsterDamageBonus") return 0;
  return passive.damageDelta;
}

/** 酒馆减压服务有效恢复量修正（村庄侧威胁）；未接线 hamlet-actions 时供调用方合并。 */
export function tavernStressRecoveryDeltaFromBossThreat(
  script: BossScriptDefinition,
): number {
  const passive = runBossHook(script, "threatPassiveHamlet", {
    scriptId: script.id,
    side: "hamlet",
  }) as BossThreatPassiveHamletResult;
  if (passive.status !== "ok" || passive.effect !== "tavernStressRecoveryDelta") return 0;
  return passive.recoveryDelta;
}

/** 英雄使用补给（药瓶类）时的额外压力（地牢侧威胁）；运行时未接 provision 管线时供调用方合并。 */
export function stressOnHeroProvisionUseFromBossThreat(script: BossScriptDefinition): number {
  const passive = runBossHook(script, "threatPassiveDungeon", {
    scriptId: script.id,
    side: "dungeon",
  });
  if (passive.status !== "ok" || passive.effect !== "stressOnHeroProvisionUse") return 0;
  return passive.stressDelta;
}

/** 疗养院单次治疗 Life 修正（村庄侧威胁）；未接线 hamlet-actions 时供调用方合并。 */
export function sanitariumHealLifeDeltaFromBossThreat(script: BossScriptDefinition): number {
  const passive = runBossHook(script, "threatPassiveHamlet", {
    scriptId: script.id,
    side: "hamlet",
  }) as BossThreatPassiveHamletResult;
  if (passive.status !== "ok" || passive.effect !== "sanitariumHealLifeDelta") return 0;
  return passive.healDelta;
}
