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
    return ancestorGlory(areas, e) ? removeAncestorConditions(e) : e;
  });
}

export function removeAncestorConditions(entity: BattleEntity): BattleEntity {
  if (entity.statusStacks === undefined)
    return { ...entity, bleed: [], blight: [], debuffStacks: 0, markStacks: 0 };
  const stacks = entity.statusStacks.filter((s) => !ANCESTOR_CONDITIONS.includes(s.kind));
  return { ...entity, statusStacks: stacks, ...statusProjection(stacks, entity.innateProtection) };
}
