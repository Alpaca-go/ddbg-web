import { z } from "zod";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { normalizedMonsterMediumCardSchema } from "./schema";
import type { NormalizedMonsterMediumCard } from "./schema";

const entrySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.literal(1),
  pages: z.array(z.int().positive()).min(1),
  stanceGroups: monsterStanceGroupsSchema,
});

// Kyries 于 2026-10-09 审核并确认全部六条。
// docs/monster-stance-review-2026-10-09.md §3–4、§7；R-015、R-048。
// 页码均为当前版核心盒 monsters_medium_FRONT.pdf，不跨同名 / 等级推断。
export const verifiedMonsterStances = z.array(entrySchema).parse([
  {
    id: "monster_medium:p001",
    name: "Bone Soldier",
    level: 1,
    pages: [1, 2, 3],
    stanceGroups: [
      { stances: ["aggressive", "defensive", "ranged"], skill: 1 },
      { stances: ["support"], skill: 2 },
    ],
  },
  {
    id: "monster_medium:p004",
    name: "Bone Courtier",
    level: 1,
    pages: [4, 5, 6],
    stanceGroups: [
      { stances: ["aggressive"], skill: 2 },
      {
        stances: ["defensive"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  {
    id: "monster_medium:p007",
    name: "Bone Arbalist",
    level: 1,
    pages: [7, 8, 9],
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 2 },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  {
    id: "monster_medium:p010",
    name: "Bone Defender",
    level: 1,
    pages: [10, 11],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive"],
        rollTable: [
          { min: 1, max: 5, skill: 2 },
          { min: 6, max: 10, skill: 1 },
        ],
      },
      { stances: ["ranged", "support"], skill: 3 },
    ],
  },
  {
    id: "monster_medium:p040",
    name: "Bone Rabble",
    level: 1,
    pages: [40, 41, 42],
    stanceGroups: [
      { stances: ["aggressive", "defensive", "ranged"], skill: 1 },
      { stances: ["support"], skill: 2 },
    ],
  },
  {
    id: "monster_medium:p021",
    name: "Cultist Acolyte",
    level: 1,
    pages: [21, 22, 23],
    stanceGroups: [
      {
        stances: ["aggressive"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 3 },
        ],
      },
      {
        stances: ["defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 4, skill: 1 },
          { min: 5, max: 7, skill: 2 },
          { min: 8, max: 10, skill: 3 },
        ],
      },
    ],
  },
]);

/** 仅生成管线加载获批映射；结构验证不替代人工批准。 */
export function attachVerifiedMonsterStances(
  cards: readonly NormalizedMonsterMediumCard[],
  entries: unknown = verifiedMonsterStances,
): NormalizedMonsterMediumCard[] {
  const approved = z.array(entrySchema).parse(entries);
  const seen = new Set<string>();
  for (const entry of approved) {
    if (seen.has(entry.id)) throw new Error(`重复的姿态映射 id：${entry.id}`);
    seen.add(entry.id);
    const matches = cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1) throw new Error(`姿态映射 id 必须唯一存在：${entry.id}`);
    const card = matches[0]!;
    if (!("skills" in card)) throw new Error(`姿态映射不能用于大型参考卡：${entry.id}`);
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages)
    )
      throw new Error(`姿态映射的卡名 / 等级 / 页码不符：${entry.id}`);
  }
  const byId = new Map(approved.map((entry) => [entry.id, entry.stanceGroups]));
  return cards.map((card) => {
    const stanceGroups = byId.get(card.id);
    return stanceGroups ? normalizedMonsterMediumCardSchema.parse({ ...card, stanceGroups }) : card;
  });
}
