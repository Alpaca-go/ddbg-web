import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { ruinsMonsterPool } from "../monster-pool";

it("2026-10-12先批五条再批四条修正版，全部九条入库且42实例保留", () => {
  const data = loadNormalizedCorebox();
  for (const [id, speed] of [
    ["monster_medium:p027", 2],
    ["monster_medium:p031", 1],
    ["monster_medium:p043", 3],
    ["monster_medium:p046", 2],
    ["monster_large:p002", 1],
  ] as const) {
    const card = [...data.monster_medium.cards, ...data.monster_large.cards].find(
      (c) => c.id === id,
    )!;
    expect("skills" in card).toBe(true);
    if (!("skills" in card)) throw new Error(id);
    expect(card.speed, id).toBe(speed);
    expect(card.stanceGroups, id).toBeDefined();
    expect(data.monster_pool.cards.find((c) => c.combatCardId === id)!.missingBattleFields).toEqual(
      [],
    );
  }
  for (const [id, speed] of [
    ["monster_medium:p018", 2],
    ["monster_medium:p024", 1],
    ["monster_medium:p034", 2],
    ["monster_medium:p037", 1],
  ] as const) {
    const card = data.monster_medium.cards.find((c) => c.id === id)!;
    if (!("skills" in card)) throw new Error(id);
    expect(card.speed, id).toBe(speed);
    expect(card.stanceGroups, id).toBeDefined();
    expect(data.monster_pool.cards.find((c) => c.combatCardId === id)!.missingBattleFields).toEqual(
      [],
    );
  }
  expect(ruinsMonsterPool(data.monster_pool.cards, 1)).toHaveLength(42);
  expect(
    data.monster_pool.cards.filter((c) => c.level === 1 && !c.missingBattleFields.length),
  ).toHaveLength(15);
});
it("Madman两技能和独立效果行保留，不把转录修复当作完整战斗效果批准", () => {
  const card = loadNormalizedCorebox().monster_medium.cards.find(
    (c) => c.id === "monster_medium:p043",
  )!;
  if (!("skills" in card)) throw new Error("Madman");
  expect(card.skills.map((s) => [s.slot, s.name])).toEqual([
    [1, "Doomsay"],
    [2, "Accusation"],
  ]);
  const text = (slot: number) =>
    card.skills
      .find((s) => s.slot === slot)!
      .effect_lines.map((l) =>
        l.map((s) => (s.type === "text" ? s.text : `{${s.icon.key}}`)).join(""),
      )
      .join(" ");
  expect(text(1)).toContain("+1");
  expect(text(1)).not.toContain("+2");
  expect(text(2)).toContain("+2");
  expect(card.skills[0]!.verified_target_stress).toBeUndefined();
});
