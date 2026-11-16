import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { caretakerBuilding } from "../../../hamlet-event";
import { nextBattleRoll } from "../../../battle-roll";
import { createBattleState, type BattleEntity } from "../../../battle";
import { applyPounderIRangedEntry } from "./pounder-i-dungeon-threat";
import { pounderContextForLevel } from "./pounder-runtime-context";

const packs = ["core", "weald"] as const;
const initial = (seed = 17) =>
  createCoreDungeonQuest(
    seed,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
/** 受控日末夹具：前三人已行动、英雄2曾访问轰炸目标；不冒充自然村庄。 */
function fixture(level: 2 | 3, seed = 17, occupied = true): GameState {
  const base = initial(seed),
    d = base.dungeon!;
  const order = d.heroes.map((hero) => hero.id);
  const hit = caretakerBuilding(nextBattleRoll(seed, 0))!;
  return {
    ...base,
    dungeon: {
      ...d,
      heroes: d.heroes.map((hero, i) => ({
        ...hero,
        combat: {
          id: hero.id,
          side: "hero",
          hero: coreQuestSources.catalog.heroStats.find((s) => s.id === hero.heroStatId)!.name,
          heroStatId: hero.heroStatId!,
          heroLevel: 1,
          life: hero.life!,
          wounds: hero.wounds!,
          stress: hero.stress,
          dodge: 0,
          areaId: "fixture",
          stance: coreParty[i]!.stance,
          skillIds: [...coreParty[i]!.skillIds],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
          statusStacks: [],
        },
      })),
      phase: "inHamlet",
      cursor: 0,
      pounderDungeonThreats: true,
      pounderHamletThreats: true,
      activeBossThreatScriptId: `boss:weald:brigandPounder:${level}`,
      wealdHigherBosses: true,
      campaignLevel: level,
      imminentThreatDescriptionCardId: `boss_ability:weald:p00${6 + level}`,
      hamletReturn: { phase: "complete", order, resolveRoles: {}, convertedHeroIds: [] },
      hamlet: {
        deck: [],
        permanentlyRemoved: [],
        active: null,
        last: "fixture",
        phase: "heroActions",
        preparationDays: 2,
        remainingDays: 2,
        day: 1,
        noCaretaker: false,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        heroOrder: order,
        actedHeroes: order.slice(0, 3),
        visitedBuildings: occupied ? [hit] : [],
        pounderBuildingHeroes: occupied ? { [hit]: order[1]! } : {},
      },
    },
  };
}
const pray = (state: GameState): Command => ({
  type: "useHamletSkill",
  actorId: state.dungeon!.heroes[3]!.id,
  skill: "pray",
});
describe.each([2, 3] as const)("R-268 Pounder %i 级威胁", (level) => {
  it("公开村庄日末仅一骰，按实际7／9伤口处理，并同步英雄与战斗快照", () => {
    const state = fixture(level);
    const victimId = state.dungeon!.heroes[1]!.id;
    const result = ok(state, pray(state));
    const hero = result.state.dungeon!.heroes.find((h) => h.id === victimId)!;
    expect(hero.wounds).toBe(level === 2 ? 7 : 9);
    expect(hero.combat!.wounds).toBe(hero.wounds);
    expect(result.state.dungeon!.cursor).toBe(1);
    expect(applyCommand(result.state, pray(state)).state).toBe(result.state);
  });
  it("Caretaker和英雄同处时优先免除，空建筑仍只降一级并封底", () => {
    const state = fixture(level);
    const hit = caretakerBuilding(nextBattleRoll(state.seed, 0))!;
    const safe: GameState = {
      ...state,
      dungeon: { ...state.dungeon!, hamlet: { ...state.dungeon!.hamlet!, caretaker: hit } },
    };
    expect(ok(safe, pray(safe)).state.dungeon!.heroes[1]!.wounds).toBe(0);
    const empty = fixture(level, 17, false);
    expect(ok(empty, pray(empty)).state.dungeon!.buildingLevels ?? {}).toEqual({});
  });
  it("进入姿态轨Ranged才加Buff／Riposte，II各2t、III各3t，不重复刷新", () => {
    const source = fixture(level);
    const context = pounderContextForLevel(level);
    const card = context.catalog[0]!;
    const monster: BattleEntity = {
      id: "m",
      side: "monster",
      hero: null,
      monsterCardId: card.id,
      life: card.life,
      dodge: card.dodge!,
      wounds: 0,
      guard: false,
      dead: false,
      areaId: "a",
      stance: "defensive",
      stanceSlots: 1,
      bleed: [],
      blight: [],
      statusStacks: [],
      skillIds: [],
    };
    const battle = createBattleState(17, {
      entities: [monster],
      monsters: context.catalog,
      areas: [{ id: "a", elevation: "normal", adjacent: [] }],
      skills: [],
      light: 5,
    }).battle!;
    const before: GameState = { ...source, battle };
    const after: GameState = {
      ...before,
      battle: { ...battle, entities: [{ ...monster, stance: "ranged" }] },
    };
    const applied = applyPounderIRangedEntry(before, { state: after, events: [] });
    expect(applied.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "buff", remaining: level },
      { kind: "riposte", remaining: level },
    ]);
    expect(applyPounderIRangedEntry(applied.state, applied).state).toEqual(applied.state);
    expect(applied.state.battle!.rngCursor).toBe(before.battle!.rngCursor);
  });
});
