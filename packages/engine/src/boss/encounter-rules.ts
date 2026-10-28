import type { GameState } from "../command";
import { readBossCombatEntry } from "./combat-entry";
import { ensureCoreBossScriptsRegistered } from "./necromancer-i";
import { getBossScript } from "./registry";
import { encounterRoundRetreatLimit } from "./rules";
import { isBossQuestId, resolveBossScriptIdForQuest } from "./quest-bridge";
import type { BossBattleRules } from "./types";

function deployedMonsterCardIds(state: GameState): readonly string[] {
  const fromBattle = state.battle?.entities
    .filter((entity) => entity.side === "monster" && entity.monsterCardId)
    .map((entity) => entity.monsterCardId!);
  if (fromBattle?.length) return fromBattle;
  const d = state.dungeon;
  const active = d?.monsterPool?.active;
  if (active && active.roomId === d?.position) return active.monsters.map((spawn) => spawn.cardId);
  return [];
}

/**
 * 本场战斗是否按 Boss 规则处理轮数上限（规则书 §14、R-044）。
 *
 * 判定：当前任务为 Boss 任务（R-120）且 `bossQuestScriptId` 已映射到已注册脚本，
 * 且部署怪物含该脚本的 `combatMonsterCardId`。
 * Boss 任务但未映射脚本 / 非 Boss 怪物遭遇：仍走普通第 4 轮撤退（quest→Boss 映射待 Kyries）。
 */
export function resolveEncounterBossBattleRules(state: GameState): BossBattleRules | undefined {
  ensureCoreBossScriptsRegistered();
  const questId = state.dungeon?.questDistribution?.questId;
  if (!questId || !isBossQuestId(questId)) return undefined;
  const scriptId = resolveBossScriptIdForQuest(questId, state.dungeon);
  if (!scriptId) return undefined;
  const script = getBossScript(scriptId);
  const bossCardId = readBossCombatEntry(script)?.combatMonsterCardId;
  if (!script || !bossCardId) return undefined;
  const deployed = deployedMonsterCardIds(state);
  if (!deployed.includes(bossCardId)) return undefined;
  return script.rules;
}

/** 与 `encounter.ts` 轮末分支共用：达到上限则被迫撤退。 */
export function encounterForcesRetreatAfterRound(state: GameState, round: number): boolean {
  const limit = encounterRoundRetreatLimit(resolveEncounterBossBattleRules(state));
  return limit !== null && round >= limit;
}

export function isBossEncounter(state: GameState): boolean {
  return resolveEncounterBossBattleRules(state) !== undefined;
}
