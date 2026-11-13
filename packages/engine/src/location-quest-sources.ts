import { type CurioCard } from "../../data/src/curio";
import { locationCurioPool } from "../../data/src/curio-pool";
import { rebuildCoreQuestDecks } from "./core-quest-decks";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import type { ContentPackId } from "./content-packs";
import { sourcesForContentPacks } from "./content-packs";
import { buildWealdMonsterCatalog } from "./expansions/weald/monster-catalog";
import { buildWealdCroneCatalog } from "./expansions/weald/crone-catalog";
import { createWealdLevelOneMonsterPoolState } from "./expansions/weald/monster-pool";

export type WealdQuestSources = {
  readonly medium: unknown;
  readonly large: unknown;
  readonly curios: readonly CurioCard[];
};

/** R9–R10、W3：从可信来源及开局包选择重建；不读取快照自带的目录作来源。 */
export function rebuildLocationQuestDecks(
  sources: CoreQuestSources,
  location: "ruins" | "weald",
  level: number,
  packs?: readonly ContentPackId[],
) {
  const selected = packs === undefined ? sources : sourcesForContentPacks(sources, packs);
  if (location === "ruins") return rebuildCoreQuestDecks(selected);
  if (location !== "weald" || level !== 1 || !packs?.includes("weald") || !selected.weald)
    throw new Error("Weald 地点来源需要已选内容包、完整核准目录及 I 级任务");
  const local = selected.weald;
  const monsterPool = createWealdLevelOneMonsterPoolState({
    core: selected.monsters,
    medium: local.medium,
    large: local.large,
    contentPacks: packs,
  });
  const commonIds = new Set(
    selected.monsters
      .filter((card) => card.location === "common" && card.level === 1)
      .map((card) => card.combatCardId),
  );
  const common = selected.catalog.monsters.filter((card) => commonIds.has(card.id));
  if (
    common.length !== commonIds.size ||
    new Set(common.map((card) => card.id)).size !== commonIds.size
  )
    throw new Error("Weald 通用战斗来源缺失或重复");
  return {
    catalog: {
      ...selected.catalog,
      monsters: [
        ...common,
        ...buildWealdMonsterCatalog(local.medium, local.large),
        buildWealdCroneCatalog(),
      ],
    },
    curios: locationCurioPool(selected.curios, { location: "weald", cards: local.curios }),
    monsterPool,
  };
}
