import { describe, expect, it } from "vitest";
import file from "../normalized/corebox/dungeon_layouts.json";
import first from "../normalized/corebox/dungeon_layout_p001.json";
import { dungeonLayoutFileSchema, dungeonLayoutSchema } from "./dungeon-layout";

describe("QuestMap 14 页印刷标注（Q-45、R-048）", () => {
  const parsed = dungeonLayoutFileSchema.parse(file);
  it("全页 schema、连通性与来源唯一性；R-065仅批准p1", () => {
    expect(
      parsed.layouts.map((l) => [
        l.source.page,
        l.nodes.filter((n) => n.kind === "room").length,
        l.edges.length,
      ]),
    ).toEqual([
      [1, 8, 8],
      [2, 8, 8],
      [3, 8, 10],
      [4, 8, 10],
      [5, 8, 10],
      [6, 8, 11],
      [7, 8, 10],
      [8, 8, 8],
      [9, 8, 9],
      [10, 8, 11],
      [11, 16, 19],
      [12, 16, 17],
      [13, 8, 8],
      [14, 8, 8],
    ]);
    expect(parsed.layouts[0]!.review).toBe("confirmed");
    expect(parsed.layouts.slice(1).every((l) => l.review === "pending")).toBe(true);
    expect(parsed.layouts[0]).toEqual(first);
    expect(first.edges).toEqual([
      ["S", "G"],
      ["G", "F"],
      ["F", "C"],
      ["G", "H"],
      ["G", "D"],
      ["D", "E"],
      ["D", "A"],
      ["A", "B"],
    ]);
    expect(first.nodes.map((n) => n.id)).toEqual(["S", "A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(
      dungeonLayoutFileSchema.safeParse({ ...file, layouts: [...file.layouts, file.layouts[0]] })
        .success,
    ).toBe(false);
  });
  it("实际灰点连接 2、3、4 段均合法，不能把灰点压成一条边", () => {
    const degrees = parsed.layouts.flatMap((l) =>
      l.nodes
        .filter((n) => n.kind === "dot")
        .map((n) => l.edges.filter((e) => e.includes(n.id)).length),
    );
    expect(degrees).toEqual([3, 3, 3, 3, 2, 4, 4, 4, 3]);
    const l = parsed.layouts[2]!;
    expect(
      dungeonLayoutSchema.safeParse({
        ...l,
        edges: l.edges.filter((e) => !e.includes("X") || e.includes("A")),
      }).success,
    ).toBe(false);
  });
  it("p11 红点 X 为走廊灰点（R-114）；A/B/G 为 Objective 房槽（R-115）；p12 A/C/D 为 Objective 房槽（R-117）", () => {
    const p11 = parsed.layouts[10]!;
    expect(p11.nodes.find((n) => n.id === "X")!.kind).toBe("dot");
    expect(p11.unresolvedMarkers ?? []).toHaveLength(0);
    for (const id of ["A", "B", "G"])
      expect(p11.nodes.find((n) => n.id === id)).toMatchObject({
        kind: "room",
        slotKind: "objective",
      });
    const p12 = parsed.layouts[11]!;
    expect(p12.unresolvedMarkers ?? []).toHaveLength(0);
    for (const id of ["A", "C", "D"])
      expect(p12.nodes.find((n) => n.id === id)).toMatchObject({
        kind: "room",
        slotKind: "objective",
      });
    expect(parsed.layouts.flatMap((l) => l.unresolvedMarkers ?? [])).toHaveLength(0);
  });
});
