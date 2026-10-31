import { basicQuests, asQuestMapPairingQuest } from "../../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../../data/src/quest-map-pairing";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { createDungeonSandbox } from "../dungeon";
import { coreParty, coreQuestSources } from "./core-quest";
import type { GameState } from "../command";
const quest = basicQuests.find((q) => q.id === "quest:p006")!;
/** Explicit DL-II room-entry mechanism fixture; no claim of natural act advancement. */
export function disruptionRoomFixture(
  seed = 1,
  kind: "objective" | "lair" = "objective",
): GameState {
  const initialHeroes = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
  ).dungeon!.heroes;
  const heroes = initialHeroes.map((h) => {
    const old = coreQuestSources.catalog.heroStats.find((s) => s.id === h.heroStatId)!;
    const stat = coreQuestSources.catalog.heroStats.find(
      (s) => s.name === old.name && s.level === 2,
    )!;
    return {
      ...h,
      heroStatId: stat.id,
      level: 2 as const,
      heroLevel: 2,
      life: stat.life,
      skillIds: coreQuestSources.catalog.skills
        .filter((s) => s.hero === old.name && s.level === 1)
        .slice(0, 4)
        .map((s) => s.id),
    };
  });
  const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(quest), seed, 0);
  const game = createDungeonSandbox(
    seed,
    layout,
    quest.distribution,
    "radiant",
    "S",
    heroes,
    coreQuestSources.resolveCards,
    { dungeonLevel: 2, light: 5, provisions: [] },
    coreQuestSources.curios,
    coreQuestSources.rooms,
    coreQuestSources.monsters,
    coreQuestSources.catalog,
  );
  const position = game.dungeon!.rooms.find((r) => r.kind === kind)!.id;
  return {
    ...game,
    dungeon: {
      ...game.dungeon!,
      position,
      phase: "awaitingRoom",
      campaignLevel: 2,
      rooms: game.dungeon!.rooms.map((r) => (r.id === position ? { ...r, revealed: true } : r)),
    },
  };
}
