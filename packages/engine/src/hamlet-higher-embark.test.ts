import { beforeAll, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { ownedHeroSkills } from "./hero-loadout";
import { coreQuestSources } from "./test-helpers/core-quest";
import { guildQuest } from "./test-helpers/guild-quest";

let baseline: ReturnType<typeof guildQuest>;
beforeAll(() => {
  baseline = guildQuest();
}, 30000);

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

/** 明示准备结束夹具：不改 XP/金币/牌序，只收束到可出征。 */
function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

/**
 * 明示 4XP/金币夹具供 Guild 升 II（自然两任务 4XP 已由 #194 验收）。
 * 本主题只验高等级出征门与战斗交接。
 */
function withUpgradeResources(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      gold: Math.max(d.gold, 2),
      heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, xp: 4 } : h)),
      hamlet: { ...d.hamlet!, blockedBuildings: [] },
    },
  };
}

function upgradeHero0FillSlots(game: GameState) {
  let next = ok(withUpgradeResources(game), { type: "visitGuild", actorId: "hero-0" });
  next = ok(next, {
    type: "resolveChoice",
    choiceId: next.dungeon!.pending!.id,
    optionId: "upgrade-hero",
  });
  if (next.dungeon!.pending)
    next = ok(next, {
      type: "resolveChoice",
      choiceId: next.dungeon!.pending!.id,
      optionId: "leave",
    });
  const hero = next.dungeon!.heroes[0]!;
  expect(hero).toMatchObject({ level: 2, heroStatId: "hero_stat:p001:back", life: 24 });
  expect(hero.skillIds).toHaveLength(3);
  const owned = ownedHeroSkills(hero, next.dungeon!.battleCatalog!)!;
  const four = [...hero.skillIds!, owned.find((s) => !hero.skillIds!.includes(s.id))!.id];
  next = ok(next, { type: "setEquippedSkills", actorId: "hero-0", skillIds: four });
  return next;
}

it("升II后未装满2+HL技能槽拒绝出征；装满后可出征下一I级任务并保留II属性（R-051）", () => {
  const before = structuredClone(baseline.game);
  const upgraded = upgradeHero0FillSlots(baseline.game);
  const shortSlots: GameState = {
    ...upgraded,
    dungeon: {
      ...upgraded.dungeon!,
      heroes: upgraded.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, skillIds: h.skillIds!.slice(0, 3) } : h,
      ),
    },
  };
  const readyShort = preparationReady(shortSlots);
  expect(applyCommand(readyShort, { type: "offerNextQuest" }).state).toBe(readyShort);

  const ready = preparationReady(upgraded);
  const offered = ok(ready, { type: "offerNextQuest" });
  expect(offered.dungeon!.nextQuestOffers!.length).toBeGreaterThanOrEqual(1);
  expect(offered.dungeon!.nextQuestOffers!.length).toBeLessThanOrEqual(2);
  const chosen = offered.dungeon!.nextQuestOffers![0]!;
  const embarked = ok(offered, {
    type: "resolveChoice",
    choiceId: offered.dungeon!.pending!.id,
    optionId: chosen,
  });
  expect(embarked.dungeon!.phase).toBe("awaitingProvisions");
  expect(embarked.dungeon!.rest?.questId).toBe(chosen);
  expect(embarked.dungeon!.heroes[0]).toMatchObject({
    level: 2,
    heroStatId: "hero_stat:p001:back",
    life: 24,
    attributesVerified: true,
  });
  expect(embarked.dungeon!.heroes[0]!.skillIds).toHaveLength(4);
  expect(embarked.dungeon!.heroes.slice(1).every((h) => h.level === 1)).toBe(true);
  expect(baseline.game).toEqual(before);

  let replayed = preparationReady(upgradeHero0FillSlots(baseline.game));
  replayed = ok(replayed, { type: "offerNextQuest" });
  expect(replayed.dungeon!.nextQuestOffers).toEqual(offered.dungeon!.nextQuestOffers);
  replayed = ok(replayed, {
    type: "resolveChoice",
    choiceId: replayed.dungeon!.pending!.id,
    optionId: chosen,
  });
  expect(replayed).toEqual(embarked);
}, 60000);

it("II级英雄带4个装备技能可通过真实房间战斗交接（R-048、R-051、R-081）", () => {
  const catalog = coreQuestSources.catalog;
  const names = ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"] as const;
  const heroes = names.map((name, i) => {
    const level = i === 0 ? 2 : 1;
    const stat = catalog.heroStats.find((s) => s.name === name && s.level === level)!;
    const skillIds = catalog.skills
      .filter((s) => s.hero === name && s.level === 1 && !s.verification.unverified)
      .slice(0, 2 + level)
      .map((s) => s.id);
    return {
      id: `hero-${i}`,
      heroStatId: stat.id,
      level,
      life: stat.life,
      wounds: 0,
      stress: 0,
      attributesVerified: true as const,
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      skillIds,
    };
  });
  expect(heroes[0]!.skillIds).toHaveLength(4);
  const initial = createDungeonSandbox(
    35,
    layout,
    distribution,
    "radiant",
    "D",
    heroes,
    JSON.parse(JSON.stringify(coreQuestSources.resolveCards)),
    { dungeonLevel: 1, light: 5, provisions: [{ id: "food", face: "food" }] },
    coreQuestSources.curios,
    coreQuestSources.rooms,
    coreQuestSources.monsters,
    catalog,
  );
  const awaiting = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      phase: "awaitingRoom" as const,
      rooms: initial.dungeon!.rooms.map((r) =>
        r.id === "D" ? { ...r, kind: "treasure" as const } : r,
      ),
    },
  };
  const prepared = ok(awaiting, { type: "prepareDungeonBattle" });
  const deployed = ok(prepared, { type: "prepareDungeonMonsters" });
  const entered = ok(deployed, { type: "startDungeonBattle" });
  const entity = entered.battle!.entities.find((e) => e.id === "hero-0")!;
  expect(entity).toMatchObject({
    heroLevel: 2,
    life: 24,
    heroStatId: "hero_stat:p001:back",
    dead: false,
  });
  expect(entity.skillIds).toHaveLength(4);

  const short = {
    ...deployed,
    dungeon: {
      ...deployed.dungeon!,
      heroes: deployed.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, skillIds: h.skillIds!.slice(0, 3) } : h,
      ),
    },
  };
  expect(applyCommand(short, { type: "startDungeonBattle" }).state).toBe(short);
});
