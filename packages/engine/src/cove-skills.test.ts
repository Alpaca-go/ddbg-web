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

const MAA_L1 = [
  ["hero_skill:p232", "Crush"],
  ["hero_skill:p235", "Rampart"],
  ["hero_skill:p238", "Bellow"],
  ["hero_skill:p241", "Defender"],
  ["hero_skill:p244", "Retribution"],
  ["hero_skill:p247", "Command"],
  ["hero_skill:p250", "Bolster"],
] as const;

const FLAG_L1 = [
  ["hero_skill:p253", "Punish"],
  ["hero_skill:p256", "Rain of Sorrows"],
  ["hero_skill:p259", "Exsanguinate"],
  ["hero_skill:p262", "Reclaim"],
  ["hero_skill:p265", "Redeem"],
  ["hero_skill:p268", "Endure"],
  ["hero_skill:p271", "Suffer"],
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

it("Cove：MAA / Flagellant 七张 I 级已核实；STAT life≠1", () => {
  for (const [id, name] of MAA_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("MAN-AT-ARMS");
    expect(skill.verification.unverified).toBe(false);
  }
  for (const [id, name] of FLAG_L1) {
    const skill = card(id) as HeroSkillCardView & { name: string };
    expect(skill.name).toBe(name);
    expect(skill.hero).toBe("FLAGELLANT");
    expect(skill.verification.unverified).toBe(false);
  }
  expect(verifiedLevel1CombatSkillsForHero("MAN-AT-ARMS", data.hero_skill.cards)).toHaveLength(7);
  expect(verifiedLevel1CombatSkillsForHero("FLAGELLANT", data.hero_skill.cards)).toHaveLength(7);
  const maaStat = stat("hero_stat:cove:man-at-arms:p001:front");
  const flagStat = stat("hero_stat:cove:flagellant:p001:front");
  expect(maaStat.life).toBe(16);
  expect(flagStat.life).toBe(12);
  expect(maaStat.attributesVerified).toBe(true);
  expect(flagStat.attributesVerified).toBe(true);
});

it("Crush I 可结算伤害；两人可替补且战斗已接线", () => {
  const crush = card("hero_skill:p232");
  expect(
    resolveHeroSkillEffects(
      crush,
      {
        actor: { id: "h", wounds: 0, stress: 2 },
        target: { id: "m", side: "monster", wounds: 4, dodge: 0 },
        areaDistance: 1,
      },
      5,
    ).resolution,
  ).toMatchObject({ status: "resolved", outcome: "hit", damageDealt: 7 });

  const sources = webQuestSources();
  type EmbarkSkill = Parameters<typeof embarkSkillAllowed>[1];
  expect(embarkSkillAllowed("MAN-AT-ARMS", crush as unknown as EmbarkSkill)).toBe(true);
  expect(heroHasUnwiredCombatSkills("MAN-AT-ARMS")).toBe(false);
  expect(heroHasUnwiredCombatSkills("FLAGELLANT")).toBe(false);

  const { game, command } = setupBattle(
    "MAN-AT-ARMS",
    "hero_stat:cove:man-at-arms:p001:front",
    crush,
    { actor: { stance: "aggressive" } },
  );
  play(game, command);

  const quest = createCoreDungeonQuest(41, "quest:p001", "radiant", coreParty, sources);
  expect(replacementHeroCandidates(quest.dungeon!).map((s) => s.name)).toEqual(
    expect.arrayContaining(["MAN-AT-ARMS", "FLAGELLANT"]),
  );
});
