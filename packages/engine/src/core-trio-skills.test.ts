import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import type { CoreQuestSources } from "./dungeon-quest-entry";
import {
  FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS,
  heroHasUnwiredCombatSkills,
} from "./formal-heroes";
import { FORMAL_HEROES_PARTIAL_CORE_SKILLS } from "./formal-roster-catalog";
import { embarkSkillAllowed, verifiedLevel1CombatSkillsForHero } from "./formal-roster-catalog";
import { resolveHeroSkillEffects, readPrintedRange, readPrintedTargets } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { replacementHeroCandidates } from "./hero-death-estate";
import { battleDataPlugin } from "../../../apps/web/battle-data-plugin";
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

const JESTER_L1 = [
  ["hero_skill:p106", "Dirk Stab", false],
  ["hero_skill:p109", "Harvest", false],
  ["hero_skill:p112", "Finale", false],
  ["hero_skill:p115", "Solo", false],
  ["hero_skill:p118", "Battle Ballad", false],
  ["hero_skill:p121", "Inspiring Tune", false],
  ["hero_skill:p124", "Slice Off", false],
] as const;

const ARBALEST_L1 = [
  ["hero_skill:p148", "Sniper Shot", false],
  ["hero_skill:p151", "Suppressive Fire", false],
  ["hero_skill:p154", "Sniper\u2019s Mark", false],
  ["hero_skill:p157", "Bola", false],
  ["hero_skill:p160", "Blindfire", false],
  ["hero_skill:p163", "Battlefield Bandage", false],
  ["hero_skill:p166", "Rallying Flare", false],
] as const;

const ABOMINATION_L1 = [
  ["hero_skill:p211", "Manacles", false],
  ["hero_skill:p214", "Beast\u2019s Bile", false],
  ["hero_skill:p217", "Absolution", false],
  ["hero_skill:p220", "Transform to Beast", false],
  ["hero_skill:p223", "Rake", false],
  ["hero_skill:p226", "Rage", false],
  ["hero_skill:p229", "Slam", false],
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
  const stance = (lit?.key?.replace(/^stance_|_lit$/g, "") ?? "ranged") as NonNullable<
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
        ...(hero === "ABOMINATION" ? { form: "human" as const } : {}),
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

it("I 级目录：Jester/Arbalest 七张已核实；Abomination 七张（含双面 Transform）", () => {
  for (const [id, name, unverified] of JESTER_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string; level: number };
    expect(skill.name).toBe(name);
    expect(skill.level).toBe(1);
    expect(skill.hero).toBe("JESTER");
    expect(skill.verification.unverified).toBe(unverified);
  }
  for (const [id, name, unverified] of ARBALEST_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.verification.unverified).toBe(unverified);
  }
  for (const [id, name, unverified] of ABOMINATION_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.verification.unverified).toBe(unverified);
    if (id === "hero_skill:p220") expect(skill.hero).toBeNull();
    else expect(skill.hero).toBe("ABOMINATION");
  }
  expect(verifiedLevel1CombatSkillsForHero("JESTER", data.hero_skill.cards)).toHaveLength(7);
  expect(verifiedLevel1CombatSkillsForHero("ARBALEST", data.hero_skill.cards)).toHaveLength(7);
  expect(verifiedLevel1CombatSkillsForHero("ABOMINATION", data.hero_skill.cards)).toHaveLength(7);
});

it("Dirk Stab / Rallying Flare I 可结算；R-102 无视 Guard", () => {
  const dirk = card("hero_skill:p106");
  expect(
    resolveHeroSkillEffects(
      dirk,
      {
        actor: { id: "h", wounds: 0, stress: 2 },
        target: { id: "m", side: "monster", wounds: 4, dodge: 0 },
        areaDistance: 1,
        guardedEnemyOmitted: true,
      },
      5,
    ).resolution,
  ).toMatchObject({ status: "resolved", outcome: "hit", damageDealt: 5 });

  const flare = card("hero_skill:p166");
  expect(readPrintedTargets(flare)).toEqual({ kind: "hero_or_monster", max: 2 });
  expect(
    resolveHeroSkillEffects(
      flare,
      {
        actor: { id: "h", wounds: 0, stress: 0 },
        target: { id: "m", side: "monster", wounds: 3, dodge: 0, statusStacks: [] },
        areaDistance: 1,
      },
      5,
    ).resolution,
  ).toMatchObject({
    status: "resolved",
    outcome: "hit",
    actorStunMarkCleared: true,
    targetStatusEffects: [{ kind: "debuff", duration: 2 }],
  });

  const transform = card("hero_skill:p220");
  const abom = setupBattle("ABOMINATION", "hero_stat:p021:front", transform, { areaDistance: 1 });
  const transformCmd: Command = {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "h",
    skillId: transform.id,
  };
  const changed = play(abom.game, transformCmd);
  expect(changed.state.battle!.entities.find((e) => e.id === "h")!.form).toBe("beast");
});

it("Jester/Arbalest 可替补；七张 I 级已核实", () => {
  const sources = webQuestSources();
  type EmbarkSkill = Parameters<typeof embarkSkillAllowed>[1];
  expect(embarkSkillAllowed("JESTER", card("hero_skill:p106") as unknown as EmbarkSkill)).toBe(
    true,
  );
  expect(embarkSkillAllowed("ARBALEST", card("hero_skill:p166") as unknown as EmbarkSkill)).toBe(
    true,
  );

  const game = createCoreDungeonQuest(31, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(game.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["JESTER", "ARBALEST", "ABOMINATION"]),
  );
  expect(heroHasUnwiredCombatSkills("JESTER")).toBe(false);
  expect(heroHasUnwiredCombatSkills("ARBALEST")).toBe(false);
  expect(heroHasUnwiredCombatSkills("ABOMINATION")).toBe(false);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).not.toContain("JESTER");
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).not.toContain("ARBALEST");
  expect(FORMAL_HEROES_PARTIAL_CORE_SKILLS).toEqual([]);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual([]);
});
