import type { DungeonState } from "./dungeon";

type Hero = DungeonState["heroes"][number];
export function resolveHolders(
  d: Pick<DungeonState, "stagecoachHeroes">,
  heroes: readonly { readonly id: string; readonly resolveCardId?: string | null | undefined }[],
) {
  return [...heroes, ...(d.stagecoachHeroes ?? [])];
}

export function stagecoachProjections(heroes: readonly Hero[]) {
  return {
    conditions: heroes.map((h) => ({
      id: h.id,
      diseaseId: h.diseaseId ?? null,
      quirkIds: h.quirkIds ?? [],
    })),
    trinkets: heroes.map((h) => ({ id: h.id, level: h.level! })),
  };
}

/** 派生持牌投影必须与驿站完整记录一致，不能借投影藏牌或复制身份。 */
export function stagecoachHoldingsProblem(
  d: Pick<DungeonState, "heroes" | "stagecoachHeroes"> & {
    readonly conditions?: DungeonState["conditions"];
    readonly trinkets?: DungeonState["trinkets"];
  },
): string | null {
  const reserved = d.stagecoachHeroes ?? [];
  if (
    (d.conditions?.reservedHeroes !== undefined && !Array.isArray(d.conditions.reservedHeroes)) ||
    (d.trinkets?.reservedHeroes !== undefined && !Array.isArray(d.trinkets.reservedHeroes))
  )
    return "驿站持牌投影结构无效";
  if (
    !Array.isArray(reserved) ||
    [...d.heroes, ...reserved].some((h) => !h || typeof h.id !== "string" || !h.id)
  )
    return "驿站英雄身份结构无效";
  const ids = [...d.heroes, ...reserved].map((h) => h.id);
  if (
    new Set(ids).size !== ids.length ||
    reserved.some((h) => h.dead || ![1, 2, 3].includes(h.level!))
  )
    return "驿站英雄身份重复、仍死亡或等级无效（R-147）";
  const expected = stagecoachProjections(reserved);
  if (
    JSON.stringify(d.conditions?.reservedHeroes ?? []) !== JSON.stringify(expected.conditions) ||
    JSON.stringify(d.trinkets?.reservedHeroes ?? []) !== JSON.stringify(expected.trinkets)
  )
    return "驿站完整英雄与共享牌持有投影不一致（R-147/R-148）";
  return null;
}
