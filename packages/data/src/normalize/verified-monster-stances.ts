import { z } from "zod";
import { monsterStanceGroupsSchema } from "./monster-stance";
import { normalizedMonsterMediumCardSchema } from "./schema";
import type { NormalizedMonsterMediumCard } from "./schema";

const entrySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2)]),
  pages: z.array(z.int().positive()).min(1),
  stanceGroups: monsterStanceGroupsSchema,
});

// 首批六条：Kyries 2026-10-09；新增八张中型卡：2026-10-12 两批批准。
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
  // Kyries 2026-10-12 部分批准，见 docs/monster-battle-review-2026-10-12.md。
  {
    id: "monster_medium:p027",
    name: "Brigand Fusilier",
    level: 1,
    pages: [27, 28, 29],
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 2 },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  {
    id: "monster_medium:p031",
    name: "Maggot",
    level: 1,
    pages: [31, 32, 33],
    stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
  },
  {
    id: "monster_medium:p043",
    name: "Madman",
    level: 1,
    pages: [43, 44, 45],
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
    id: "monster_medium:p046",
    name: "Pliskin",
    level: 1,
    pages: [46, 47, 48],
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 2 },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  // Kyries 2026-10-12 再审批准的四条修正版。
  {
    id: "monster_medium:p018",
    name: "Cultist Brawler",
    level: 1,
    pages: [18, 19, 20],
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 1 },
      { stances: ["ranged", "support"], skill: 2 },
    ],
  },
  {
    id: "monster_medium:p024",
    name: "Brigand Cutthroat",
    level: 1,
    pages: [24, 25, 26],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive"],
        rollTable: [
          { min: 1, max: 4, skill: 2 },
          { min: 5, max: 10, skill: 1 },
        ],
      },
      { stances: ["ranged"], skill: 1 },
      { stances: ["support"], skill: 3 },
    ],
  },
  {
    id: "monster_medium:p034",
    name: "Webber",
    level: 1,
    pages: [34, 35, 36],
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
    id: "monster_medium:p037",
    name: "Spitter",
    level: 1,
    pages: [37, 38, 39],
    stanceGroups: [
      { stances: ["aggressive", "defensive"], skill: 2 },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  // R-082：限定M13–15，不扩展其他II级或大型参考卡。
  {
    id: "monster_medium:p013",
    name: "Bone Spearman",
    level: 2,
    pages: [13, 14, 15],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive"],
        rollTable: [
          { min: 1, max: 5, skill: 2 },
          { min: 6, max: 10, skill: 1 },
        ],
      },
      { stances: ["ranged", "support"], skill: 1 },
    ],
  },
  {
    id: "monster_medium:p050",
    name: "Gargoyle",
    level: 2,
    pages: [50, 51, 52],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged"],
        rollTable: [
          { min: 1, max: 6, skill: 1 },
          { min: 7, max: 10, skill: 2 },
        ],
      },
      { stances: ["support"], skill: 2 },
    ],
  },
  {
    id: "monster_medium:p053",
    name: "Rattler",
    level: 2,
    pages: [53, 54, 55],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged"],
        rollTable: [
          { min: 1, max: 5, skill: 2 },
          { min: 6, max: 10, skill: 1 },
        ],
      },
      {
        stances: ["support"],
        rollTable: [
          { min: 1, max: 5, skill: 1 },
          { min: 6, max: 10, skill: 3 },
        ],
      },
    ],
  },
  // C-012：当前版 FRONT p089，四姿态共用完整 d10 表。
  {
    id: "monster_medium:p089",
    name: "Necromancer",
    level: 1,
    pages: [89],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 3, skill: 1 },
          { min: 4, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
        ],
      },
    ],
  },
  // C-019：当前版 FRONT p090 独立核图，四姿态完整 d10 表。
  {
    id: "monster_medium:p090",
    name: "Necromancer",
    level: 2,
    pages: [90],
    stanceGroups: [
      {
        stances: ["aggressive", "defensive", "ranged", "support"],
        rollTable: [
          { min: 1, max: 3, skill: 1 },
          { min: 4, max: 6, skill: 2 },
          { min: 7, max: 10, skill: 3 },
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
