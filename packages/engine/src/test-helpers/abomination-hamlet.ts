import { guildQuest } from "./guild-quest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./core-quest";
/** Explicit class/resource Hamlet fixture; not a natural Abomination campaign log. */
export function abominationHamletFixture() {
  const baseline = guildQuest().game,
    d = baseline.dungeon!;
  const party = [
    {
      ...coreParty[0]!,
      heroStatId: "hero_stat:p021:front",
      skillIds: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p220"],
    },
    ...coreParty.slice(1),
  ];
  const hero = createCoreDungeonQuest(11, "quest:p001", "radiant", party, coreQuestSources).dungeon!
    .heroes[0]!;
  return {
    ...baseline,
    dungeon: {
      ...d,
      gold: 100,
      lootPool: { ...d.lootPool!, gold: 100 },
      heroes: [
        {
          ...hero,
          xp: 10,
          wounds: 0,
          stress: 0,
          quirkIds: d.heroes[0]!.quirkIds ?? [],
          diseaseId: d.heroes[0]!.diseaseId ?? null,
        },
        ...d.heroes.slice(1),
      ],
      hamlet: {
        ...d.hamlet!,
        blockedBuildings: [],
        weekBlockedBuildings: [],
        active: null,
        caretaker: null,
        noCaretaker: true,
        extraBlock: false,
      },
    },
  };
}
