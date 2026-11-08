import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../data/src/normalize/write";
import { resolveMonsterAttackEffects } from "../hero-skill";
import { readMonsterAttackView } from "../monster-skill";
import { stygianBossCritApplies } from "./stygian-boss-crit";

const data = loadNormalizedCorebox();
const card = data.monster_medium.cards.find((entry) => entry.id === "monster_medium:p001");
if (!card) throw new Error("缺少测试怪物卡");

it("R-036 / R37：只有 Stygian 的 Boss 卡吃 +1 Crit", () => {
  for (const id of [
    "monster_medium:p089",
    "monster_large:p005",
    "monster_medium:p092",
    "monster_large:p008",
    "monster_large:p014",
    "monster_large:p015",
    "monster_large:p016",
    "monster_large:p017",
    "monster_medium:p104",
    "monster_medium:p105",
    "monster_large:p018",
    "monster_large:p019",
    "monster_large:p020",
  ])
    expect(stygianBossCritApplies("stygian", id), id).toBe(true);
  for (const id of ["monster_medium:p106", "monster_medium:p109", "monster_large:p011"])
    expect(stygianBossCritApplies("stygian", id), id).toBe(false);
  expect(stygianBossCritApplies("standard", "monster_medium:p089")).toBe(false);
  expect(stygianBossCritApplies("radiant", "monster_medium:p089")).toBe(false);
});

it("+1 Crit 把同一骰面从命中推成暴击", () => {
  const attack = readMonsterAttackView(card as never, 1);
  if (attack.status !== "ready") throw new Error(attack.reason);
  const combat = {
    actor: { id: "m", wounds: 0 },
    target: {
      id: "h",
      side: "hero" as const,
      wounds: 0,
      stress: 0,
      dodge: 0,
      statusStacks: [],
    },
    areaDistance: 1,
    light: 5,
    targetAreaLower: false,
    guardedHeroOmitted: false,
    untargetedHeroesBesideTarget: [],
  };
  expect(resolveMonsterAttackEffects(attack.view, combat, 2).resolution.outcome).toBe("hit");
  expect(
    resolveMonsterAttackEffects(attack.view, { ...combat, stygianBossCrit: true }, 2).resolution
      .outcome,
  ).toBe("crit");
});
