import {
  asQuestMapPairingQuest,
  basicQuests,
  type BasicQuestId,
} from "../../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../../data/src/quest-map-pairing";
import trinkets from "../../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../../data/src/normalize/schema";
import { createDungeonSandbox } from "../dungeon";
import type { GameState } from "../command";
import { createTrinketPool } from "../trinket-acquisition";
import { coreParty, coreQuestSources } from "./core-quest";

/** II/III 战役任务沙盒：地牢等级 = 战役等级，完整 Common+Ruins 牌堆（R35）。 */
export function createCampaignQuestSandbox(
  campaignLevel: 2 | 3,
  questId: BasicQuestId,
  seed: number,
  position = "S",
): GameState {
  const quest = basicQuests.find((entry) => entry.id === questId);
  if (!quest || quest.level !== campaignLevel || ("bossQuest" in quest && quest.bossQuest))
    throw new Error("需要已接通的同等级非 Boss 任务");
  const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), seed, 0);
  const heroes = coreParty.map((hero, index) => {
    const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!;
    return {
      id: `hero-${index}`,
      heroStatId: hero.heroStatId,
      level: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: stat.attributesVerified === true,
      stance: hero.stance,
      skillIds: [...hero.skillIds],
    };
  });
  const catalog = {
    ...coreQuestSources.catalog,
    trinkets: createTrinketPool(normalizedTrinketFileSchema.parse(trinkets).cards, campaignLevel),
  };
  const game = createDungeonSandbox(
    seed,
    layout,
    quest.distribution,
    "radiant",
    position,
    heroes,
    coreQuestSources.resolveCards,
    { dungeonLevel: campaignLevel, light: 5, provisions: [] },
    coreQuestSources.curios,
    coreQuestSources.rooms,
    coreQuestSources.monsters,
    catalog,
  );
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      campaignLevel,
      phase: "awaitingRoom",
    },
  };
}
