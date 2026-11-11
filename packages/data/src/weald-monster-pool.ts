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
