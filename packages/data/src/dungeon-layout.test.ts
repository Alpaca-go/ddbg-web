import { describe, expect, it } from "vitest";
import file from "../normalized/corebox/dungeon_layouts.json";
import first from "../normalized/corebox/dungeon_layout_p001.json";
import { dungeonLayoutFileSchema, dungeonLayoutSchema } from "./dungeon-layout";

describe("QuestMap 14 页印刷标注（Q-45、R-048）", () => {
  const parsed = dungeonLayoutFileSchema.parse(file);
  it("全页 schema、连通性与来源唯一性；不升级为确认", () => {
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
    expect(parsed.layouts.every((l) => l.review === "pending")).toBe(true);
    expect(parsed.layouts[0]).toEqual(first);
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
    expect(degrees).toEqual([3, 3, 3, 3, 2, 4, 4, 4]);
    const l = parsed.layouts[2]!;
    expect(
      dungeonLayoutSchema.safeParse({
        ...l,
        edges: l.edges.filter((e) => !e.includes("X") || e.includes("A")),
      }).success,
    ).toBe(false);
  });
  it("红点与特殊图案只存观察，保留 semantic=null", () => {
    expect(parsed.layouts[10]!.nodes.find((n) => n.id === "X")!.kind).toBe("unresolved");
    expect(parsed.layouts[10]!.unresolvedMarkers).toHaveLength(4);
    expect(parsed.layouts[11]!.unresolvedMarkers).toHaveLength(3);
    expect(
      parsed.layouts.flatMap((l) => l.unresolvedMarkers ?? []).every((m) => m.semantic === null),
    ).toBe(true);
  });
});
