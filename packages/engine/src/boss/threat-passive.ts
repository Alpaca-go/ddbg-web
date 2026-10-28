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
  return passive.blockedBuildings;
}
