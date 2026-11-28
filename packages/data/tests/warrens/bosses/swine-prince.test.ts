import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import swineI from "../../../normalized/extension/warrens/swine_prince_i.json";
import swineHigher from "../../../normalized/extension/warrens/swine_prince_higher.json";
import { rawFileSchema } from "../../../src/shared/extract/raw";
import {
  warrensSwinePrinceHigherContentSchema,
  warrensSwinePrinceIContentSchema,
} from "../../../src/warrens/bosses/swine-prince";

const readRaw = (name: string) =>
  rawFileSchema.parse(
    JSON.parse(
      readFileSync(
        new URL(`../../../extract/extension/warrens/raw/${name}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );

describe("Warrens Swine Prince 数据层", () => {
  const approvedI = warrensSwinePrinceIContentSchema.parse(swineI);
  const approvedHigher = warrensSwinePrinceHigherContentSchema.parse(swineHigher);

  it("印刷 rawId 与 Boss Abilities / 战斗卡页序一致", () => {
    const abilities = readRaw("boss_ability");
    const large = readRaw("monster_large");
    const medium = readRaw("monster_medium");
    for (const id of [approvedI.abilities.descriptionCardId, approvedI.abilities.combatCardId]) {
      const card = abilities.cards.find((c) => c.id === id)!;
      expect(card.faces.front.file).toBe(approvedI.sources.abilityFront);
    }
    const prince = large.cards.find((c) => c.id === approvedI.faces[0].rawId)!;
    expect(prince.faces.front.page).toBe(5);
    const wilbur = medium.cards.find((c) => c.id === approvedI.faces[1].rawId)!;
    expect(wilbur.faces.front.page).toBe(20);
    expect(approvedI.setup.wilburStance).toBe("ranged");
    expect(approvedI.setup.wilburEngineStanceHold).toBe("support");
    expect(approvedI.setup.monsterInitiativeCards).toBe(3);
    expect(approvedI.abilities.threats.dungeon.name).toBe("Bestial Rage");
    expect(approvedI.abilities.threats.hamlet.name).toBe("Uneasy Times I");
    expect(approvedI.pendingReview.some((q) => q.startsWith("Q-WARRENS-25"))).toBe(true);
  });

  it("II/III 等级卡面页递增且不授予 combatReady", () => {
    expect(approvedHigher.cards.map((c) => c.level)).toEqual([2, 3]);
    expect(approvedHigher.cards.flatMap((c) => c.faces.map((f) => f.rawId.slice(-3)))).toEqual([
      "006",
      "021",
      "007",
      "022",
    ]);
    expect(
      warrensSwinePrinceIContentSchema.safeParse({ ...swineI, combatReady: true }).success,
    ).toBe(false);
  });
});
