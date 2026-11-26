import { expect, it } from "vitest";

import { loadNormalizedCorebox } from "../../../../data/src/core/write";
import { readPrintedTargets } from "../../../src/core/heroes/hero-skill";
import type { HeroSkillCardView } from "../../../src/core/heroes/hero-skill";

const data = loadNormalizedCorebox();

function card(id: string): HeroSkillCardView {
  const found = data.hero_skill.cards.find((entry) => entry.id === id);
  if (!found) throw new Error(`缺少 ${id}`);
  return found as HeroSkillCardView;
}

it("A2 单元 3：Core 11 读 rules.targets，不再数 stats 目标图标", () => {
  const crusader = card("hero_skill:core:h01:p004");
  expect(crusader.rules?.targets).toEqual({ hero: 0, monster: 2, heroOrMonster: 0 });
  // 即使把 stats 行清空，规则仍给出两个目标；旧读法会变成 absent。
  expect(readPrintedTargets({ ...crusader, stats_line: [] })).toEqual({
    kind: "exact",
    max: 2,
  });

  const jester = card("hero_skill:core:h06:p121");
  expect(jester.rules?.targets).toEqual({ hero: 2, monster: 0, heroOrMonster: 0 });
  expect(readPrintedTargets({ ...jester, front_icons: [] })).toEqual({
    kind: "exact",
    max: 2,
  });
});

it("A2 单元 3：扩展英雄同样读 rules.targets", () => {
  const cove = card("hero_skill:cove:h12:p236");
  expect(cove.rules?.targets).toEqual({ hero: 0, monster: 1, heroOrMonster: 0 });
  expect(readPrintedTargets({ ...cove, stats_line: [], front_icons: [] })).toEqual({
    kind: "exact",
    max: 1,
  });
});
