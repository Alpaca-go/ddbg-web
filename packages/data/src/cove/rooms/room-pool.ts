import { z } from "zod";
import { coveNormalRoomCardSchema, type CoveRoomCard } from "./room";

/** 九张普通房进入出征房间牌堆；Boss 房须由 bossRoomSources 另行携带。 */
export const coveExpeditionRoomPoolSchema = z
  .array(coveNormalRoomCardSchema)
  .length(9)
  .superRefine((cards, ctx) => {
    const numbers = cards.map((card) => card.number).sort((a, b) => a - b);
    if (numbers.join(",") !== "1,2,3,4,5,6,7,8,9")
      ctx.addIssue({ code: "custom", message: "Cove 房间牌堆必须完整覆盖 room:cove:01–09" });
    if (new Set(cards.map((card) => card.id)).size !== 9)
      ctx.addIssue({ code: "custom", message: "Cove 普通房间不可重复" });
  });

export function coveExpeditionRoomPool(rooms: readonly CoveRoomCard[]): CoveRoomCard[] {
  const pool = [...rooms];
  if (pool.some((card) => card.boss))
    throw new Error("Cove 房间牌堆不得混入 Boss 房；Boss 来源单独登记");
  return coveExpeditionRoomPoolSchema.parse(pool);
}
