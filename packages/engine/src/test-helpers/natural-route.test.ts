import { expect, it } from "vitest";
import { coreQuestMapLayouts } from "../../../data/src/quest-map-pairing";
import type { DungeonState } from "../dungeon";
import { nextNaturalRoute } from "./natural-route";

const layouts = coreQuestMapLayouts().filter(
  (l) => l.review === "confirmed" && l.nodes.filter((n) => n.kind === "room").length === 8,
);

it.each(layouts.map((layout) => [layout.id, layout] as const))(
  "%s：只走实际相邻边，完整覆盖房间 / 灰点，返回仅用已走边",
  (_id, layout) => {
    const original = JSON.stringify(layout);
    const d: Pick<DungeonState, "layout" | "position" | "visited" | "traversedCorridors"> = {
      layout,
      position: "S",
      visited: ["S"],
      traversedCorridors: [],
    };
    const route: string[] = [];
    for (let hops = 0; hops < layout.nodes.length ** 2; hops++) {
      const before = JSON.stringify(d);
      const next = nextNaturalRoute(d);
      expect(JSON.stringify(d)).toBe(before);
      if (!next) break;
      const from = d.position;
      expect(
        layout.edges.some(
          ([a, b]) => (a === from && b === next.to) || (b === from && a === next.to),
        ),
      ).toBe(true);
      if (next.backtrack) {
        expect(d.visited).toContain(next.to);
        expect(
          d.traversedCorridors!.some(
            ([a, b]) => (a === from && b === next.to) || (b === from && a === next.to),
          ),
        ).toBe(true);
      } else {
        expect(d.visited).not.toContain(next.to);
      }
      route.push(next.to);
      Object.assign(d, {
        position: next.to,
        visited: [...new Set([...d.visited!, next.to])],
        traversedCorridors: [...d.traversedCorridors!, [from, next.to]],
      });
    }
    expect([...d.visited!].sort()).toEqual(layout.nodes.map((n) => n.id).sort());
    expect(nextNaturalRoute(d)).toBeNull();
    expect(JSON.stringify(layout)).toBe(original);
    if (layout.id === "quest_map:p001") {
      expect(route).toEqual(["G", "D", "A", "B", "A", "D", "E", "D", "G", "H", "G", "F", "C"]);
    }
  },
);

it("续跑含环图时，不能把只访问过另一端的未走边当返回捷径", () => {
  const layout = {
    ...layouts[0]!,
    nodes: [
      { id: "S", kind: "start" as const, x: 0, y: 3 },
      { id: "A", kind: "room" as const, x: 0, y: 1 },
      { id: "B", kind: "room" as const, x: 0, y: 2 },
      { id: "C", kind: "room" as const, x: 0, y: 0 },
    ],
    edges: [
      ["S", "A"],
      ["A", "B"],
      ["S", "B"],
      ["B", "C"],
    ] as [string, string][],
  };
  const d = {
    layout,
    position: "S",
    visited: ["S", "A", "B"],
    traversedCorridors: [
      ["S", "A"],
      ["A", "B"],
    ] as [string, string][],
  };
  expect(nextNaturalRoute(d)).toEqual({ to: "A", backtrack: true });
  expect(nextNaturalRoute({ ...d, position: "A" })).toEqual({ to: "B", backtrack: true });
  expect(nextNaturalRoute({ ...d, position: "B" })).toEqual({ to: "C", backtrack: false });
});

it("没有已走通的路可达新节点时停住，不补连接或进入未解释节点", () => {
  const layout = {
    ...layouts[0]!,
    nodes: [
      { id: "S", kind: "start" as const, x: 0, y: 2 },
      { id: "X", kind: "unresolved" as const, x: 0, y: 1 },
      { id: "A", kind: "room" as const, x: 0, y: 0 },
    ],
    edges: [
      ["S", "X"],
      ["X", "A"],
    ] as [string, string][],
  };
  expect(nextNaturalRoute({ layout, position: "S" })).toBeNull();
  expect(nextNaturalRoute({ layout: { ...layout, edges: [] }, position: "S" })).toBeNull();
});
