import { expect, it } from "vitest";
import {
  applyPatrolTheWoodsRoundOneInitiative,
  patrolTheWoodsInitiativeTriggered,
} from "./patrol-the-woods-initiative";
import type { GameState } from "../../command";

const state = (light: number, questId = "quest:weald:p005"): GameState =>
  ({
    seed: 1,
    notes: [],
    dungeon: {
      questDistribution: { questId },
      explorationSetup: { light, dungeonLevel: 1, provisions: [] },
    },
  }) as unknown as GameState;

it("R-242：d10 严格大于光照时首轮怪物先攻置顶", () => {
  expect(patrolTheWoodsInitiativeTriggered(state(5), 5)).toBe(false);
  expect(patrolTheWoodsInitiativeTriggered(state(5), 6)).toBe(true);
  expect(patrolTheWoodsInitiativeTriggered(state(0), 1)).toBe(true);
  const deck = ["hero", "monster", "hero", "monster"] as const;
  expect(applyPatrolTheWoodsRoundOneInitiative([...deck], true)).toEqual([
    "monster",
    "monster",
    "hero",
    "hero",
  ]);
  expect(applyPatrolTheWoodsRoundOneInitiative([...deck], false)).toEqual([...deck]);
});

it("非 p005 任务不触发", () => {
  expect(patrolTheWoodsInitiativeTriggered(state(5, "quest:p001"), 10)).toBe(false);
});
