import { z } from "zod";
/** R-085：仅四张卡指定效果位置；不改全局词典，不代表运行时已接通。 */
export const approvedHamletEffectIcons = {
  "hamlet_event:p001": { d712688f15: "provisionDice" },
  "hamlet_event:p003": { d712688f15: "provisionDice" },
  "hamlet_event:p009": { "08a25c05cf": "gold" },
  "hamlet_event:p010": { d9009c6f91: "wound" },
} as const;
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
  runtime: z.enum([
    "none",
    "noCaretaker",
    "extraBlock",
    "removeDisease",
    "removeQuirks",
    "townFair",
    "laborForce",
    "unsettlingDarkness",
    "travelingMerchants",
    "guildTraining",
    "militiaTraining",
    "inGoodSpirits",
    "supplyRun",
    "gypsyTrail",
    "feast",
    "lostShipment",
    "unimplemented",
  ]),
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
