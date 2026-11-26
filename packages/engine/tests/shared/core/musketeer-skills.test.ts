import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../../data/src/core/write";
import type { BattleSetup } from "../../../src/shared/battle/battle";
import {
  FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS,
  heroHasUnwiredCombatSkills,
} from "../../../src/core/heroes/formal-heroes";
import {
  embarkSkillAllowed,
  verifiedLevel1CombatSkillsForHero,
} from "../../../src/shared/core/formal-roster-catalog";
import type { HeroSkillCardView } from "../../../src/core/heroes/hero-skill";
import { replacementHeroCandidates } from "../../../src/core/heroes/hero-death-estate";
import { battleDataPlugin } from "../../../../../apps/web/battle-data-plugin";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import type { CoreQuestSources } from "../../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../helpers/core-quest";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const card = (id: string) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.id === id)!);
const stat = (id: string) =>
  clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === id)!,
  );

const L1 = [
  ["hero_skill:musketeer:h18:p358", "Aimed Shot"],
  ["hero_skill:musketeer:h18:p361", "Smokescreen"],
  ["hero_skill:musketeer:h18:p364", "Call the Shot"],
  ["hero_skill:musketeer:h18:p367", "Buckshot"],
  ["hero_skill:musketeer:h18:p370", "Sidearm"],
  ["hero_skill:musketeer:h18:p373", "Patch Up"],
  ["hero_skill:musketeer:h18:p376", "Skeet Shot"],
] as const;

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

it("Musketeer：七张 I 级已核实；STAT life≠1", () => {
  for (const [id, name] of L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("MUSKETEER");
    expect(skill.verification.unverified).toBe(false);
  }
  expect(verifiedLevel1CombatSkillsForHero("MUSKETEER", data.hero_skill.cards)).toHaveLength(7);
  const mStat = stat("hero_stat:musketeer:h18:p036:front");
  expect(mStat.life).toBe(14);
  expect(mStat.attributesVerified).toBe(true);
});

it("可替补且战役 I 级技能已开放；未接线名单已空", () => {
  const sources = webQuestSources();
  type EmbarkSkill = Parameters<typeof embarkSkillAllowed>[1];
  expect(
    embarkSkillAllowed(
      "MUSKETEER",
      card("hero_skill:musketeer:h18:p358") as unknown as EmbarkSkill,
    ),
  ).toBe(true);
  expect(heroHasUnwiredCombatSkills("MUSKETEER")).toBe(false);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual([]);

  const quest = createCoreDungeonQuest(42, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(quest.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["MUSKETEER"]),
  );
});
