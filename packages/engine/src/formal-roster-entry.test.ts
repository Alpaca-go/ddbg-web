import { expect, it } from "vitest";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources, QuestParty } from "./dungeon-quest-entry";
import {
  FORMAL_HERO_NAMES,
  FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS,
  heroHasUnwiredCombatSkills,
  isFormalHeroName,
} from "./formal-heroes";
import {
  embarkSkillAllowed,
  formalRosterLevel1ArtSkillIds,
  isFormalHeroRosterPendingAttributes,
} from "./formal-roster-catalog";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { replacementHeroCandidates } from "./hero-death-estate";

function webQuestSources(): CoreQuestSources {
  const load = battleDataPlugin().load as (id: string) => string;
  const code = load("\0virtual:quest-battle-data");
  const catalog = JSON.parse(code.slice("export const battleData = ".length, -1));
  return {
    ...coreQuestSources,
    catalog: { ...catalog, trinkets: coreQuestSources.catalog.trinkets },
    resolveCards: catalog.resolveCards,
  };
}

function partyFromNames(names: readonly string[], sources: CoreQuestSources): QuestParty {
  return names.map((name, index) => {
    const stat = sources.catalog.heroStats.find((s) => s.name === name && s.level === 1)!;
    const skills = sources.catalog.skills.filter(
      (s) => embarkSkillAllowed(name, s) && s.level === 1,
    );
    return {
      heroStatId: stat.id,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[index]!,
      skillIds: skills.slice(0, 3).map((s) => s.id),
    };
  });
}

const sources = webQuestSources();

it("正式名录列出十八名英雄；一名扩展占位 STAT 与一名战斗未接线", () => {
  expect(FORMAL_HERO_NAMES).toHaveLength(18);
  expect(FORMAL_HERO_NAMES.every(isFormalHeroName)).toBe(true);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual(["MUSKETEER"]);
  expect(isFormalHeroName("CRUSADER")).toBe(true);
  expect(isFormalHeroName("MUSKETEER")).toBe(true);
  expect(heroHasUnwiredCombatSkills("JESTER")).toBe(false);
  expect(heroHasUnwiredCombatSkills("ABOMINATION")).toBe(false);
  expect(heroHasUnwiredCombatSkills("CRUSADER")).toBe(false);
  expect(
    sources.catalog.heroStats
      .filter((s) => s.level === 1)
      .map((s) => s.name)
      .sort(),
  ).toEqual([...FORMAL_HERO_NAMES].sort());
  expect(sources.catalog.heroStats).toHaveLength(51);
});

it("开局可编入赏金猎人与瘟疫医生；存档往返一致", () => {
  const party = partyFromNames(["BOUNTY HUNTER", "PLAGUE DOCTOR", "CRUSADER", "VESTAL"], sources);
  const game = createCoreDungeonQuest(21, "quest:p001", "radiant", party, sources);
  expect(
    game.dungeon!.heroes.map(
      (h) => sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!.name,
    ),
  ).toEqual(["BOUNTY HUNTER", "PLAGUE DOCTOR", "CRUSADER", "VESTAL"]);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["ABOMINATION", "HELLION", "HIGHWAYMAN", "GRAVE ROBBER", "OCCULTIST"]),
  );
  const start = {
    seed: 21,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: party.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const save = createQuestSave(start, [], game, sources);
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(save)), sources);
  expect(loaded.game).toEqual(game);
  expect(loaded.start.party).toEqual(start.party);
});

it("开局可编入 Jester（已核实属性 + 已转录 I 级技能）；attributesVerified 为 true", () => {
  const party = partyFromNames(["JESTER", "CRUSADER", "HELLION", "HIGHWAYMAN"], sources);
  const game = createCoreDungeonQuest(23, "quest:p001", "standard", party, sources);
  expect(game.dungeon!.heroes[0]!.attributesVerified).toBe(true);
  expect(game.dungeon!.heroes[0]!.heroStatId).toBe("hero_stat:p011:front");
  expect(isFormalHeroRosterPendingAttributes("JESTER")).toBe(false);
  expect(heroHasUnwiredCombatSkills("JESTER")).toBe(false);
});

it("开局可编入 Musketeer（art-only I 级技能）；存档往返一致", () => {
  const party = partyFromNames(["MUSKETEER", "VESTAL", "HELLION", "HIGHWAYMAN"], sources);
  const game = createCoreDungeonQuest(24, "quest:p002", "standard", party, sources);
  expect(
    game.dungeon!.heroes.map(
      (h) => sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!.name,
    ),
  ).toEqual(["MUSKETEER", "VESTAL", "HELLION", "HIGHWAYMAN"]);
  expect(formalRosterLevel1ArtSkillIds("MUSKETEER")).toHaveLength(7);
  const start = {
    seed: 24,
    questId: "quest:p002" as const,
    mode: "standard" as const,
    party: party.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  expect(loadQuestSave(createQuestSave(start, [], game, sources), sources).game).toEqual(game);
});

it("拒绝目录外身份与重复正式英雄；原四核心开局仍可用", () => {
  expect(
    createCoreDungeonQuest(1, "quest:p001", "standard", coreParty, sources).dungeon!.heroes,
  ).toHaveLength(4);
  const outside = partyFromNames(["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"], sources).map(
    (h, i) => (i ? h : { ...h, heroStatId: "hero_stat:jester-not-in-catalog" }),
  );
  expect(() => createCoreDungeonQuest(1, "quest:p001", "standard", outside, sources)).toThrow(
    /正式目录/,
  );
  const duplicate = partyFromNames(
    ["BOUNTY HUNTER", "BOUNTY HUNTER", "CRUSADER", "VESTAL"],
    sources,
  );
  expect(() => createCoreDungeonQuest(1, "quest:p001", "standard", duplicate, sources)).toThrow();
});
