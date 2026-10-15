import { z } from "zod";

export const MONSTER_POOL_FRONT =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_monsters_medium_FRONT.pdf";
export const MONSTER_POOL_BACK =
  "02_DD_CARDS_COREBOX/DD_EN_COREBOX_CARDS_70_120_monsters_medium_BACK.pdf";

// 核对当前版 FRONT/BACK p1–62：其后为最暗地牢、Boss / 召唤物，不混入 R10 牌堆。
export function monsterPoolIdentity(page: number) {
  return {
    location: page <= 17 ? ("ruins" as const) : ("common" as const),
    level:
      page <= 11 || (page >= 18 && page <= 48)
        ? 1
        : page <= 15 || (page >= 49 && page <= 55)
          ? 2
          : 3,
  };
}

const cardSchema = z.strictObject({
  id: z.string().min(1),
  combatCardId: z.string().min(1),
  name: z.string().min(1),
  location: z.enum(["common", "ruins"]),
  level: z.int().min(1).max(3),
  pages: z.array(z.int().min(1).max(62)).min(1),
  edge: z.enum(["front", "back"]),
  stanceSlots: z.union([z.literal(1), z.literal(2)]),
  missingBattleFields: z.array(z.enum(["speed", "stanceGroups", "unverifiedIcons"])),
});

export const monsterPoolCatalogSchema = z
  .array(cardSchema)
  .length(24)
  .superRefine((cards, ctx) => {
    const pages = cards.flatMap((card) => card.pages);
    if (
      pages.length !== 62 ||
      new Set(pages).size !== 62 ||
      new Set(cards.map((c) => c.id)).size !== 24
    )
      ctx.addIssue({
        code: "custom",
        message: "Common + Ruins 必须覆盖 62 张实际卡，不能截断或重复",
      });
    const large = new Map([
      [12, 1],
      [30, 2],
      [49, 3],
      [62, 4],
    ]);
    const starts = [
      1, 4, 7, 10, 12, 13, 16, 18, 21, 24, 27, 30, 31, 34, 37, 40, 43, 46, 49, 50, 53, 56, 59, 62,
      63,
    ];
    const back = new Set([4, 7, 16, 21, 27, 34, 37, 43, 59]);
    for (const card of cards) {
      const first = card.pages[0]!;
      const largePage = large.get(first);
      if (
        card.id !== `monster_medium:p${String(first).padStart(3, "0")}` ||
        card.combatCardId !== (largePage ? `monster_large:p00${largePage}` : card.id) ||
        card.stanceSlots !== (largePage ? 2 : 1) ||
        !starts.includes(first) ||
        card.pages.length !== starts[starts.indexOf(first) + 1]! - first ||
        card.edge !== (back.has(first) ? "back" : "front") ||
        card.pages.some((page, i) => {
          const identity = monsterPoolIdentity(page);
          return (
            page !== first + i ||
            identity.location !== card.location ||
            identity.level !== card.level
          );
        })
      )
        ctx.addIssue({ code: "custom", message: "怪物身份、等级或大型战斗卡对应不一致" });
    }
  });
export const monsterPoolFileSchema = z.strictObject({
  schema: z.literal("ddbg-monster-pool-v1"),
  source: z.strictObject({
    front: z.literal(MONSTER_POOL_FRONT),
    back: z.literal(MONSTER_POOL_BACK),
  }),
  cards: monsterPoolCatalogSchema,
});
export type MonsterPoolCard = z.infer<typeof cardSchema>;

/** 一张印刷卡 = 一个实例；大型战斗卡不是牌堆的额外一份（R17）。 */
export function ruinsMonsterPool(catalog: readonly MonsterPoolCard[], level: number) {
  if (![1, 2, 3].includes(level)) throw new Error("怪物牌堆等级无效");
  return monsterPoolCatalogSchema
    .parse(catalog)
    .filter((c) => c.level === level)
    .flatMap((card) =>
      card.pages.map((page) => ({
        instanceId: `monster-deck:p${String(page).padStart(3, "0")}`,
        cardId: card.combatCardId,
        edge: card.edge,
        stanceSlots: card.stanceSlots,
        verified: true as const,
      })),
    );
}

/** R35 / R-037：地牢怪物牌堆 = 1..当前战役等级累加。 */
export function ruinsMonsterPoolThrough(catalog: readonly MonsterPoolCard[], maxLevel: number) {
  if (![1, 2, 3].includes(maxLevel)) throw new Error("怪物牌堆等级无效");
  return [1, 2, 3]
    .filter((level) => level <= maxLevel)
    .flatMap((level) => ruinsMonsterPool(catalog, level));
}
