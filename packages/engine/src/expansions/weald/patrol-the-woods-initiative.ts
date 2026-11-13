import type { SkillTargetSide } from "../../hero-skill";
import type { GameState } from "../../command";
import { createRng } from "../../rng";

/** R-242：Patrol the Woods 首轮怪物先攻置顶（仅第 1 轮；打平不触发）。 */
export function patrolTheWoodsInitiativeTriggered(gameState: GameState, roll: number): boolean {
  if (gameState.dungeon?.questDistribution?.questId !== "quest:weald:p005") return false;
  const light = gameState.dungeon.explorationSetup?.light;
  if (typeof light !== "number" || !Number.isInteger(light)) return false;
  return roll > light;
}

export function rollPatrolTheWoodsBattleStartD10(
  seed: number,
  cursor: number,
): {
  readonly roll: number;
  readonly cursor: number;
} {
  const rng = createRng(seed);
  for (let i = 0; i < cursor; i++) rng.next();
  return { roll: Math.floor(rng.next() * 10) + 1, cursor: cursor + 1 };
}

/** 洗牌后将所有怪物侧先攻移到牌堆顶，英雄侧保持相对顺序在后。 */
export function applyPatrolTheWoodsRoundOneInitiative(
  deck: readonly SkillTargetSide[],
  triggered: boolean,
): SkillTargetSide[] {
  if (!triggered) return [...deck];
  const monsters = deck.filter((side) => side === "monster");
  const heroes = deck.filter((side) => side === "hero");
  return [...monsters, ...heroes];
}
