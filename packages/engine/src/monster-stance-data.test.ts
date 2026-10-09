import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { selectMonsterSkill } from "./index";
import type { MonsterStanceCardView } from "./index";

// 本批仅核图并交付待确认表；不把拟议分组放入夹具或真实卡池。
const reviewIds = [
  "monster_medium:p001",
  "monster_medium:p004",
  "monster_medium:p007",
  "monster_medium:p010",
  "monster_medium:p021",
  "monster_medium:p040",
];
const file = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
) as { cards: (MonsterStanceCardView & { id: string; footer_lines: unknown[] })[] };

describe("待确认姿态表不进入真实卡自动选招（R-015、R-048）", () => {
  it("有 footer 且 unverified=false 仍不足以自动选招，不请求选招骰", () => {
    for (const id of reviewIds) {
      const card = file.cards.find((entry) => entry.id === id);
      expect(card, id).toBeDefined();
      if (!card || !("skills" in card)) throw new Error(`${id} 必须是技能怪物卡`);
      expect(card.verification.unverified, id).toBe(false);
      expect(card.footer_lines.length, id).toBeGreaterThan(0);
      expect(card.stanceGroups, id).toBeUndefined();
      const before = structuredClone(card);
      for (const stance of ["aggressive", "defensive", "ranged", "support"] as const) {
        for (const roll of [undefined, 1, 5, 10]) {
          expect(selectMonsterSkill(card, [stance], roll), `${id}/${stance}/${roll}`).toEqual({
            status: "refused",
            reason: "缺少已核实的姿态选招分组（R-015、R-048）",
          });
        }
      }
      expect(card, id).toEqual(before);
    }
  });
});
