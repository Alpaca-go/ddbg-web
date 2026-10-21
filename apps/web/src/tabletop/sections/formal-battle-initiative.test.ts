import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { EncounterState } from "@ddbg/engine";
import { expect, it } from "vitest";
import { FormalBattleInitiative } from "./formal-battle-initiative";

const render = (encounter?: EncounterState) =>
  renderToStaticMarkup(
    createElement(FormalBattleInitiative, {
      encounter,
      entityName: (id) => (id === "monster-1" ? "Bone Soldier" : "CRUSADER"),
    }),
  );

it("未开始时轮数和余牌保持未知，不从 mock 补数值", () => {
  const html = render();
  expect(html).toContain("<strong>—</strong> / 4 轮");
  expect(html).toContain("余牌 — 张");
  expect(html).not.toContain('aria-current="step"');
});

it("怪物回合显示真实怪物而非回退英雄，牌堆只显示剩余张数", () => {
  const html = render({
    round: 2,
    deck: ["hero", "monster", "hero"],
    actedIds: [],
    turn: { type: "monster", actorId: "monster-1" },
  });
  expect(html).toContain("Bone Soldier · 怪物回合");
  expect(html).not.toContain("CRUSADER");
  expect(html).toContain("余牌 3 张");
  expect(html).toContain('aria-label="怪物先攻"');
  expect(html).toContain('aria-current="step">2');
});

it("英雄行动数与战斗结束来自遭遇状态", () => {
  const encounter: EncounterState = {
    round: 4,
    deck: [],
    actedIds: [],
    turn: { type: "hero", actorId: "hero-0", actions: 1, usedSkillIds: [] },
  };
  expect(render(encounter)).toContain("CRUSADER · 剩余 1 行动");
  const finished = render({ ...encounter, turn: { type: "finished", outcome: "victory" } });
  expect(finished).toContain("本场战斗结束");
  expect(finished).not.toContain('aria-label="英雄先攻"');
});
