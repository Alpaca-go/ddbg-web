import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import {
  readMonsterAttackView,
  resolveMonsterSkill,
  type MonsterCardView,
} from "../monster-skill";
import { SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID } from "./darkest-shuffling-horror-combat-runtime";

function loadLargeCards(): MonsterCardView[] {
  const large = JSON.parse(
    readFileSync(new URL("../../../data/normalized/corebox/monster_large.json", import.meta.url), {
      encoding: "utf8",
    }),
  ) as { cards: MonsterCardView[] };
  return large.cards;
}

function shufflingHorrorCard(): MonsterCardView {
  const card = loadLargeCards().find((entry) => entry.id === SHUFFLING_HORROR_COMBAT_MONSTER_CARD_ID);
  expect(card).toBeDefined();
  return card!;
}

const minimalCombat = {
  actor: { id: "horror", wounds: 0, shuffleResist: true },
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

it("monster_large:p017 三招印刷 Acc；卡级 unverified（icon:8707d5d8cf）", () => {
  const card = shufflingHorrorCard();
  expect(card.verification).toEqual({ unverified: true, reasons: ["icon:8707d5d8cf"] });
  const accSkills = card.skills.filter((skill) =>
    skill.printed_labels.some((label) => label.label === "Acc"),
  );
  expect(accSkills).toHaveLength(3);
  expect(accSkills.map((skill) => skill.name)).toEqual([
    "Lacerate",
    "Undulations",
    "Echoing Disassembly",
  ]);
});

it("Lacerate：readMonsterAttackView 就绪；unverified 时 resolveMonsterSkill 拒绝 Acc 路径", () => {
  const card = shufflingHorrorCard();
  const attack = readMonsterAttackView(card, 1);
  expect(attack.status).toBe("ready");
  expect(resolveMonsterSkill(card, 1, minimalCombat, 4)).toMatchObject({
    status: "refused",
    reason: "未验证的怪物卡不结算（R-048）",
  });
});

it("Undulations / Echoing Disassembly 已有几何命令，不走 Acc-only 模块", () => {
  const card = shufflingHorrorCard();
  for (const slot of [2, 3] as const) {
    expect(readMonsterAttackView(card, slot).status).toBe("ready");
    expect(resolveMonsterSkill(card, slot, minimalCombat, 4)).toMatchObject({
      status: "refused",
      reason: "未验证的怪物卡不结算（R-048）",
    });
  }
});

it("卡级 unverified 时 Lacerate resolveMonsterSkill 拒绝", () => {
  const card = shufflingHorrorCard();
  expect(resolveMonsterSkill(card, 1, minimalCombat, 4)).toMatchObject({
    status: "refused",
    reason: "未验证的怪物卡不结算（R-048）",
  });
});
