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

/** R-245：开局额外加入公共池的普通 Potion 数量（非 R-197 任务药水）。 */
export function readQuestStartingPotions(d: DungeonState): number {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "startingPotions" in quest ? quest.startingPotions : 0;
}

export function questStartingPotionItems(count: number): readonly {
  readonly id: string;
  readonly face: ProvisionFace;
}[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `dungeon-quest-starting-potion:${index}`,
    face: "potion" as const,
  }));
}

export function questStartingPotionOverflow(d: DungeonState): {
  readonly provisions: readonly { readonly id: string; readonly face: ProvisionFace }[];
  readonly potionItems: readonly { readonly id: string; readonly face: ProvisionFace }[];
  readonly overflow: number;
} {
  const count = readQuestStartingPotions(d);
  if (!count)
    return { provisions: d.explorationSetup?.provisions ?? [], potionItems: [], overflow: 0 };
  const provisions = d.explorationSetup?.provisions ?? [];
  const potionItems = questStartingPotionItems(count);
  return {
    provisions,
    potionItems,
    overflow: Math.max(0, provisions.length + potionItems.length - 16),
  };
}

export function readObjectiveRecoveryProvision(d: DungeonState): ProvisionFace | null {
  const quest = readBasicQuest(d.questDistribution);
  return quest && "objectiveRecoveryProvision" in quest ? quest.objectiveRecoveryProvision : null;
}

/** 任务补给实体；同一 face 的多个道具用序号区分。 */
export function questProvisionItems(
  d: DungeonState,
): readonly { readonly id: string; readonly face: ProvisionFace }[] {
  return readQuestStartingProvisions(d).flatMap((spec) =>
    Array.from({ length: spec.count }, (_, index) => ({
      id: `${QUEST_PROVISION_PREFIX}${spec.face}:${index}`,
      face: spec.face,
    })),
  );
}

/**
 * 计算加入任务补给后的溢出数量。任务道具本身不可丢弃；超出 16 时由玩家
 * 从既有补给中选择要丢弃的道具（Q-142 / R-205）。
 */
export function questStartingProvisionOverflow(d: DungeonState): {
  readonly provisions: readonly { readonly id: string; readonly face: ProvisionFace }[];
  readonly questItems: readonly { readonly id: string; readonly face: ProvisionFace }[];
  readonly overflow: number;
} {
  const setup = d.explorationSetup;
  const questItems = setup?.provisions.some((provision) => isQuestProvisionId(provision.id))
    ? []
    : questProvisionItems(d);
  const provisions = setup?.provisions ?? [];
  return {
    provisions,
    questItems,
    overflow: Math.max(0, provisions.length + questItems.length - 16),
  };
}
