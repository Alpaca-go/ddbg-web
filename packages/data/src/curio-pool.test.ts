import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { curioFileSchema, wealdCurioFileSchema } from "./curio";
import { curioPoolIdentity, locationCurioPool } from "./curio-pool";

const read = (path: string): unknown =>
  JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")) as unknown;
const core = curioFileSchema.parse(read("normalized/corebox/curio.json")).cards;
const weald = wealdCurioFileSchema.parse(read("normalized/extension/weald/curio.json")).cards;

describe("地点奇物组池（核心 R9–R10、Weald W3）", () => {
  it("核心 raw 旗帜身份对应 8 张通用和 16 张遗迹", () => {
    const raw = read("extract/corebox/raw/curio.json") as {
      cards: { id: string; faces: { front: { icons: { iconId: string }[] } } }[];
    };
    for (const card of core) {
      const common = card.source.page <= 8;
      expect(curioPoolIdentity(card)).toBe(common ? "common" : "ruins");
      expect(JSON.stringify(raw.cards.find((entry) => entry.id === card.id))).toContain(
        common ? "3825ad46df" : "27fe03d7a2",
      );
    }
  });

  it("Weald 只混入通用卡，保留 24 张实体、同名异卡及稳定顺序", () => {
    const before = structuredClone({ core, weald });
    const pool = locationCurioPool(core, { location: "weald", cards: weald });
    expect(pool).toEqual([...core.slice(0, 8), ...weald]);
    expect(new Set(pool.map((card) => card.id)).size).toBe(24);
    expect(pool.reduce((sum, card) => sum + card.copies, 0)).toBe(24);
    expect(pool.filter((card) => curioPoolIdentity(card) === "ruins")).toEqual([]);
    expect(locationCurioPool(core, { location: "ruins" })).toEqual(core);
    expect({ core, weald }).toEqual(before);
    expect(
      locationCurioPool([...core].reverse(), { location: "weald", cards: [...weald].reverse() }),
    ).toEqual([...core.slice(0, 8).reverse(), ...[...weald].reverse()]);
  });

  it("拒绝缺卡、重复与跨包替换，不以总长度代替来源校验", () => {
    expect(() => locationCurioPool(core.slice(1), { location: "ruins" })).toThrow();
    expect(() => locationCurioPool([...core.slice(1), core[1]!], { location: "ruins" })).toThrow();
    expect(() =>
      locationCurioPool(core, { location: "weald", cards: [...weald.slice(1), core[0]!] }),
    ).toThrow();
    expect(() => locationCurioPool(core, { location: "weald", cards: weald.slice(1) })).toThrow();
  });
});
