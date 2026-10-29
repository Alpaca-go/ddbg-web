import { z } from "zod";
import { normalizedMonsterMediumCardSchema } from "./schema";
import type { NormalizedMonsterMediumCard } from "./schema";

const entrySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2)]),
  pages: z.array(z.int().positive()).min(1),
  speed: z.int().nonnegative(),
});

// 首批六条：Kyries 2026-10-10；新增八张中型战斗卡：Kyries 2026-10-12 两批批准。
// docs/monster-speed-review-2026-10-09.md §2–3、§6；R24、R-001、R-048。
// 只按获批 id 附加，不统计图标、不填图标 null、不跨同名 / 等级推断。
export const verifiedMonsterSpeeds = z.array(entrySchema).parse([
  { id: "monster_medium:p001", name: "Bone Soldier", level: 1, pages: [1, 2, 3], speed: 1 },
  { id: "monster_medium:p004", name: "Bone Courtier", level: 1, pages: [4, 5, 6], speed: 3 },
  { id: "monster_medium:p007", name: "Bone Arbalist", level: 1, pages: [7, 8, 9], speed: 2 },
  { id: "monster_medium:p010", name: "Bone Defender", level: 1, pages: [10, 11], speed: 1 },
  { id: "monster_medium:p040", name: "Bone Rabble", level: 1, pages: [40, 41, 42], speed: 1 },
  { id: "monster_medium:p021", name: "Cultist Acolyte", level: 1, pages: [21, 22, 23], speed: 3 },
  // docs/monster-battle-review-2026-10-12.md：第一批部分批准。
  { id: "monster_medium:p027", name: "Brigand Fusilier", level: 1, pages: [27, 28, 29], speed: 2 },
  { id: "monster_medium:p031", name: "Maggot", level: 1, pages: [31, 32, 33], speed: 1 },
  { id: "monster_medium:p043", name: "Madman", level: 1, pages: [43, 44, 45], speed: 3 },
  { id: "monster_medium:p046", name: "Pliskin", level: 1, pages: [46, 47, 48], speed: 2 },
  // Kyries 2026-10-12 再审批准四条修正版；头部靴印数量，不是 Dodge 数字。
  { id: "monster_medium:p018", name: "Cultist Brawler", level: 1, pages: [18, 19, 20], speed: 2 },
  { id: "monster_medium:p024", name: "Brigand Cutthroat", level: 1, pages: [24, 25, 26], speed: 1 },
  { id: "monster_medium:p034", name: "Webber", level: 1, pages: [34, 35, 36], speed: 2 },
  { id: "monster_medium:p037", name: "Spitter", level: 1, pages: [37, 38, 39], speed: 1 },
  // R-082：Kyries 2026-10-15仅批准Bone Spearman II，完整M13–15已核图。
  { id: "monster_medium:p013", name: "Bone Spearman", level: 2, pages: [13, 14, 15], speed: 2 },
  // R-083：2026-10-15四卡限定表获批。
  { id: "monster_medium:p050", name: "Gargoyle", level: 2, pages: [50, 51, 52], speed: 3 },
  { id: "monster_medium:p053", name: "Rattler", level: 2, pages: [53, 54, 55], speed: 3 },
  // C-012：当前版核心盒 FRONT p089，三枚脚印；仅 Necromancer I。
  { id: "monster_medium:p089", name: "Necromancer", level: 1, pages: [89], speed: 3 },
]);

/** 仅生成管线加载人工获批映射；schema 可表达的值不代表已获批准。 */
export function attachVerifiedMonsterSpeeds(
  cards: readonly NormalizedMonsterMediumCard[],
  entries: unknown = verifiedMonsterSpeeds,
): NormalizedMonsterMediumCard[] {
  const approved = z.array(entrySchema).parse(entries);
  const seen = new Set<string>();
  for (const entry of approved) {
    if (seen.has(entry.id)) throw new Error(`重复的 Speed 映射 id：${entry.id}`);
    seen.add(entry.id);
    const matches = cards.filter((card) => card.id === entry.id);
    if (matches.length !== 1) throw new Error(`Speed 映射 id 必须唯一存在：${entry.id}`);
    const card = matches[0]!;
    if (!("skills" in card)) throw new Error(`Speed 映射不能用于大型参考卡：${entry.id}`);
    if (
      card.name !== entry.name ||
      card.level !== entry.level ||
      JSON.stringify(card.pages) !== JSON.stringify(entry.pages)
    )
      throw new Error(`Speed 映射的卡名 / 等级 / 页码不符：${entry.id}`);
    if (card.speed !== undefined && card.speed !== entry.speed)
      throw new Error(`Speed 映射与既有数值冲突：${entry.id}`);
  }
  const byId = new Map(approved.map((entry) => [entry.id, entry.speed]));
  return cards.map((card) => {
    const speed = byId.get(card.id);
    return speed !== undefined ? normalizedMonsterMediumCardSchema.parse({ ...card, speed }) : card;
  });
}
