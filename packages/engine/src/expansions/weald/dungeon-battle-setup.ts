import { basicQuests } from "../../../../data/src/basic-quests";
import type { BattleSetup } from "../../battle";
import type { DungeonState } from "../../dungeon";
import type { WealdRoomTile } from "../../../../data/src/weald-room";
import {
  NECROTIC_FUNGUS_MONSTER_CARD,
  NECROTIC_FUNGUS_MONSTER_CARD_ID,
  necroticFungusEntitiesForTile,
} from "./necrotic-fungus";
import { wealdPackSelected, wealdRoomTileBattleAreas } from "./weald-mechanics";

/** 与怪物池校验一致；步骤 5 任务未登记时可用 monsterPool.location 识别 Weald 出征（步骤 2 目录接线）。 */
export function readDungeonExpeditionRegion(
  d: Pick<DungeonState, "questDistribution" | "monsterPool">,
): "ruins" | "weald" | "darkestDungeon" {
  const quest = basicQuests.find((q) => q.id === d.questDistribution?.questId);
  const questRegion =
    (quest as { readonly expeditionRegion?: string } | undefined)?.expeditionRegion ??
    quest?.expeditionRegion;
  if (questRegion === "darkestDungeon") return "darkestDungeon";
  if (questRegion === "weald") return "weald";
  if (d.monsterPool?.location === "weald") return "weald";
  return "ruins";
}

export function wealdBattleCreationEnabled(
  d: Pick<DungeonState, "contentPacks" | "questDistribution" | "monsterPool">,
  tile: Pick<WealdRoomTile, "location">,
): boolean {
  return (
    tile.location === "weald" &&
    wealdPackSelected(d.contentPacks) &&
    readDungeonExpeditionRegion(d) === "weald"
  );
}

/** 在已通过 createBattleState 入参校验的结构上，叠加 W-03／W-04 区域与真菌实体。 */
export function applyWealdBattleSetup<T extends BattleSetup>(
  setup: T,
  tile: WealdRoomTile,
  enableMechanics: boolean,
): T {
  const areas = wealdRoomTileBattleAreas(tile, { wealdMechanics: enableMechanics });
  if (!enableMechanics) return { ...setup, areas };
  const fungus = necroticFungusEntitiesForTile(tile);
  const monsters =
    fungus.length === 0 || setup.monsters?.some((m) => m.id === NECROTIC_FUNGUS_MONSTER_CARD_ID)
      ? setup.monsters
      : [...(setup.monsters ?? []), NECROTIC_FUNGUS_MONSTER_CARD];
  const entities = fungus.length ? [...fungus, ...setup.entities] : setup.entities;
  return {
    ...setup,
    wealdMechanics: true,
    areas,
    entities,
    monsters,
  };
}
