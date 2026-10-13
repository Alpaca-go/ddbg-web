import type { BattleArea, BattleEntity } from "./battle";
import { statusProjection } from "./status";
import type { StatusKind } from "./status";

export const ANCESTOR_CONDITIONS: readonly StatusKind[] = [
  "blight",
  "bleed",
  "debuff",
  "stun",
  "mark",
];
/** R-065/067：仅当前区域中的英雄；不把免疫存入角色，离区自然失效。 */
export function ancestorGlory(
  areas: readonly BattleArea[],
  entity: { readonly side?: string; readonly areaId?: string },
): boolean {
  return entity.side === "hero" && areas.some((a) => a.id === entity.areaId && a.ancestorGlory);
}
export function clearAncestorConditions(
  areas: readonly BattleArea[],
  entities: readonly BattleEntity[],
): readonly BattleEntity[] {
  return entities.map((e) => {
    if (!ancestorGlory(areas, e)) return e;
    if (e.statusStacks === undefined)
      return { ...e, bleed: [], blight: [], debuffStacks: 0, markStacks: 0 };
    const stacks = e.statusStacks.filter((s) => !ANCESTOR_CONDITIONS.includes(s.kind));
    return { ...e, statusStacks: stacks, ...statusProjection(stacks, e.innateProtection) };
  });
}
