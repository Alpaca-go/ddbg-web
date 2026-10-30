import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "./write";
import { attachVerifiedCollectedLife } from "./verified-collected-life";

const built = loadNormalizedCorebox();
const ids = {
  monster_medium: [91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103],
  monster_large: [5, 6, 7, 9, 10, 11, 12, 13],
} as const;
for (const deck of ["monster_medium", "monster_large"] as const) {
  const url = new URL(`../../normalized/corebox/${deck}.json`, import.meta.url);
  const committed = JSON.parse(readFileSync(url, "utf8")) as (typeof built)[typeof deck];
  const selected = new Set<string>(ids[deck].map((n) => `${deck}:p${String(n).padStart(3, "0")}`));
  if (process.env.REBUILD_RUINS_BOSSES === "1") {
    const cards = committed.cards.map((c) =>
      selected.has(c.id) ? built[deck].cards.find((n) => n.id === c.id)! : c,
    );
    const unverified = cards.filter((c) => c.verification.unverified).length;
    writeFileSync(
      url,
      JSON.stringify(
        {
          ...committed,
          cards,
          stats: { cards: cards.length, verified: cards.length - unverified, unverified },
        },
        null,
        1,
      ) + "\n",
    );
  }
  it(`${deck}：高等级 Boss 及召唤物由生成层重建，不借其它卡批准`, () => {
    const actual = JSON.parse(readFileSync(url, "utf8")) as typeof committed;
    for (const id of selected) {
      const card = actual.cards.find((c) => c.id === id)!;
      expect(card).toEqual(built[deck].cards.find((c) => c.id === id));
      expect(card.verification.unverified).toBe(false);
    }
  });
}
it("Collected 的 Life 只接受当前独立核图数字；篡改不能获得修正", () => {
  const c = built.monster_medium.cards.find((c) => c.id === "monster_medium:p096")!;
  if (!("skills" in c)) throw new Error("缺 Collected 技能卡");
  expect(c.life).toBe(15);
  expect(() => attachVerifiedCollectedLife([{ ...c, level: 3 }])).toThrow();
});
