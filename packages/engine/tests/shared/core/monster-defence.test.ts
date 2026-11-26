import { expect, it } from "vitest";

import { loadNormalizedCorebox } from "../../../../data/src/core/write";
import {
  monsterShuffleImmune,
  monsterShuffleResist,
  monsterStatusImmunities,
  monsterStatusResistances,
} from "../../../src/shared/core/monster-defence";
import type { MonsterDefenceCard } from "../../../src/shared/core/monster-defence";

const data = loadNormalizedCorebox();

function card(id: string): MonsterDefenceCard {
  const found = [...data.monster_medium.cards, ...data.monster_large.cards].find(
    (entry) => entry.id === id,
  );
  if (!found) throw new Error(`缺少 ${id}`);
  return found as MonsterDefenceCard;
}

it("A2 单元 8：怪物抗性 / 免疫优先读 rules，不再数图标", () => {
  const soldier = card("monster_medium:p001");
  expect(monsterStatusImmunities(soldier)).toEqual(["bleed"]);
  // 把图标清空，规则仍给出同样的免疫；旧读法会变成空数组。
  expect(monsterStatusImmunities({ ...soldier, immunities: [] })).toEqual(["bleed"]);

  const defender = card("monster_medium:p010");
  expect(monsterShuffleResist(defender)).toBe(true);
  expect(monsterShuffleResist({ ...defender, resistances: [] })).toBe(true);
  expect(monsterShuffleImmune(defender)).toBe(false);

  const adder = card("monster_large:p004");
  expect(monsterShuffleImmune(adder)).toBe(true);
  expect(monsterStatusResistances(adder)).toEqual(["stun"]);
});

it("A2 单元 8：未注解视图仍回退到已确认图标", () => {
  const soldier = card("monster_medium:p001");
  expect(monsterStatusImmunities({ ...soldier, rules: undefined })).toEqual(["bleed"]);
});
