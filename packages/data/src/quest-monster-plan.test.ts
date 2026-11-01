import { expect, it } from "vitest";
import cards from "../normalized/corebox/quest_cards.json";
import { questCardsSchema } from "./quest-cards";
import { readQuestMonsterPlan } from "./quest-monster-plan";

const file = questCardsSchema.parse(cards);
it("读取跨级指定怪物和任务属性加成，保留卡面未指定等级及战斗停点", () => {
  expect(readQuestMonsterPlan(file, "quest:p009")).toMatchObject({
    monsterName: "Bone Bearer",
    printedMonsterLevel: 3,
    lifeBonus: 0,
    dodgeBonus: 0,
    source: { page: 9 },
    combatReady: true,
  });
  expect(readQuestMonsterPlan(file, "quest:p013")).toMatchObject({
    monsterName: "Bone Captain",
    printedMonsterLevel: null,
    lifeBonus: 20,
    dodgeBonus: 2,
    source: { page: 13 },
    combatReady: true,
  });
  expect(readQuestMonsterPlan(file, "quest:p005")).toBeUndefined();
  expect(readQuestMonsterPlan(file, "quest:p999")).toBeUndefined();
});
it("正文与SPECIAL同步漂移也拒绝，查询不会更改目录", () => {
  const before = structuredClone(file);
  const plan = readQuestMonsterPlan(file, "quest:p013")!;
  (plan.source as { page: number }).page = 1;
  expect(readQuestMonsterPlan(file, "quest:p013")!.source.page).toBe(13);
  expect(file).toEqual(before);
  const bad = structuredClone(file);
  const card = bad.cards[12]!;
  card.printedLines = card.printedLines.map((line) => line.replace("+20 Life", "+30 Life"));
  card.specialRuleLines = card.specialRuleLines.map((line) => line.replace("+20 Life", "+30 Life"));
  expect(() => readQuestMonsterPlan(bad, card.id)).toThrow("生成计划不符");
});
