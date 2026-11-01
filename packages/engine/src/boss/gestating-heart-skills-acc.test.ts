import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { GESTATING_HEART_MONSTER_CARD_ID } from "./gestating-heart-ichor";
import {
  readMonsterAttackView,
  resolveMonsterSkill,
  type MonsterCardView,
} from "../monster-skill";

function loadLargeCards(): MonsterCardView[] {
  const large = JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ) as { cards: MonsterCardView[] };
  return large.cards;
}

function gestatingHeartCard(): MonsterCardView {
  const card = loadLargeCards().find((entry) => entry.id === GESTATING_HEART_MONSTER_CARD_ID);
  expect(card).toBeDefined();
  return card!;
}

const minimalCombat = {
  actor: { id: "heart", wounds: 0, shuffleResist: true },
  target: {
    id: "h0",
    side: "hero" as const,
    wounds: 0,
    stress: 0,
    dodge: 0,
    stance: "aggressive" as const,
    markStacks: 0,
  },
  areaDistance: 2,
};

it("monster_large:p019 仅 slot 1 Dispersion，无 Acc/Crit/伤害/目标/射程字段", () => {
  const card = gestatingHeartCard();
  expect(card.skills).toHaveLength(1);
  const skill = card.skills[0]!;
  expect(skill.slot).toBe(1);
  expect(skill.name).toBe("Dispersion");
  expect(skill.target).toBeNull();
  expect(skill.printed_labels).toEqual([]);
  expect(skill.lines.some((line) => line.some((s) => s.type === "icon" && s.icon.key === "damage"))).toBe(
    false,
  );
});

it("p019 卡级 verified（icon 8707d5d8cf→summon）；p018/p020 仍为 verified 且各有三招 Acc 标签", () => {
  const cards = loadLargeCards();
  const heart = cards.find((c) => c.id === GESTATING_HEART_MONSTER_CARD_ID)!;
  expect(heart.verification).toEqual({ unverified: false, reasons: [] });

  for (const id of ["monster_large:p018", "monster_large:p020"] as const) {
    const boss = cards.find((c) => c.id === id)!;
    expect(boss.verification.unverified).toBe(false);
    expect(boss.skills.filter((s) => s.printed_labels.some((l) => l.label === "Acc"))).toHaveLength(3);
  }
});

it("Dispersion：readMonsterAttackView 就绪；verified 后 resolveMonsterSkill 仍缺 damage 路径", () => {
  const card = gestatingHeartCard();
  const attack = readMonsterAttackView(card, 1);
  expect(attack.status).toBe("ready");

  expect(resolveMonsterSkill(card, 1, minimalCombat, 4)).toMatchObject({
    status: "refused",
    reason: expect.stringContaining("damage"),
  });
});
