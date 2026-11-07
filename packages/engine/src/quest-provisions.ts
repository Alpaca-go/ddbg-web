import { readBasicQuest } from "../../data/src/basic-quests";
import type { DungeonState } from "./dungeon";
import type { ProvisionFace } from "./loot";

/** R-197：任务卡强制携带的补给（不可丢弃；Purify 的 3 个药水）。 */
export const QUEST_PROVISION_PREFIX = "dungeon-quest-provision:" as const;

export function isQuestProvisionId(id: string): boolean {
  return id.startsWith(QUEST_PROVISION_PREFIX);
}

export function readQuestStartingProvisions(
  d: DungeonState,
): readonly { readonly face: ProvisionFace; readonly count: number }[] {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "questStartingProvisions" in quest ? quest.questStartingProvisions : [];
}

export function readObjectiveRecoveryProvision(d: DungeonState): ProvisionFace | null {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "objectiveRecoveryProvision" in quest ? quest.objectiveRecoveryProvision : null;
}

/**
 * 把任务补给加入公共补给池（R-197 / QUEST p10）：先拿任务道具；
 * 超过 16 颗时丢弃既有池尾部的超出部分，任务道具保留。
 */
export function addQuestStartingProvisions(d: DungeonState): {
  readonly provisions: readonly { readonly id: string; readonly face: ProvisionFace }[];
  readonly discarded: readonly string[];
} {
  const setup = d.explorationSetup;
  const specs = readQuestStartingProvisions(d);
  if (!setup || !specs.length) return { provisions: setup?.provisions ?? [], discarded: [] };
  const existing = setup.provisions;
  if (existing.some((provision) => isQuestProvisionId(provision.id)))
    return { provisions: existing, discarded: [] };
  const questItems = specs.flatMap((spec) =>
    Array.from({ length: spec.count }, (_, index) => ({
      id: `${QUEST_PROVISION_PREFIX}${spec.face}:${index}`,
      face: spec.face,
    })),
  );
  const overflow = Math.max(0, existing.length + questItems.length - 16);
  const keep = existing.length - overflow;
  return {
    provisions: [...existing.slice(0, keep), ...questItems],
    discarded: existing.slice(keep).map((provision) => provision.id),
  };
}
