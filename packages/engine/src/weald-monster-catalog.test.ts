import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildWealdMonsterCatalog } from "./expansions/weald/monster-catalog";
import { selectMonsterSkill } from "./monster-stance";

function sources() {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        new URL(`../../data/normalized/extension/weald/${name}.json`, import.meta.url),
        "utf8",
      ),
    ) as { cards: Record<string, unknown>[]; sources: { raw: string } };
  return { medium: read("monster_medium"), large: read("monster_large") };
}

describe("Weald R-232 已核准战斗目录", () => {
  it("由真实规范化数据构造五种单位，保留来源审阅状态且不混入参考卡", () => {
    const source = sources();
    const before = structuredClone(source);
    const catalog = buildWealdMonsterCatalog(source.medium, source.large);
    expect(source).toEqual(before);
    expect(
      catalog.map((card) => [card.name, card.dodge, card.speed, card.resistances?.[0]?.key]),
    ).toEqual([
      ["Ectoplasm", 0, 1, "blight_resist"],
      ["Rabid Gnasher", 2, 3, "stun_resist"],
      ["Fungal Scratcher", 0, 1, "blight_resist"],
      ["Fungal Artillery", 1, 1, "blight_resist"],
      ["Large Ectoplasm", 0, 1, "stun_resist"],
    ]);
    for (const card of catalog) {
      expect(card.verification.unverified).toBe(false);
      expect(card.immunities).toEqual([]);
    }
  });

  it("大型怪占两格，只用左侧的一张选招表，灰栏不产生 unavailable 组", () => {
    const source = sources();
    const large = buildWealdMonsterCatalog(source.medium, source.large).find(
      (card) => card.stanceSlots === 2,
    )!;
    expect(large.stanceGroups).toHaveLength(1);
    expect(large.stanceGroups?.[0]).not.toHaveProperty("unavailable");
    expect(selectMonsterSkill(large, ["ranged", "defensive"], 5)).toMatchObject({
      status: "selected",
      skillSlot: 2,
    });
  });

  it.each(["dodge", "resistance", "profile", "missing", "duplicate", "source"])(
    "拒绝 %s 漂移，不清除源数据的审阅门来绕过验证",
    (mutation) => {
      const source = sources();
      const first = source.medium.cards[0]!;
      if (mutation === "dodge") first.dodge = 99;
      if (mutation === "resistance") first.resistances = [];
      if (mutation === "profile")
        first.verified_weald_profile = {
          ...(first.verified_weald_profile as Record<string, unknown>),
          resistance: "stun",
        };
      if (mutation === "missing") source.medium.cards.shift();
      if (mutation === "duplicate") source.medium.cards.push(structuredClone(first));
      if (mutation === "source")
        source.medium.sources.raw = "extract/corebox/raw/monster_medium.json";
      expect(() => buildWealdMonsterCatalog(source.medium, source.large)).toThrow();
    },
  );

  it("返回目录不共享可变选招表，不污染后续战役目录", () => {
    const source = sources();
    const first = buildWealdMonsterCatalog(source.medium, source.large);
    (first[0]!.stanceGroups![0]!.stances as string[])[0] = "support";
    const next = buildWealdMonsterCatalog(source.medium, source.large);
    expect(next[0]!.stanceGroups![0]!.stances[0]).toBe("aggressive");
  });
});
