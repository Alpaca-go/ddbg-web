import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import printed from "../../../../normalized/extension/weald/hag_higher.json";
import { wealdHagHigherContentSchema } from "../../../../src/weald/bosses/hag/hag-higher";
import { wealdHagContentSchema } from "../../../../src/weald/bosses/hag/hag";
import { rawFileSchema } from "../../../../src/shared/extract/raw";

const content = wealdHagHigherContentSchema.parse(printed);
const raw = (kind: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../../extract/extension/weald/raw/${kind}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

describe("R-267 Hag II／III 印刷目录", () => {
  it("真实英文页码与卡面相符，满锅背面不增加实体", () => {
    const monsters = raw("monster_large");
    const abilities = raw("boss_ability");
    for (const card of content.cards) {
      expect(new Set(card.faces.map((f) => f.rawId)).size).toBe(2);
      for (const face of card.faces) {
        const source = monsters.cards.find((c) => c.id === face.rawId)!;
        expect(source.copies).toBe(1);
        expect(source.faces[face.face]).toMatchObject({
          file: content.sources[face.face === "front" ? "combatFront" : "combatBack"],
          page: Number(face.rawId.slice(-3)),
        });
      }
      for (const id of [
        card.abilities.descriptionCardId,
        card.abilities.hagCardId,
        card.abilities.cauldronCardId,
      ]) {
        expect(abilities.cards.find((c) => c.id === id)?.faces.front).toMatchObject({
          file: content.sources.abilityFront,
          page: Number(id.slice(-3)),
        });
      }
    }
  });

  it("采用逐面核准数值及四目标更正，不从 I 级推算", () => {
    expect(
      content.cards.map((c) => c.faces.map((f) => [f.life, f.speed, f.dodge, f.innateProtection])),
    ).toEqual([
      [
        [75, 2, 1, false],
        [100, 0, 0, true],
        [14, 0, 0, false],
      ],
      [
        [95, 2, 1, false],
        [136, 0, 0, true],
        [19, 0, 0, false],
      ],
    ]);
    expect(
      content.cards.map((c) =>
        c.faces.flatMap((f) =>
          f.skills.map((s) => [s.name, s.maxTargets, s.crit, s.critDamage, s.accuracy, s.damage]),
        ),
      ),
    ).toEqual([
      [
        ["Into the Pot", 1, null, null, 11, null],
        ["Meat Tenderizer", 4, 2, 6, 10, 4],
        ["Season to Perfection", 1, 0, 4, 11, 2],
        ["Boil", 1, 1, 12, 14, 7],
      ],
      [
        ["Into the Pot", 1, null, null, 12, null],
        ["Meat Tenderizer", 4, 2, 9, 11, 6],
        ["Season to Perfection", 1, 0, 6, 12, 3],
        ["Boil", 1, 1, 16, 16, 9],
      ],
    ]);
    expect(content.cards.map((c) => c.abilities.threats.dungeon.provisions)).toEqual([
      ["potion", "food"],
      ["potion", "food", "bandage"],
    ]);
    expect(content.cards.every((c) => !c.abilities.captiveTargetable)).toBe(true);
  });

  it("拒绝混级、重复实体面、错绑能力与威胁、伪造锅选招表", () => {
    const mutations = [
      (c: typeof printed) => {
        c.cards[1]!.level = 2;
      },
      (c: typeof printed) => {
        c.cards[0]!.faces[2]!.face = "front";
      },
      (c: typeof printed) => {
        c.cards[0]!.faces[0]!.level = 3;
      },
      (c: typeof printed) => {
        c.cards[0]!.abilities.hagCardId = "boss_ability:weald:p018";
      },
      (c: typeof printed) => {
        c.cards[0]!.abilities.threats.dungeon.provisions.push("bandage");
      },
      (c: typeof printed) => {
        c.cards[1]!.abilities.threats.hamlet.sanitariumHealingReduction = 6;
      },
      (c: typeof printed) => {
        c.cards[0]!.faces[2]!.allStancesSelection.push({ min: 1, max: 10, slot: 1 });
      },
      (c: typeof printed) => {
        c.cards[0]!.faces[0]!.allStancesSelection[0]!.max = 7;
      },
    ];
    for (const mutate of mutations) {
      const bad = structuredClone(printed);
      mutate(bad);
      expect(wealdHagHigherContentSchema.safeParse(bad).success).toBe(false);
    }
    expect(wealdHagHigherContentSchema.safeParse({ ...printed, combatReady: true }).success).toBe(
      false,
    );
    expect(wealdHagContentSchema.safeParse(printed).success).toBe(false);
  });
});
