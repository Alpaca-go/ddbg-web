import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { ownedHeroSkills, unequippedHeroSkills } from "./hero-loadout";
import { blacksmithOptions } from "./hamlet-blacksmith";
import { applyTemporarySkillUpgrades, restoreTemporarySkillUpgrades } from "./hamlet-embark";
import { abominationHamletFixture } from "./test-helpers/abomination-hamlet";
let base: GameState;
beforeAll(() => {
  base = abominationHamletFixture();
}, 30000);
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}
const visit: Command = { type: "visitGuild", actorId: "hero-0" };
const choose = (game: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: game.dungeon!.pending!.id,
  optionId,
});
it("Abomination owns all seven skills including the unlabelled double-faced card; other classes and arbitrary null cards cannot claim it", () => {
  const d = base.dungeon!,
    hero = d.heroes[0]!,
    catalog = d.battleCatalog!;
  expect(ownedHeroSkills(hero, catalog)).toHaveLength(7);
  expect(ownedHeroSkills(hero, catalog)!.map((s) => s.id)).toContain("hero_skill:p220");
  const other = { ...d.heroes[1]!, skillIds: ["hero_skill:p220"] };
  expect(ownedHeroSkills(other, catalog)).toBeNull();
  const forged = {
    ...catalog,
    skills: catalog.skills.map((s) =>
      s.id === "hero_skill:p220" ? { ...s, id: "hero_skill:unowned", hero: null } : s,
    ),
  };
  expect(ownedHeroSkills({ ...hero, skillIds: ["hero_skill:unowned"] }, forged)).toBeNull();
});
it("Guild upgrades equipped Transform I→II→III with exact XP/gold costs and permanently removes each previous card", () => {
  const before = structuredClone(base);
  let game = ok(base, visit);
  expect(game.dungeon!.pending!.options.map((o) => o.id)).toContain("upgrade:hero_skill:p220");
  const command = choose(game, "upgrade:hero_skill:p220");
  expect(applyCommand(JSON.parse(JSON.stringify(game)), command)).toEqual(
    applyCommand(game, command),
  );
  game = ok(game, command);
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p221");
  game = ok(game, choose(game, "upgrade:hero_skill:p221"));
  expect(game.dungeon!.heroes[0]).toMatchObject({
    xp: 6,
    permanentlyRemovedSkillIds: ["hero_skill:p220", "hero_skill:p221"],
  });
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p222");
  expect(game.dungeon!.gold).toBe(98);
  expect(ownedHeroSkills(game.dungeon!.heroes[0]!, game.dungeon!.battleCatalog!)).toHaveLength(7);
  expect(base).toEqual(before);
});
it("an unequipped Transform can be permanently upgraded and later equipped without reviving the old card", () => {
  const d = base.dungeon!;
  let game: GameState = {
    ...base,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0 ? { ...h, skillIds: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p217"] } : h,
      ),
    },
  };
  game = ok(game, visit);
  game = ok(game, choose(game, "upgrade:hero_skill:p220"));
  game = ok(game, choose(game, "leave"));
  expect(
    unequippedHeroSkills(game.dungeon!.heroes[0]!, game.dungeon!.battleCatalog!)!.map((s) => s.id),
  ).toContain("hero_skill:p221");
  game = ok(game, {
    type: "setEquippedSkills",
    actorId: "hero-0",
    skillIds: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p221"],
  });
  expect(game.dungeon!.heroes[0]!.skillIds).toContain("hero_skill:p221");
  expect(
    applyCommand(game, {
      type: "setEquippedSkills",
      actorId: "hero-0",
      skillIds: ["hero_skill:p211", "hero_skill:p214", "hero_skill:p220"],
    }).state,
  ).toBe(game);
});
it.each([1, 2, 3] as const)(
  "Blacksmith %i temporarily upgrades Transform, applies it at embark, and restores the owned original",
  (level) => {
    const d = base.dungeon!,
      game = {
        ...base,
        dungeon: { ...d, buildingLevels: { ...d.buildingLevels, blacksmith: level } },
      };
    const option = blacksmithOptions(game).find((o) => o.command.skillId === "hero_skill:p220")!;
    expect(option).toBeDefined();
    const paid = ok(game, option.command),
      hero = paid.dungeon!.heroes[0]!;
    expect(paid.dungeon!.gold).toBe(99);
    expect(hero.xp).toBe(10);
    expect(hero.nextQuestSkillUpgrades).toEqual([
      {
        originalSkillId: "hero_skill:p220",
        temporarySkillId: level === 1 ? "hero_skill:p221" : "hero_skill:p222",
      },
    ]);
    const applied = applyTemporarySkillUpgrades(paid.dungeon!.heroes, paid.dungeon!.battleCatalog!);
    expect("heroes" in applied).toBe(true);
    if (!("heroes" in applied)) return;
    expect(applied.heroes[0]!.skillIds).toContain(
      level === 1 ? "hero_skill:p221" : "hero_skill:p222",
    );
    const restored = restoreTemporarySkillUpgrades(applied.heroes);
    expect(restored[0]!.skillIds).toContain("hero_skill:p220");
    expect(restored[0]!.nextQuestSkillUpgrades).toBeUndefined();
    if (level === 3) expect(hero.nextQuestProvisionDice).toBe(1);
  },
);
it("Guild upgrades coexist with a real Blacksmith Transform plan, including permanent replacement of its return card (R-080)", () => {
  const paid = ok(base, { type: "visitBlacksmith", actorId: "hero-0", skillId: "hero_skill:p220" });
  // Service-boundary fixture: preserve the paid plan/resources and restore the next visit's actor order.
  let game: GameState = {
    ...paid,
    dungeon: { ...paid.dungeon!, hamlet: { ...base.dungeon!.hamlet! } },
  };
  game = ok(game, visit);
  game = ok(game, choose(game, "upgrade:hero_skill:p211"));
  game = ok(game, choose(game, "upgrade:hero_skill:p220"));
  expect(game.dungeon!.heroes[0]!.nextQuestSkillUpgrades).toEqual([
    { originalSkillId: "hero_skill:p221", temporarySkillId: "hero_skill:p221" },
  ]);
  const applied = applyTemporarySkillUpgrades(game.dungeon!.heroes, game.dungeon!.battleCatalog!);
  expect("heroes" in applied).toBe(true);
  if (!("heroes" in applied)) return;
  expect(restoreTemporarySkillUpgrades(applied.heroes)[0]!.skillIds).toContain("hero_skill:p221");
});
