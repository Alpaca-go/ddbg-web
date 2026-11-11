import { expect, it } from "vitest";
import { shareBattleCatalogs } from "../battle-data-shared";
import { battleDataPlugin } from "../battle-data-plugin";

it("构建共享条目保留目录顺序、空数组及同卡号历史差异", () => {
  const card = { id: "skill:1", damage: 2 };
  const catalogs = {
    current: { skills: [card, { id: "skill:2" }], monsters: [], level: 1 },
    old: { skills: [{ ...card }, { ...card, damage: 1 }], monsters: [], level: 1 },
  };
  const before = structuredClone(catalogs);
  const shared = shareBattleCatalogs(catalogs);
  for (const [id, catalog] of Object.entries(catalogs)) {
    // 表达式完全由本地构建函数生成，无外部输入。
    const restored = new Function("entries", `return (${shared.modules[id]});`)(shared.entries);
    expect(restored).toEqual(catalog);
  }
  expect(
    shared.entries.filter((entry) => JSON.stringify(entry) === JSON.stringify(card)),
  ).toHaveLength(1);
  expect(shared.entries).toContainEqual({ ...card, damage: 1 });
  expect(catalogs).toEqual(before);
});

it("四份真实构建目录共享前后逐项一致，历史目录不会混入新卡", () => {
  const load = battleDataPlugin().load as (id: string) => string;
  const catalogs = Object.fromEntries(
    ["battle-data", "quest-battle-data", "quest-battle-data-v1", "quest-battle-data-v2"].map(
      (id) => [
        id,
        JSON.parse(load(`\0virtual:${id}`).slice("export const battleData = ".length, -1)),
      ],
    ),
  );
  const shared = shareBattleCatalogs(catalogs);
  for (const [id, catalog] of Object.entries(catalogs)) {
    const restored = new Function("entries", `return (${shared.modules[id]});`)(shared.entries);
    expect(restored).toEqual(catalog);
  }
  expect(JSON.stringify(shared).length).toBeLessThan(JSON.stringify(catalogs).length);
});
