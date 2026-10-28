import type { BossBattleRules } from "./types";

/**
 * 普通遭遇战第 4 轮结束被迫撤退（encounter.ts）。
 * Boss 战 `countsRounds: false` 时返回 null，表示无轮数上限（规则书 §14、R-044）。
 * 主路径 encounter 尚未读取 Boss 规则；本 helper 供后续 PR 接入。
 */
export function encounterRoundRetreatLimit(
  rules: BossBattleRules | null | undefined,
): number | null {
  if (rules && rules.countsRounds === false) return null;
  return 4;
}

export const DEFAULT_BOSS_BATTLE_RULES: BossBattleRules = {
  countsRounds: false,
  allowsRetreat: false,
  campaignFailOnPartyWipe: true,
};
