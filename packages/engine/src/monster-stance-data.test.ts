import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectMonsterSkill } from "./index";
import type { MonsterStanceCardView } from "./index";

const file = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
) as { cards: (MonsterStanceCardView & { id: string; footer_lines: unknown[] })[] };
const stances = ["aggressive", "defensive", "ranged", "support"] as const;

// 独立列出经 Kyries 批准的卡面结果；数字数组按 d10 的 1–10 排列。
// docs/monster-stance-review-2026-10-09.md §3–4、§7；R-015、R-048。
// Bone Spearman II 单卡批准：R-082 / Q-85。
const approved = [
  // C-012：当前版 Necromancer I p089；四姿态同一完整 d10 表。
  { id: "monster_medium:p089", slots: Array(4).fill([1, 1, 1, 2, 2, 2, 3, 3, 3, 3]) },
  // C-019：独立核对 II 级 p090。
  { id: "monster_medium:p090", slots: Array(4).fill([1, 1, 1, 2, 2, 2, 3, 3, 3, 3]) },
  {
    id: "monster_medium:p050",
    slots: [
      [1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      [1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      [1, 1, 1, 1, 1, 1, 2, 2, 2, 2],
      2,
    ],
  },
  {
    id: "monster_medium:p053",
    slots: [
      [2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 3, 3, 3, 3, 3],
    ],
  },
  { id: "monster_medium:p001", slots: [1, 1, 1, 2] },
  { id: "monster_medium:p004", slots: [2, [1, 1, 1, 1, 1, 2, 2, 2, 2, 2], 1, 1] },
  { id: "monster_medium:p007", slots: [2, 2, 1, 1] },
  {
    id: "monster_medium:p010",
    slots: [[2, 2, 2, 2, 2, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 1, 1, 1, 1, 1], 3, 3],
  },
  { id: "monster_medium:p040", slots: [1, 1, 1, 2] },
  {
    id: "monster_medium:p021",
    slots: [
      [1, 1, 1, 1, 1, 3, 3, 3, 3, 3],
      [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
      [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
      [1, 1, 1, 1, 2, 2, 2, 3, 3, 3],
    ],
  },
  { id: "monster_medium:p027", slots: [2, 2, 1, 1] },
  { id: "monster_medium:p031", slots: [1, 1, 1, 1] },
  { id: "monster_medium:p043", slots: Array(4).fill([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]) },
  { id: "monster_medium:p046", slots: [2, 2, 1, 1] },
  { id: "monster_medium:p018", slots: [1, 1, 2, 2] },
  {
    id: "monster_medium:p024",
    slots: [[2, 2, 2, 2, 1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 1, 1, 1, 1, 1, 1], 1, 3],
  },
  { id: "monster_medium:p034", slots: Array(4).fill([1, 1, 1, 1, 1, 2, 2, 2, 2, 2]) },
  { id: "monster_medium:p037", slots: [2, 2, 1, 1] },
  {
    id: "monster_medium:p013",
    slots: [[2, 2, 2, 2, 2, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 1, 1, 1, 1, 1], 1, 1],
  },
];

describe("真实卡获批姿态分组与未获批拒绝（R-015、R-048）", () => {
  it.each(approved)("$id 的四姿态与全部骰面符合获批卡面", ({ id, slots }) => {
    const card = file.cards.find((entry) => entry.id === id)!;
    expect(card, id).toBeDefined();
    expect(card.verification.unverified).toBe(false);
    expect(card.stanceGroups).toBeDefined();
    const before = structuredClone(card);
    stances.forEach((stance, index) => {
      const expected = slots[index]!;
      expect(selectMonsterSkill(card, [stance])).toEqual(
        typeof expected === "number"
          ? { status: "selected", skillSlot: expected, roll: null }
          : { status: "needsRoll", stance },
      );
      for (let roll = 1; roll <= 10; roll++) {
        expect(selectMonsterSkill(card, [stance], roll)).toEqual({
          status: "selected",
          skillSlot: typeof expected === "number" ? expected : expected[roll - 1],
          roll: typeof expected === "number" ? null : roll,
        });
      }
    });
    expect(card).toEqual(before);
  });

  it("其他真实卡有 footer 且 unverified=false，缺分组仍拒绝；不请求骰或补默认值", () => {
    const cards = file.cards.filter(
      (card) =>
        "skills" in card &&
        !card.verification.unverified &&
        card.footer_lines.length > 0 &&
        !approved.some((entry) => entry.id === card.id),
    );
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.stanceGroups, card.id).toBeUndefined();
      const before = structuredClone(card);
      for (const stance of stances) {
        for (const roll of [undefined, 1, 5, 10]) {
          expect(selectMonsterSkill(card, [stance], roll), `${card.id}/${stance}/${roll}`).toEqual({
            status: "refused",
            reason: "缺少已核实的姿态选招分组（R-015、R-048）",
          });
        }
      }
      expect(card).toEqual(before);
    }
  });
});
