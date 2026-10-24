import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { heroHasUnwiredCombatSkills } from "./formal-heroes";
import { embarkSkillAllowed, verifiedLevel1CombatSkillsForHero } from "./formal-roster-catalog";
import { resolveHeroSkillEffects, readPrintedRange } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { replacementHeroCandidates } from "./hero-death-estate";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const card = (id: string) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.id === id)!);
const stat = (id: string) =>
  clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === id)!,
  );
const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p021")!,
);

const LEPER_L1 = [
  ["hero_skill:p274", "Chop"],
  ["hero_skill:p277", "Hew"],
  ["hero_skill:p280", "Purge"],
  ["hero_skill:p283", "Revenge"],
  ["hero_skill:p286", "Withstand"],
  ["hero_skill:p289", "Solemnity"],
  ["hero_skill:p292", "Intimidate"],
] as const;

const ANTIQUARIAN_L1 = [
  ["hero_skill:p295", "Nervous Stab"],
  ["hero_skill:p298", "Festering Vapours"],
  ["hero_skill:p301", "Get Down!"],
  ["hero_skill:p304", "Flashpowder"],
  ["hero_skill:p307", "Fortifying Vapours"],
  ["hero_skill:p310", "Invigorating Vapours"],
  ["hero_skill:p313", "Protect Me"],
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

function setupBattle(
  hero: string,
  heroStatId: string,
  skillCard: HeroSkillCardView,
  patch: {
    actor?: Partial<BattleEntity>;
    target?: Partial<BattleEntity>;
    areaDistance?: 0 | 1 | 2;
  } = {},
) {
  const heroStat = stat(heroStatId);
  const distance =
    patch.areaDistance ??
    (readPrintedRange(skillCard).kind === "exact"
      ? (readPrintedRange(skillCard) as { distance: number }).distance
      : 1);
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const lit = skillCard.top_row_icons?.find((icon) => /^stance_.*_lit$/.test(icon.key ?? ""));
  const stance = (lit?.key?.replace(/^stance_|_lit$/g, "") ?? "defensive") as NonNullable<
    BattleEntity["stance"]
  >;
  const game = createBattleState(42, {
    heroStats: [heroStat],
    monsters: [monster],
    skills: [skillCard],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero,
        heroStatId,
        heroLevel: 1,
        life: heroStat.life,
        dodge: heroStat.dodge,
        stress: 3,
        areaId: "a",
        stance,
        skillIds: [skillCard.id],
        ...patch.actor,
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 2,
        areaId: distance === 0 ? "a" : distance === 1 ? "b" : "c",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
        ...patch.target,
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
    ],
  });
  const command = {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "m",
    skillId: skillCard.id,
  } as Command;
  return { game, command };
}

function play(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}

it("Warrens：Leper / Antiquarian 七张 I 级已核实；STAT life≠1", () => {
  for (const [id, name] of LEPER_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("LEPER");
    expect(skill.verification.unverified).toBe(false);
  }
  for (const [id, name] of ANTIQUARIAN_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("ANTIQUARIAN");
    expect(skill.verification.unverified).toBe(false);
  }
  expect(verifiedLevel1CombatSkillsForHero("LEPER", data.hero_skill.cards)).toHaveLength(7);
  expect(verifiedLevel1CombatSkillsForHero("ANTIQUARIAN", data.hero_skill.cards)).toHaveLength(7);
  const leperStat = stat("hero_stat:warrens:leper:p001:front");
  const antiStat = stat("hero_stat:warrens:antiquarian:p001:front");
  expect(leperStat.life).toBe(18);
  expect(antiStat.life).toBe(9);
  expect(leperStat.attributesVerified).toBe(true);
  expect(antiStat.attributesVerified).toBe(true);
});

it("Chop I 可结算伤害；两人可替补且战斗已接线", () => {
  const chop = card("hero_skill:p274");
  expect(
    resolveHeroSkillEffects(
      chop,
      {
        actor: { id: "h", wounds: 0, stress: 2 },
        target: { id: "m", side: "monster", wounds: 4, dodge: 0 },
        areaDistance: 1,
      },
      5,
    ).resolution,
  ).toMatchObject({ status: "resolved", outcome: "hit", damageDealt: 12 });

  const sources = webQuestSources();
  type EmbarkSkill = Parameters<typeof embarkSkillAllowed>[1];
  expect(embarkSkillAllowed("LEPER", chop as unknown as EmbarkSkill)).toBe(true);
  expect(heroHasUnwiredCombatSkills("LEPER")).toBe(false);
  expect(heroHasUnwiredCombatSkills("ANTIQUARIAN")).toBe(false);

  const { game, command } = setupBattle("LEPER", "hero_stat:warrens:leper:p001:front", chop, {
    actor: { stance: "aggressive" },
  });
  play(game, command);

  const quest = createCoreDungeonQuest(41, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(quest.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["LEPER", "ANTIQUARIAN"]),
  );
});
