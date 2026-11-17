import { naturalHamletStart } from "./guild-quest";
import { coreQuestSources } from "./core-quest";
import { switchTrinketDungeonLevel } from "../trinket-acquisition";
import type { GameState } from "../command";
import trinketFile from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/normalize/schema";

/** 受控 II 级 Stygian 村庄；正式路径为 tasks-v1，不是自然跨幕养成。 */
export function wealdStygianTasksHamletFixture(): GameState {
  const state = naturalHamletStart(coreQuestSources, 6).game;
  const d = state.dungeon!;
  const all = normalizedTrinketFileSchema.parse(trinketFile).cards;
  const trinkets = switchTrinketDungeonLevel(d.trinkets!, all, 2);
  if ("reason" in trinkets) throw new Error(trinkets.reason);
  return {
    ...state,
    dungeon: {
      ...d,
      mode: "stygian",
      stygianRoomRules: "full",
      campaignLevel: 2,
      contentPacks: ["core", "weald"],
      wealdHigherQuestOffers: "tasks-v1",
      trinkets,
      discardedQuests: [],
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}
