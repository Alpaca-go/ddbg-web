import { expect, it } from "vitest";
import vvulfI from "../../../normalized/extension/warrens/vvulf_i.json";
import { warrensVvulfIContentSchema } from "../../../src/warrens/bosses/vvulf";

it("Vvulf I 登记 2+4 先攻与 Barrel O'Bombs 注释", () => {
  const content = warrensVvulfIContentSchema.parse(vvulfI);
  expect(content.setup).toMatchObject({
    monsterInitiativeCards: 2,
    heroInitiativeCards: 4,
    vvulfStance: "aggressive",
  });
  expect(content.abilities.barrelOBombs.miniatureNote).toBe(true);
});
