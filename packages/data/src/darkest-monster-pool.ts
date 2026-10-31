import { z } from "zod";
import { MONSTER_POOL_FRONT, MONSTER_POOL_BACK } from "./monster-pool";

/** 当前印刷普通最暗牌组 M63–88；M89 起为 Boss/召唤物，不进普通堆。 */
export const DARKEST_MONSTER_IDENTITIES = [
  { first: 63, last: 65, name: "Ascended Brawler", edge: "front" },
  { first: 66, last: 68, name: "Ascended Witch", edge: "back" },
  { first: 69, last: 71, name: "Rapturous Cultist", edge: "front" },
  { first: 72, last: 74, name: "Cultist Priest", edge: "back" },
  { first: 75, last: 77, name: "Malignant Growth", edge: "front" },
  { first: 78, last: 79, name: "Flesh Hound", edge: "front" },
  { first: 80, last: 82, name: "Polyp", edge: "back" },
  { first: 83, last: 85, name: "Antibody", edge: "front" },
  { first: 86, last: 88, name: "Defensive Growth", edge: "back" },
] as const;

export const darkestMonsterPoolFileSchema = z
  .strictObject({
    schema: z.literal("ddbg-darkest-monster-pool-v1"),
    source: z.strictObject({
      front: z.literal(MONSTER_POOL_FRONT),
      back: z.literal(MONSTER_POOL_BACK),
    }),
    cards: z
      .array(
        z.strictObject({
          id: z.string(),
          combatCardId: z.string(),
          name: z.string(),
          location: z.literal("darkestDungeon"),
          level: z.literal(3),
          pages: z.array(z.int().min(63).max(88)),
          edge: z.enum(["front", "back"]),
          stanceSlots: z.literal(1),
          missingBattleFields: z.array(z.enum(["speed", "stanceGroups", "unverifiedIcons"])),
          /** 整卡图标可命名不等于选招/所有技能已获批，数据入库不解锁战斗。 */
          battleReady: z.literal(false),
        }),
      )
      .length(9),
  })
  .superRefine((file, ctx) => {
    for (const identity of DARKEST_MONSTER_IDENTITIES) {
      const id = `monster_medium:p${String(identity.first).padStart(3, "0")}`;
      const matches = file.cards.filter((c) => c.id === id);
      const card = matches[0];
      if (
        matches.length !== 1 ||
        !card ||
        card.combatCardId !== id ||
        card.name !== identity.name ||
        card.edge !== identity.edge ||
        card.pages.length !== identity.last - identity.first + 1 ||
        card.pages.some((page, i) => page !== identity.first + i)
      )
        ctx.addIssue({ code: "custom", message: `最暗怪物身份/页组/份数不一致：${id}` });
    }
  });

export type DarkestMonsterPoolFile = z.infer<typeof darkestMonsterPoolFileSchema>;

/** 只展开实体卡身份；不提供 SpawnCard 的 verified 标记，不据此开放遭遇。 */
export function darkestDungeonMonsterInstances(input: DarkestMonsterPoolFile) {
  return darkestMonsterPoolFileSchema.parse(input).cards.flatMap((card) =>
    card.pages.map((page) => ({
      instanceId: `monster-deck:p${String(page).padStart(3, "0")}`,
      cardId: card.combatCardId,
      edge: card.edge,
      stanceSlots: card.stanceSlots,
    })),
  );
}
