import { buildWealdMonsterCatalog } from "./monster-catalog";
import { buildWealdHigherMonsterCatalog } from "./higher-monster-catalog";
import mediumFile from "../../../data/normalized/extension/weald/monster_medium.json";
import largeFile from "../../../data/normalized/extension/weald/monster_large.json";
export function buildWealdTaskMonsterCatalog(medium: unknown, large: unknown) {
  return [
    ...buildWealdMonsterCatalog(medium, large),
    ...buildWealdHigherMonsterCatalog(2),
    ...buildWealdHigherMonsterCatalog(3),
  ];
}
export function approvedWealdTaskMonster(id: string) {
  return buildWealdTaskMonsterCatalog(mediumFile, largeFile).find((c) => c.id === id);
}
