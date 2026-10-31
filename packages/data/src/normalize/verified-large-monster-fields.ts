import { z } from "zod";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { normalizedMonsterLargeCardSchema } from "./schema";
import type { NormalizedMonsterLargeCard } from "./schema";

const entrySchema = z.strictObject({
  id: z.string().regex(/^monster_large:p\d{3}$/),
  name: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  pages: z.array(z.int().positive()).min(1),
  speed: z.int().nonnegative(),
  stanceGroups: monsterStanceGroupsSchema,
});

/** Kyries 2026-10-12 批准 L2；M30 只是抽牌参考卡，不给它附战斗字段。R24、R-015、R-048。 */
export const verifiedLargeMonsterFields = z.array(entrySchema).parse([
  // C-017：当前版 Fanatic I p008 卡图；全部姿态同一 d10 表，Speed 为两枚脚印。
  {
    id: "monster_large:p008",
    name: "Fanatic",
    level: 1,
    pages: [8],
    speed: 2,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 2, skill: 1 },
          { min: 3, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
    ],
  },
  {
    id: "monster_large:p001",
    name: "Bone Captain",
    level: 2,
    pages: [1],
    speed: 1,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive"],
        rollTable: [
          { min: 1, max: 6, skill: 1 },
          { min: 7, max: 10, skill: 2 },
        ],
      },
      { stances: ["ranged", "support"], skill: 2 },
    ],
  },
  {
    id: "monster_large:p003",
    name: "Ghoul",
    level: 2,
    pages: [3],
    speed: 2,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged"],
        rollTable: [
          { min: 1, max: 4, skill: 1 },
          { min: 5, max: 7, skill: 2 },
          { min: 8, max: 10, skill: 3 },
        ],
      },
      {
        stances: ["support"],
        rollTable: [
          { min: 1, max: 5, skill: 2 },
          { min: 6, max: 10, skill: 3 },
        ],
      },
    ],
  },
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
  // Ruins II/III：独立核对 FRONT p006/007/009/010/012/013。
  {
    id: "monster_large:p006",
    name: "Prophet",
    level: 2,
    pages: [6],
    speed: 1,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
    ],
  },
  {
    id: "monster_large:p007",
    name: "Prophet",
    level: 3,
    pages: [7],
    speed: 1,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 2 },
        ],
      },
    ],
  },
  {
    id: "monster_large:p009",
    name: "Fanatic",
    level: 2,
    pages: [9],
    speed: 2,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 2, skill: 1 },
          { min: 3, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
    ],
  },
  {
    id: "monster_large:p010",
    name: "Fanatic",
    level: 3,
    pages: [10],
    speed: 3,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 2, skill: 1 },
          { min: 3, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
    ],
  },
  {
    id: "monster_large:p012",
    name: "Pyre",
    level: 2,
    pages: [12],
    speed: 0,
    stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
  },
  {
    id: "monster_large:p013",
    name: "Pyre",
    level: 3,
    pages: [13],
    speed: 0,
    stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
  },
  // Pyre I：完整 FRONT p011，无移动靴印，固定技能 1；本聊天批准自动命中。
  {
    id: "monster_large:p011",
    name: "Pyre",
    level: 1,
    pages: [11],
    speed: 0,
    stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
  },
  // 最终战 Ancestor 2 · FRONT p018；footer 与 Fanatic III（p010）同型 d10 分段 1–2 / 3–6 / 7–10 → slot 1–3。
  {
    id: "monster_large:p018",
    name: "Ancestor 2",
    level: 3,
    pages: [18],
    speed: 3,
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 2, skill: 1 },
          { min: 3, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
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
