import { expect, it } from "vitest";
import fleshI from "../../../normalized/extension/warrens/flesh_i.json";
import fleshHigher from "../../../normalized/extension/warrens/flesh_higher.json";
import {
  warrensFleshHigherContentSchema,
  warrensFleshIContentSchema,
} from "../../../src/warrens/bosses/flesh";

it("Flesh One Body 四部位与更高威胁只登记不实现抽牌", () => {
  const i = warrensFleshIContentSchema.parse(fleshI);
  const higher = warrensFleshHigherContentSchema.parse(fleshHigher);
  expect(i.faces.map((f) => f.role)).toEqual(["head", "bone", "heart", "butt"]);
  expect(i.setup.partStances.butt).toBe("support");
  expect(i.abilities.dungeonThreatHigher.II.implementDraw).toBe(false);
  expect(higher.cards[1]?.abilities.threats.dungeon.drawUntilLargeMonster).toBe(true);
});
