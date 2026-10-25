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
          kind: z.enum(["start", "room", "dot", "unresolved"]),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(2),
    edges: z.array(z.tuple([z.string(), z.string()])),
    unresolvedMarkers: z
      .array(z.strictObject({ nodeId: z.string(), observation: z.string(), semantic: z.null() }))
      .optional(),
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
      if (layout.edges.filter((e) => e.includes(n.id)).length < 2) fail("灰点必须连接至少两段走廊");
    }
    if (layout.unresolvedMarkers?.some((m) => !ids.has(m.nodeId))) fail("未解释标记引用未知节点");
  });
export type DungeonLayout = z.infer<typeof dungeonLayoutSchema>;
export const dungeonLayoutFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-dungeon-layouts-v1"),
    layouts: z.array(dungeonLayoutSchema).min(1),
  })
  .superRefine((file, ctx) => {
    if (
      new Set(file.layouts.map((l) => l.id)).size !== file.layouts.length ||
      new Set(file.layouts.map((l) => l.source.page)).size !== file.layouts.length
    )
      ctx.addIssue({ code: "custom", message: "地图 ID / 来源页重复" });
  });

/** R12：每一枚代币独立参与洗混；不靠未命名图标推断种类。 */
export const roomTokenKindSchema = z.enum([
  "empty",
  "dark",
  "curio",
  "lair",
  "trap",
  "treasure",
  "objective",
]);
export type RoomTokenKind = z.infer<typeof roomTokenKindSchema>;

/** Forward Camps 等卡面「?」槽：仅非 Objective 五类（印刷底栏 dark/curio/treasure/lair/trap）。 */
export const randomNonObjectiveRoomKinds: readonly RoomTokenKind[] = [
  "dark",
  "curio",
  "treasure",
  "lair",
  "trap",
];

export const roomDistributionSchema = z
  .strictObject({
    questId: z.string().min(1),
    source: z.string().min(1),
    counts: z
      .array(
        z.strictObject({
          kind: roomTokenKindSchema,
          count: z.int().positive(),
        }),
      )
      .min(1),
    /** 印刷底栏 `?` 枚数；建局时自实体池展开（Q-112b / R-112），展开后不再保留此字段。 */
    randomizeNonObjective: z.int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (new Set(data.counts.map((c) => c.kind)).size !== data.counts.length)
      ctx.addIssue({ code: "custom", message: "代币种类重复" });
    if (data.randomizeNonObjective && data.counts.some((c) => c.kind === "objective"))
      ctx.addIssue({ code: "custom", message: "randomizeNonObjective 与固定 objective 代币冲突" });
  });
export type RoomDistribution = z.infer<typeof roomDistributionSchema>;

export function roomDistributionTokenTotal(
  distribution: Pick<RoomDistribution, "counts" | "randomizeNonObjective">,
) {
  const fixed = distribution.counts.reduce((n, c) => n + c.count, 0);
  return fixed + (distribution.randomizeNonObjective ?? 0);
}

/** 未展开的模板（仍含 ? 槽）拒出征；建局路径须先 expandRoomDistributionForEmbark（R-112）。 */
export function roomDistributionEmbarkBlockReason(
  distribution: Pick<RoomDistribution, "questId" | "randomizeNonObjective">,
): string | null {
  const n = distribution.randomizeNonObjective;
  if (!n) return null;
  return `任务 ${distribution.questId}：底栏 ?×${n}（randomize non-Objective）尚未建局展开（Q-112b / R-112），拒出征`;
}
