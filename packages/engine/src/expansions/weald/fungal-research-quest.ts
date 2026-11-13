import { readBasicQuest } from "../../../../data/src/basic-quests";
import type { BattleState } from "../../battle";
import type { DungeonState } from "../../dungeon";
import { isNecroticFungusEntity, livingNecroticFungus } from "./necrotic-fungus";

export const FUNGAL_RESEARCH_QUEST_ID = "quest:weald:p001" as const;

export function isFungalResearchQuest(d: Pick<DungeonState, "questDistribution">): boolean {
  return readBasicQuest(d.questDistribution)?.id === FUNGAL_RESEARCH_QUEST_ID;
}

export function destroyedNecroticFungusCount(battle: BattleState): number {
  return battle.entities.filter((e) => isNecroticFungusEntity(e) && (e.dead || e.wounds >= 1))
    .length;
}

/** 胜利并清房时叠加 brought back 与 objective（R-246、R-252）。 */
export function fungalResearchProgressFromBattle(
  d: DungeonState,
  battle: BattleState,
  roomKind: string | undefined,
): Pick<DungeonState, "necroticFungusBroughtBackCount" | "fungalResearchObjectiveMet"> {
  const added = destroyedNecroticFungusCount(battle);
  const living = livingNecroticFungus(battle).length;
  return {
    necroticFungusBroughtBackCount: (d.necroticFungusBroughtBackCount ?? 0) + added,
    ...(roomKind === "objective" && living >= 1 ? { fungalResearchObjectiveMet: true } : {}),
  };
}

export function fungalResearchXpFromBroughtBack(
  broughtBackCount: number,
  roomsPerXp: number,
): number {
  return Math.min(3, broughtBackCount * roomsPerXp);
}
