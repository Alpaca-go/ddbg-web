import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readMonsterAttackView, resolveMonsterSkill } from "./monster-skill";
import type { MonsterCardView } from "./monster-skill";
import { selectMonsterSkill } from "./monster-stance";

describe("Weald 普通怪物审阅边界（R-048 / Q-186）", () => {
  it("真实规范化卡在完成图标和效果核实前，所有技能都拒绝运行", () => {
    const cards = ["monster_medium", "monster_large"].flatMap((name) => {
      const file = JSON.parse(
        readFileSync(
          new URL(`../../data/normalized/extension/weald/${name}.json`, import.meta.url),
          "utf8",
        ),
      ) as {
        cards: (MonsterCardView | { card_kind: "large_monster_reference" })[];
      };
      return file.cards;
    });
    let checked = 0;
    for (const card of cards) {
      if (!("skills" in card)) continue;
      expect(selectMonsterSkill(card, ["aggressive"]).status).toBe("refused");
      for (const skill of card.skills) {
        expect(
          resolveMonsterSkill(
            card,
            skill.slot,
            {
              actor: { id: "monster", wounds: 0 },
              target: { id: "hero", side: "hero", wounds: 0, dodge: 0, stress: 0 },
              areaDistance: 1,
              light: 5,
            },
            1,
          ),
        ).toMatchObject({ status: "refused", reason: "未验证的怪物卡不结算（R-048）" });
        const attack = readMonsterAttackView(card, skill.slot);
        if (attack.status === "ready") expect(attack.view.verification.unverified).toBe(true);
        checked += 1;
      }
    }
    expect(checked).toBe(13);
  });
});
