import { z } from "zod";

const instanceSchema = z.strictObject({
  instanceId: z.string(),
  cardId: z.string(),
  edge: z.enum(["front", "back"]),
  stanceSlots: z.union([z.literal(1), z.literal(2)]),
  verified: z.literal(true),
});

/** R-230/R-232：medium p1–14 是实体，大型板只提供战斗引用。 */
export const wealdLevelOneMonsterInstancesSchema = z
  .array(instanceSchema)
  .length(14)
  .superRefine((instances, ctx) => {
    const expected: ReadonlyMap<
      string,
      { readonly cardId: string; readonly edge: string; readonly stanceSlots: number }
    > = new Map(
      Array.from({ length: 14 }, (_, i) => {
        const page = i + 1;
        const large = page === 4 || page === 5;
        const start = page <= 3 ? 1 : page <= 5 ? 1 : page <= 8 ? 6 : page <= 11 ? 9 : 12;
        return [
          `monster-deck:weald:p${String(page).padStart(3, "0")}`,
          {
            cardId: `monster_${large ? "large" : "medium"}:weald:p${String(start).padStart(3, "0")}`,
            edge: page >= 12 ? "back" : "front",
            stanceSlots: large ? 2 : 1,
          },
        ] as const;
      }),
    );
    if (
      new Set(instances.map((entry) => entry.instanceId)).size !== 14 ||
      instances.some((entry) => {
        const card = expected.get(entry.instanceId);
        return (
          !card ||
          card.cardId !== entry.cardId ||
          card.edge !== entry.edge ||
          card.stanceSlots !== entry.stanceSlots
        );
      })
    )
      ctx.addIssue({ code: "custom", message: "Weald I 级实体、副本或部署身份不符" });
  });
export type WealdLevelOneMonsterInstance = z.infer<typeof instanceSchema>;

/** R-263／R-264：高等级独立实体清单，不能由任意快照自报牌堆身份。 */
export function wealdHigherMonsterInstancesSchema(level: 2 | 3) {
  if (level !== 2 && level !== 3) throw new Error("Weald 高等级仅支持 II／III");
  const pages = level === 2 ? [15, 16, 17] : [18, 19];
  return z
    .array(instanceSchema)
    .length(pages.length)
    .superRefine((rows, ctx) => {
      const expected = pages.map((page) => ({
        instanceId: `monster-deck:weald:p${String(page).padStart(3, "0")}`,
        cardId:
          page === 17
            ? "monster_large:weald:p003"
            : `monster_medium:weald:p0${level === 2 ? 15 : 18}`,
        edge: page === 17 ? "front" : "back",
        stanceSlots: page === 17 ? 2 : 1,
        verified: true,
      }));
      if (
        new Set(rows.map((r) => r.instanceId)).size !== pages.length ||
        expected.some(
          (e) =>
            !rows.some(
              (r) =>
                r.instanceId === e.instanceId &&
                r.cardId === e.cardId &&
                r.edge === e.edge &&
                r.stanceSlots === e.stanceSlots,
            ),
        )
      )
        ctx.addIssue({ code: "custom", message: "Weald 高等级实体、副本或部署身份不符" });
    });
}
