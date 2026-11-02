import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { continueDeathEstates } from "./hero-death-estate";
import { captureFallenHeroes } from "./fallen-heroes";
import { createBattleState } from "./battle";
import { conditionPoolProblem } from "./conditions";
import { applyCommand, type GameState } from "./command";

function fixture(): GameState {
  const state = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources),
    d = state.dungeon!;
  const pool = d.conditions!,
    hero = d.heroes[0]!;
  return {
    ...state,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h) =>
        h.id === hero.id
          ? {
              ...h,
              dead: true,
              xp: 6,
              stress: 10,
              wounds: 7,
              diseaseId: pool.diseases[0]!.id,
              quirkIds: [
                pool.quirks.find((q) => q.polarity === "negative")!.id,
                pool.quirks.find((q) => q.polarity === "positive")!.id,
              ],
              resolveTested: true,
              resolveCardId: d.resolveCards.find((c) => c.role === "affliction")!.id,
            }
          : h,
      ),
      trinkets: {
        ...d.trinkets!,
        held: [{ heroId: hero.id, cardId: d.trinkets!.cards[0]!.id, face: "inverted" }],
      },
    },
  };
}

it("回收与遗产待选之前保存完整持牌/等级/技能/XP，历史记录不占实体牌", () => {
  const state = fixture(),
    before = structuredClone(state),
    result = continueDeathEstates({ state, events: [] });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  const d = result.state.dungeon!,
    archived = d.fallenHeroes![0]!;
  expect(archived.hero).toEqual(state.dungeon!.heroes[0]);
  expect(archived.trinkets).toEqual(state.dungeon!.trinkets!.held);
  expect(d.heroes[0]).toMatchObject({ diseaseId: null, quirkIds: [] });
  expect(d.heroes[0]!.resolveCardId).toBeUndefined();
  expect(conditionPoolProblem(d.conditions!, d.heroes)).toBeNull();
  expect(d.waitingHeroTokens).toBe(state.dungeon!.waitingHeroTokens);
  expect(result.pendingChoice).toBeDefined();
  expect(state).toEqual(before);
  const capturedBefore = structuredClone(archived);
  const choice = result.pendingChoice!;
  const discarded = applyCommand(result.state, {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: "discard",
  });
  expect(discarded.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(discarded.state.dungeon!.fallenHeroes![0]).toEqual(capturedBefore);
  expect(discarded.state.dungeon!.trinkets!.held).toEqual([]);
  expect(
    continueDeathEstates({ state: discarded.state, events: [] }).state.dungeon!.fallenHeroes,
  ).toEqual([capturedBefore]);
});

it("战斗死亡以战斗实时状态覆盖探索旧值，保留战役技能/XP和饰品朝向", () => {
  const state = fixture(),
    d = state.dungeon!,
    hero = d.heroes[0]!;
  const battle = createBattleState(state.seed, {
    light: 5,
    heroStats: coreQuestSources.catalog.heroStats,
    skills: coreQuestSources.catalog.skills,
    entities: [
      {
        id: hero.id,
        side: "hero",
        hero: "CRUSADER",
        heroStatId: hero.heroStatId!,
        heroLevel: 1,
        life: hero.life!,
        areaId: "F",
        stance: "aggressive",
        wounds: hero.life!,
        stress: 9,
        dead: true,
        diseaseId: hero.diseaseId!,
        quirkIds: hero.quirkIds!,
        resolveTested: true,
        resolveCardId: hero.resolveCardId!,
        skillIds: hero.skillIds!,
        dodge: 0,
        guard: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: [{ id: "F", elevation: "normal", capacity: 4, adjacent: [] }],
    trinkets: d.trinkets!,
    conditions: d.conditions!,
  }).battle!;
  const input = { ...state, battle },
    result = captureFallenHeroes({ state: input, events: [] });
  const archived = result.state.dungeon!.fallenHeroes![0]!;
  expect(archived.hero).toMatchObject({
    xp: 6,
    dead: true,
    wounds: hero.life,
    stress: 9,
    combat: battle.entities[0],
  });
  expect(archived.hero.skillIds).toEqual(hero.skillIds);
  expect(archived.trinkets[0]!.face).toBe("inverted");
  expect(result.state.battle).toBe(battle);
  expect(result.state.dungeon!.cursor).toBe(d.cursor);
  expect(captureFallenHeroes(result)).toBe(result);
  expect(
    captureFallenHeroes({ state: JSON.parse(JSON.stringify(result.state)), events: [] }).state,
  ).toEqual(JSON.parse(JSON.stringify(result.state)));
});

it("无死亡不加空档案；回收失败时档案也原子回滚", () => {
  const alive = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  const original = { state: alive, events: [] };
  expect(captureFallenHeroes(original)).toBe(original);
  const state = fixture(),
    bad = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        conditions: {
          ...state.dungeon!.conditions!,
          diseaseDiscard: [state.dungeon!.heroes[0]!.diseaseId!],
        },
      },
    };
  const result = continueDeathEstates({ state: bad, events: [] });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toBe(bad);
  expect(result.state.dungeon!.fallenHeroes).toBeUndefined();
});
