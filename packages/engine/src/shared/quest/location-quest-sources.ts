import { type CurioCard } from "../../../../data/src/core/curios/curio";
import { locationCurioPool } from "../../../../data/src/core/curios/curio-pool";
import { rebuildCoreQuestDecks } from "./core-quest-decks";
import type { CoreQuestSources } from "../dungeon/dungeon-quest-entry";
import type { ContentPackId } from "../core/content-packs";
import { sourcesForContentPacks } from "../core/content-packs";
import { buildWealdMonsterCatalog } from "../../weald/monsters/monster-catalog";
import { buildWealdCroneCatalog } from "../../weald/monsters/crone-catalog";
import { createWealdLevelOneMonsterPoolState } from "../../weald/monsters/monster-pool";
import { createWealdHigherMonsterPoolState } from "../../weald/monsters/higher-monster-pool";
import { buildWealdHigherMonsterCatalog } from "../../weald/monsters/higher-monster-catalog";
import { buildWealdTaskMonsterCatalog } from "../../weald/monsters/task-monster-catalog";

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
  version?: "weald-higher-v1" | "weald-tasks-v1",
) {
  const selected = packs === undefined ? sources : sourcesForContentPacks(sources, packs);
  if (location === "ruins") return rebuildCoreQuestDecks(selected);
  const higher =
    (version === "weald-higher-v1" || version === "weald-tasks-v1") && (level === 2 || level === 3);
  if (
    location !== "weald" ||
    (level !== 1 && !higher) ||
    !packs?.includes("weald") ||
    !selected.weald ||
    (version !== undefined && !higher)
  )
    throw new Error("Weald 地点来源需要已选内容包、完整核准目录及 I 级任务");
  const local = selected.weald;
  const input = {
    core: selected.monsters,
    medium: local.medium,
    large: local.large,
    contentPacks: packs,
  };
  const monsterPool = higher
    ? createWealdHigherMonsterPoolState({ ...input, level: level as 2 | 3 })
    : createWealdLevelOneMonsterPoolState(input);
  const commonIds = new Set(
    selected.monsters
      .filter((card) => card.location === "common" && card.level === level)
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
        ...(version === "weald-tasks-v1"
          ? buildWealdTaskMonsterCatalog(local.medium, local.large)
          : higher
            ? buildWealdHigherMonsterCatalog(level as 2 | 3)
            : [...buildWealdMonsterCatalog(local.medium, local.large), buildWealdCroneCatalog()]),
      ],
    },
    curios: locationCurioPool(selected.curios, { location: "weald", cards: local.curios }),
    monsterPool,
  };
}
