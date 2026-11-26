import { z } from "zod";

/** 包属按桌游组件划分；英雄及其技能不受包选择限制（Kyries 2026-11-11）。 */
export const CONTENT_PACK_IDS = ["core", "weald", "warrens", "cove"] as const;
export type ContentPackId = (typeof CONTENT_PACK_IDS)[number];
export const contentPacksSchema = z
  .array(z.enum(CONTENT_PACK_IDS))
  .min(1)
  .refine(
    (packs) => packs.includes("core") && new Set(packs).size === packs.length,
    "核心包必须启用，内容包不能重复",
  );
export const CONTENT_PACKS = [
  { id: "core", name: "核心包", description: "遗迹与最暗地牢" },
  {
    id: "weald",
    name: "Weald",
    description: "I–III 级普通任务与三位 Boss；Stygian 地点布置待开放",
  },
  {
    id: "warrens",
    name: "Warrens",
    description: "Swine Prince I、The Flesh I；地点战役尚未开放",
  },
  { id: "cove", name: "Cove", description: "Siren I；地点战役尚未开放" },
] as const;

/** R-214：最终战的补印 Reflection 属于核心盒，只登记两张已核实的卡。 */
const CORE_MONSTER_SUPPLEMENT_IDS: ReadonlySet<string> = new Set([
  "monster_medium:ADD_014:p001",
  "monster_medium:ADD_014:p003",
]);

export function isCoreMonsterSupplementId(id: string): boolean {
  return CORE_MONSTER_SUPPLEMENT_IDS.has(id);
}

/** 非英雄内容按包命名空间归属；英雄和技能是跨包共享目录。 */
export function cardContentPack(card: {
  readonly id: string;
  readonly hero?: string | null;
}): ContentPackId {
  if (card.id.startsWith("hero_skill:") || card.id.startsWith("hero_stat:")) return "core";
  const namespace = card.id.split(":")[1];
  if (CONTENT_PACK_IDS.includes(namespace as ContentPackId)) return namespace as ContentPackId;
  if (namespace === "ruins" || namespace === "darkest") return "core";
  if (/^p\d+$/.test(namespace ?? "")) return "core";
  if (isCoreMonsterSupplementId(card.id)) return "core";
  throw new Error(`未登记的内容包命名空间：${card.id}`);
}

export function bossEnabledForPacks(packs: readonly ContentPackId[] | undefined, scriptId: string) {
  if (packs === undefined) return true;
  const namespace = scriptId.split(":")[1];
  if (namespace === "ruins" || namespace === "darkest") return true;
  return (
    CONTENT_PACK_IDS.includes(namespace as ContentPackId) &&
    packs.includes(namespace as ContentPackId)
  );
}

/** 缺省只供旧档/历史沙盒沿用；新战役显式写入选择，核心包不可取消。 */
export function packEnabled(packs: readonly ContentPackId[] | undefined, pack: ContentPackId) {
  return packs === undefined || packs.includes(pack);
}

export function normalizeContentPacks(packs: readonly ContentPackId[]): ContentPackId[] {
  const checked = contentPacksSchema.parse(packs);
  return CONTENT_PACK_IDS.filter((pack) => checked.includes(pack));
}
