import { z } from "zod";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { normalizedMonsterLargeCardSchema } from "./schema";
import type { NormalizedMonsterLargeCard } from "./schema";

const entrySchema = z.strictObject({
  id: z.string().regex(/^monster_large:p\d{3}$/),
  name: z.string().min(1),
  level: z.literal(1),
  pages: z.array(z.int().positive()).min(1),
  speed: z.int().nonnegative(),
  stanceGroups: monsterStanceGroupsSchema,
});

/** Kyries 2026-10-12 批准 L2；M30 只是抽牌参考卡，不给它附战斗字段。R24、R-015、R-048。 */
export const verifiedLargeMonsterFields = z.array(entrySchema).parse([
  {
    id: "monster_large:p002",
    name: "Brigand Bloodletter",
    level: 1,
    pages: [2],
    speed: 1,
    stanceGroups: [
      {
        stances: ["aggressive"],
        rollTable: [
          { min: 1, max: 4, skill: 1 },
          { min: 5, max: 8, skill: 2 },
          { min: 9, max: 10, skill: 3 },
        ],
      },
      {
        stances: ["defensive"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
      { stances: ["ranged", "support"], skill: 2 },
    ],
  },
]);

export function attachVerifiedLargeMonsterFields(
  cards: readonly NormalizedMonsterLargeCard[],
  entries: unknown = verifiedLargeMonsterFields,
): NormalizedMonsterLargeCard[] {
  const approved = z.array(entrySchema).parse(entries),
    seen = new Set<string>();
  for (const entry of approved) {
    if (seen.has(entry.id)) throw new Error(`重复的大型怪物映射：${entry.id}`);
    seen.add(entry.id);
    const matches = cards.filter((c) => c.id === entry.id);
    if (matches.length !== 1) throw new Error(`大型怪物映射必须唯一存在：${entry.id}`);
    const card = matches[0]!;
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages) ||
      !card.type_position_tags.includes("Large")
    )
      throw new Error(`大型怪物映射卡名 / 等级 / 页码 / Large 不符：${entry.id}`);
    if (
      (card.speed !== undefined && card.speed !== entry.speed) ||
      (card.stanceGroups !== undefined &&
        JSON.stringify(card.stanceGroups) !== JSON.stringify(entry.stanceGroups))
    )
      throw new Error(`大型怪物映射与既有字段冲突：${entry.id}`);
  }
  return cards.map((card) => {
    const entry = approved.find((e) => e.id === card.id);
    return entry
      ? normalizedMonsterLargeCardSchema.parse({
          ...card,
          speed: entry.speed,
          stanceGroups: entry.stanceGroups,
        })
      : card;
  });
}
