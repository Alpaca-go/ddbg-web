import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedMonsterProtection } from "./verified-monster-protection";
const data = loadNormalizedCorebox();
it("R-083仅四具体战斗卡附加常驻Protection；不改词典、参考卡或其他卡", () => {
  for (const large of [false, true]) {
    const cards = large ? data.monster_large.cards : data.monster_medium.cards;
    const original = cards.map((c) => {
      const copy = structuredClone(c);
      if ("skills" in copy) delete copy.innateProtection;
      return copy;
    });
    const before = structuredClone(original);
    const result = attachVerifiedMonsterProtection(original, large);
    expect(result).toEqual(cards);
    expect(original).toEqual(before);
    expect(attachVerifiedMonsterProtection(result, large)).toEqual(result);
  }
  expect(
    [...data.monster_medium.cards, ...data.monster_large.cards]
      .filter((c) => "innateProtection" in c)
      .map((c) => [c.id, "innateProtection" in c && c.innateProtection]),
  ).toEqual([
    ["monster_medium:p050", true],
    ["monster_medium:p053", false],
    ["monster_large:p001", false],
    ["monster_large:p003", true],
  ]);
});
it("常驻Protection映射拒绝身份/页码漂移、冲突和头部图形签名丢失，输入不变", () => {
  for (const patch of [
    { name: "wrong" },
    { level: 1 },
    { pages: [51, 52] },
    { innateProtection: false },
    { front_icons: [] },
  ]) {
    const bad = data.monster_medium.cards.map((c) =>
      c.id === "monster_medium:p050" ? { ...c, ...patch } : c,
    );
    const before = structuredClone(bad);
    expect(() => attachVerifiedMonsterProtection(bad)).toThrow();
    expect(bad).toEqual(before);
  }
});
