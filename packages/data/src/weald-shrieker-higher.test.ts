import { expect, it } from "vitest";
import printed from "../normalized/extension/weald/shrieker_higher.json";
import { wealdShriekerHigherContentSchema as schema } from "./weald-shrieker-higher";
it("R-268：两级本体、Nest、三技能和不同补给威胁", () => {
  const data = schema.parse(printed);
  expect(
    data.cards.map((c) => [
      c.faces[0].life,
      c.faces[1].life,
      c.abilities.callTheMurder.printedHeal,
    ]),
  ).toEqual([
    [60, 30, 3],
    [72, 40, 4],
  ]);
  expect(data.cards.map((c) => c.abilities.threats.dungeon.mode)).toEqual([
    "ignoreAfterRoll",
    "gainThenDiscard",
  ]);
});
it("拒绝跨等级卡、改错出血时长与把两级威胁互换", () => {
  const wrong = structuredClone(printed);
  wrong.cards[1]!.faces[0]!.skills[0]!.effects[1] = { kind: "bleed", amount: 3, duration: 2 };
  const crossed = structuredClone(printed);
  crossed.cards[0]!.faces[1]!.rawId = "monster_large:weald:p009";
  const threat = structuredClone(printed);
  threat.cards[0]!.abilities.threats = structuredClone(printed.cards[1]!.abilities.threats);
  for (const bad of [wrong, crossed, threat]) expect(schema.safeParse(bad).success).toBe(false);
});
