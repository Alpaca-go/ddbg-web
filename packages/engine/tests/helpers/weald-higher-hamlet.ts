import { naturalHamletStart } from "./guild-quest";
import { coreQuestSources } from "./core-quest";
import { switchTrinketDungeonLevel } from "../../src/shared/trinkets/trinket-acquisition";
import type { GameState } from "../../src/shared/core/command";
import trinketFile from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/shared/schema";

/** 受控 III 级已准备村庄检查点；不是自然跨幕养成或初始日志。 */
export function wealdHigherHamletFixture(): GameState {
  const state = naturalHamletStart(coreQuestSources, 6).game;
  const d = state.dungeon!;
  const all = normalizedTrinketFileSchema.parse(trinketFile).cards;
  const second = switchTrinketDungeonLevel(d.trinkets!, all, 2);
  if ("reason" in second) throw new Error(second.reason);
  const trinkets = switchTrinketDungeonLevel(second, all, 3);
  if ("reason" in trinkets) throw new Error(trinkets.reason);
  return {
    ...state,
    dungeon: {
      ...d,
      campaignLevel: 3,
      contentPacks: ["core", "weald"],
      wealdHigherQuestOffers: true,
      discardedQuests: [],
      trinkets,
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
