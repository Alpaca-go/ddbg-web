import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../../data/src/shared/write";
import type { BattleSetup } from "../../src/shared/battle/battle";
import { heroHasUnwiredCombatSkills } from "../../src/core/heroes/formal-heroes";
import {
  embarkSkillAllowed,
  verifiedLevel1CombatSkillsForHero,
} from "../../src/shared/core/formal-roster-catalog";
import type { HeroSkillCardView } from "../../src/core/heroes/hero-skill";
import { replacementHeroCandidates } from "../../src/core/heroes/hero-death-estate";
import { battleDataPlugin } from "../../../../apps/web/battle-data-plugin";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import type { CoreQuestSources } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../helpers/core-quest";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const card = (id: string) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.id === id)!);
const stat = (id: string) =>
  clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === id)!,
  );

const SB_L1 = [
  ["hero_skill:weald:h16:p316", "Pierce"],
  ["hero_skill:weald:h16:p319", "Puncture"],
  ["hero_skill:weald:h16:p322", "Adder\u2019s Kiss"],
  ["hero_skill:weald:h16:p325", "Impale"],
  ["hero_skill:weald:h16:p328", "Expose"],
  ["hero_skill:weald:h16:p331", "Captivate"],
  ["hero_skill:weald:h16:p334", "Serpent Sway"],
] as const;

const HM_L1 = [
  ["hero_skill:weald:h17:p337", "Hound\u2019s Rush"],
  ["hero_skill:weald:h17:p340", "Hound\u2019s Harry"],
  ["hero_skill:weald:h17:p343", "Target Whistle"],
  ["hero_skill:weald:h17:p346", "Cry Havoc"],
  ["hero_skill:weald:h17:p349", "Guard Dog"],
  ["hero_skill:weald:h17:p352", "Lick Wounds"],
  ["hero_skill:weald:h17:p355", "Blackjack"],
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

it("Weald：HM / Shieldbreaker 七张 I 级已核实；STAT life≠1", () => {
  for (const [id, name] of SB_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("SHIELDBREAKER");
    expect(skill.verification.unverified).toBe(false);
  }
  for (const [id, name] of HM_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("HOUNDMASTER");
    expect(skill.verification.unverified).toBe(false);
  }
  expect(verifiedLevel1CombatSkillsForHero("SHIELDBREAKER", data.hero_skill.cards)).toHaveLength(7);
  expect(verifiedLevel1CombatSkillsForHero("HOUNDMASTER", data.hero_skill.cards)).toHaveLength(7);
  const sbStat = stat("hero_stat:weald:h16:p032:front");
  const hmStat = stat("hero_stat:weald:h17:p034:front");
  expect(sbStat.life).toBe(11);
  expect(hmStat.life).toBe(11);
  expect(sbStat.attributesVerified).toBe(true);
  expect(hmStat.attributesVerified).toBe(true);
});

it("两人可替补且战役 I 级技能已开放", () => {
  const sources = webQuestSources();
  type EmbarkSkill = Parameters<typeof embarkSkillAllowed>[1];
  expect(
    embarkSkillAllowed("HOUNDMASTER", card("hero_skill:weald:h17:p352") as unknown as EmbarkSkill),
  ).toBe(true);
  expect(
    embarkSkillAllowed(
      "SHIELDBREAKER",
      card("hero_skill:weald:h16:p316") as unknown as EmbarkSkill,
    ),
  ).toBe(true);
  expect(heroHasUnwiredCombatSkills("SHIELDBREAKER")).toBe(false);
  expect(heroHasUnwiredCombatSkills("HOUNDMASTER")).toBe(false);

  const quest = createCoreDungeonQuest(41, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(quest.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["HOUNDMASTER", "SHIELDBREAKER"]),
  );
});
