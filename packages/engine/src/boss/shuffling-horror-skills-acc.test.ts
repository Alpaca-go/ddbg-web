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

const RANGE_REFUSAL = "目标区域与使用者的距离不是卡面印的射程（规则书第 19 页）";

it("monster_large:p017 三招印刷 Acc；卡级 verified（icon 8707d5d8cf→summon）", () => {
  const card = shufflingHorrorCard();
  expect(card.verification).toEqual({ unverified: false, reasons: [] });
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

it("Lacerate：readMonsterAttackView 就绪；verified 后 generic resolve 仍拒绝（未开 Acc 命令）", () => {
  const card = shufflingHorrorCard();
  const attack = readMonsterAttackView(card, 1);
  expect(attack.status).toBe("ready");
  expect(resolveMonsterSkill(card, 1, minimalCombat, 4)).toMatchObject({
    status: "refused",
    reason: RANGE_REFUSAL,
  });
});

it("Undulations / Echoing Disassembly 已有几何命令；generic resolve 不走 R-048 未验证门", () => {
  const card = shufflingHorrorCard();
  for (const slot of [2, 3] as const) {
    expect(readMonsterAttackView(card, slot).status).toBe("ready");
    expect(resolveMonsterSkill(card, slot, minimalCombat, 4)).toMatchObject({
      status: "refused",
      reason: RANGE_REFUSAL,
    });
  }
});
