import { z } from "zod";
export const hamletEventCardSchema = z.strictObject({
  id: z.string().regex(/^hamlet_event:p\d{3}$/),
  name: z.string().min(1),
  source: z.strictObject({ file: z.string().min(1), page: z.int().min(1).max(16) }),
  dayBadge: z.strictObject({
    iconId: z.string().regex(/^[a-f0-9]{10}$/),
    printed: z.enum(["1", "2", "3", "4", "?"]),
    status: z.enum(["pending", "confirmed"]),
    ruling: z.string().nullable(),
  }),
  days: z.int().min(1).max(4).nullable(),
  printedLines: z.array(z.string()).min(1),
  effectLines: z.array(z.string()),
  effectIconIds: z.array(z.string().regex(/^[a-f0-9]{10}$/)),
  permanentlyRemoved: z.boolean(),
  runtime: z.enum(["none", "noCaretaker", "extraBlock", "unimplemented"]),
});
export const hamletEventCatalogSchema = z
  .array(hamletEventCardSchema)
  .length(16)
  .superRefine((cards, ctx) => {
    if (
      new Set(cards.map((c) => c.id)).size !== 16 ||
      cards.some((c, i) => c.id !== `hamlet_event:p${String(i + 1).padStart(3, "0")}`)
    )
      ctx.addIssue({ code: "custom", message: "需要完整核心盒16张村庄事件，不能筛掉未实现卡" });
  });
export const hamletEventFileSchema = z.strictObject({
  schema: z.literal("ddbg-hamlet-event-v1"),
  cards: hamletEventCatalogSchema,
});
export type HamletEventCard = z.infer<typeof hamletEventCardSchema>;
