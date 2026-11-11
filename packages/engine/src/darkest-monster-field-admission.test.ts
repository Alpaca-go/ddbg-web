import { expect, it } from "vitest";
import mediumFile from "../../data/normalized/corebox/monster_medium.json";
import poolFile from "../../data/normalized/corebox/darkest_monster_pool.json";
import { normalizedMonsterMediumFileSchema } from "../../data/src/normalize/schema";
import { hasApprovedHigherMonsterFields } from "../../data/src/normalize/verified-monster-entry";
import { selectMonsterSkill } from "./monster-stance";

const cards = normalizedMonsterMediumFileSchema.parse(mediumFile).cards;
const stances = ["aggressive", "defensive", "ranged", "support"] as const;

// R-143 / R-214逐卡黄金值：每个字符串按d10 1..10列出技能；x表示印刷不可选。
const cases = [
  ["063", 2, ["1111111111", "1111111111", "2222222222", "2222222222"]],
  ["066", 2, ["1112222333", "1112222333", "1112222333", "1112222333"]],
  ["069", 3, ["1111112222", "1111112222", "1111112222", "1111112222"]],
  ["072", 2, ["1111112222", "1111112222", "1111112222", "1111112222"]],
  ["075", 1, ["1111122222", "1111122222", "1111122222", "1111122222"]],
  ["078", 3, ["1111133333", "1111133333", "1111133333", "2222222222"]],
  ["080", 3, ["2222222222", "1111133333", "1111133333", "1111133333"]],
  ["083", 2, ["1111111111", "1111111111", "1111111111", "1111111111"]],
  ["086", 2, ["1112223333", "1112223333", "1112223333", "1112223333"]],
] as const;

it.each(cases)("R-143 p%s：四姿态十骰面及限定字段审批", (page, speed, expected) => {
  const card = cards.find((c) => c.id === `monster_medium:p${page}`)!;
  if (!("skills" in card)) throw new Error("缺少普通怪物技能卡");
  const before = structuredClone(card);
  const fields = {
    id: card.id,
    name: card.name,
    level: card.level,
    pages: card.pages,
    speed: card.speed!,
    stanceGroups: card.stanceGroups!,
  };
  const selectionCard = {
    verification: card.verification,
    skills: card.skills,
    stanceGroups: card.stanceGroups!,
  };
  expect(card.speed).toBe(speed);
  expect(hasApprovedHigherMonsterFields(fields)).toBe(true);
  expect(hasApprovedHigherMonsterFields({ ...fields, speed: speed + 1 })).toBe(false);
  expect(hasApprovedHigherMonsterFields({ ...fields, pages: [999] })).toBe(false);
  for (const [index, stance] of stances.entries()) {
    const faces = expected[index]!;
    const first = selectMonsterSkill(selectionCard, [stance]);
    expect(first.status).toBe(
      faces[0] === "x" ? "refused" : new Set(faces).size === 1 ? "selected" : "needsRoll",
    );
    for (let roll = 1; roll <= 10; roll++) {
      const result = selectMonsterSkill(selectionCard, [stance], roll);
      if (faces[roll - 1] === "x") expect(result.status).toBe("refused");
      else
        expect(result).toEqual({
          status: "selected",
          skillSlot: Number(faces[roll - 1]),
          roll: new Set(faces).size === 1 ? null : roll,
        });
    }
  }
  expect(card).toEqual(before);
  const pool = poolFile.cards.find((c) => c.combatCardId === card.id)!;
  expect(pool.missingBattleFields).toEqual([]);
  expect(pool.battleReady).toBe(false);
});
