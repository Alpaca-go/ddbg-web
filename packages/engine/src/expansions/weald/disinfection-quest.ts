import { DISINFECTION_QUEST_ID, INFECTION_OAK_ROOM_CARD_ID } from "./disinfection-constants";
import type { DungeonState } from "../../dungeon";

export { DISINFECTION_QUEST_ID, INFECTION_OAK_ROOM_CARD_ID };

export function isDisinfectionQuest(d: Pick<DungeonState, "questDistribution">): boolean {
  return d.questDistribution?.questId === DISINFECTION_QUEST_ID;
}

export function disinfectionXpFromOakCount(oakCount: number, roomsPerXp: number): number {
  return Math.min(3, oakCount * roomsPerXp);
}

export function recordDisinfectionOakOnBattleFinish(
  d: DungeonState,
  disinfectedThisBattle: boolean,
): Pick<DungeonState, "disinfectionOakCount"> | null {
  if (!isDisinfectionQuest(d) || !disinfectedThisBattle) return null;
  return { disinfectionOakCount: (d.disinfectionOakCount ?? 0) + 1 };
}
