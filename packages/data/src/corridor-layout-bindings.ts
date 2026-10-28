import { z } from "zod";

/** QuestMap 图边 ↔ 走廊段板块实例；无批准数据前全部为 pending。 */
export const corridorLayoutBindingSchema = z.strictObject({
  layoutId: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  corridorTileId: z.string().min(1).nullable(),
  status: z.enum(["pending", "confirmed"]),
  note: z.string().min(1).optional(),
});

export const corridorLayoutBindingFileSchema = z.strictObject({
  schema: z.literal("ddbg-corridor-layout-bindings-v0"),
  review: z.literal("pending"),
  bindings: z.array(corridorLayoutBindingSchema),
});

export type CorridorLayoutBinding = z.infer<typeof corridorLayoutBindingSchema>;

export function corridorBindingKey(from: string, to: string) {
  return JSON.stringify([from, to].sort());
}

export function lookupCorridorLayoutBinding(
  file: z.infer<typeof corridorLayoutBindingFileSchema>,
  layoutId: string,
  from: string,
  to: string,
): CorridorLayoutBinding | undefined {
  const key = corridorBindingKey(from, to);
  return file.bindings.find(
    (b) => b.layoutId === layoutId && corridorBindingKey(b.from, b.to) === key,
  );
}

/** 未入库绑定时返回显式 pending，不猜板块。 */
export function resolveCorridorLayoutBinding(
  file: z.infer<typeof corridorLayoutBindingFileSchema>,
  layoutId: string,
  from: string,
  to: string,
): CorridorLayoutBinding {
  return (
    lookupCorridorLayoutBinding(file, layoutId, from, to) ?? {
      layoutId,
      from,
      to,
      corridorTileId: null,
      status: "pending",
      note: "QuestMap 边 ↔ corridor_tile 映射未批（Q-45 / R-046）",
    }
  );
}
