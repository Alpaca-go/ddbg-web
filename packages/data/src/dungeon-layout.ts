import { z } from "zod";

/** Q-45 / R-046：探索地图与战斗 Room Tile 分开；未批准标注只能进沙盒。 */
export const dungeonLayoutSchema = z
  .strictObject({
    id: z.string().min(1),
    source: z.strictObject({
      file: z.string().min(1),
      page: z.int().positive(),
      face: z.literal("front"),
    }),
    review: z.enum(["pending", "confirmed"]),
    nodes: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          kind: z.enum(["start", "room", "dot"]),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(2),
    edges: z.array(z.tuple([z.string(), z.string()])),
  })
  .superRefine((layout, ctx) => {
    const ids = new Set(layout.nodes.map((n) => n.id));
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (ids.size !== layout.nodes.length) fail("节点 ID 重复");
    if (layout.nodes.filter((n) => n.kind === "start").length !== 1) fail("必须有唯一起点");
    if (!layout.nodes.some((n) => n.kind === "room")) fail("没有房间槽");
    const pairs = new Set<string>();
    for (const [a, b] of layout.edges) {
      const key = JSON.stringify([a, b].sort());
      if (!ids.has(a) || !ids.has(b) || a === b || pairs.has(key)) fail("连接无效 / 重复");
      pairs.add(key);
    }
    const reached = new Set([layout.nodes[0]!.id]);
    for (const id of reached)
      for (const [a, b] of layout.edges) {
        if (a === id) reached.add(b);
        if (b === id) reached.add(a);
      }
    if (reached.size !== ids.size) fail("地图不连通");
    for (const n of layout.nodes.filter((n) => n.kind === "dot")) {
      if (layout.edges.filter((e) => e.includes(n.id)).length !== 2) fail("灰点必须连接两段走廊");
    }
  });
export type DungeonLayout = z.infer<typeof dungeonLayoutSchema>;

/** R12：每一枚代币独立参与洗混；不靠未命名图标推断种类。 */
export const roomDistributionSchema = z
  .strictObject({
    questId: z.string().min(1),
    source: z.string().min(1),
    counts: z
      .array(
        z.strictObject({
          kind: z.enum(["empty", "dark", "curio", "lair", "trap", "treasure", "objective"]),
          count: z.int().positive(),
        }),
      )
      .min(1),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.counts.map((c) => c.kind)).size !== data.counts.length)
      ctx.addIssue({ code: "custom", message: "代币种类重复" });
  });
export type RoomDistribution = z.infer<typeof roomDistributionSchema>;
