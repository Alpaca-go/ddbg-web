import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { caretakerBuilding } from "../../../hamlet-event";
import { nextBattleRoll } from "../../../battle-roll";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { naturalQuest } from "../../../test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import { currentHamletHero, hamletActionOptions } from "../../../hamlet-actions";

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
const threat = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
  pounderHamletThreats: true,
} as const;
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
/** 受控日末夹具：前三人已行动、英雄2曾访问轰炸目标；不冒充自然村庄。 */
function fixture(seed = 17, occupied = true): GameState {
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
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
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
const bombs = (events: readonly { message?: string }[]) =>
  events.filter((e) => e.message?.startsWith("Bombardment I："));

it("日末伤害同步英雄/战斗投影，清占用并只掷一次；重复行动拒绝", () => {
  const state = fixture(),
    victim = state.dungeon!.heroes[1]!;
  const result = ok(state, pray(state));
  const hero = result.state.dungeon!.heroes.find((h) => h.id === victim.id)!;
  expect(hero.wounds).toBe(5);
  expect(hero.combat?.wounds).toBe(5);
  expect(result.state.dungeon!.cursor).toBe(1);
  expect(result.state.dungeon!.hamlet).toMatchObject({
    day: 2,
    remainingDays: 1,
    phase: "awaitingCaretaker",
    pounderBuildingHeroes: {},
  });
  expect(bombs(result.events)).toHaveLength(1);
  const repeated = applyCommand(result.state, pray(state));
  expect(repeated.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(repeated.state).toEqual(result.state);
});

it("Caretaker与英雄同处免除，不重掷；空建筑不降到I级以下", () => {
  const state = fixture(),
    hit = caretakerBuilding(nextBattleRoll(state.seed, 0))!;
  const safe = {
    ...state,
    dungeon: { ...state.dungeon!, hamlet: { ...state.dungeon!.hamlet!, caretaker: hit } },
  };
  const result = ok(safe, pray(safe));
  expect(result.state.dungeon!.heroes[1]!.wounds).toBe(0);
  expect(result.state.dungeon!.cursor).toBe(1);
  const empty = fixture(17, false),
    finished = ok(empty, pray(empty));
  expect(finished.state.dungeon!.buildingLevels ?? {}).toEqual({});
});

it("R-222轰炸正伤害合批Fragile追加量，并触发Off Guard承伤被动", () => {
  const base = fixture(),
    d = base.dungeon!,
    ids = ["quirk:p031", "quirk:p021"];
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      conditions: {
        ...d.conditions!,
        negativeDeck: d.conditions!.negativeDeck?.filter((id) => !ids.includes(id)) ?? null,
      },
      heroes: d.heroes.map((h, i) =>
        i === 1 ? { ...h, quirkIds: ids, combat: { ...h.combat!, quirkIds: ids } } : h,
      ),
    },
  };
  const result = ok(state, pray(state));
  expect(result.state.dungeon!.heroes[1]!.wounds).toBe(6);
  expect(result.state.dungeon!.heroes[1]!.stress).toBe(1);
  expect(result.state.dungeon!.heroes[1]!.combat?.wounds).toBe(6);
  expect(result.state.dungeon!.heroes[1]!.combat?.stress).toBe(1);
});

it("实际建筑访问记录占用；未到日末不掷轰炸骰", () => {
  const base = fixture(17, false);
  const state = {
    ...base,
    dungeon: { ...base.dungeon!, gold: 10, hamlet: { ...base.dungeon!.hamlet!, actedHeroes: [] } },
  };
  const actorId = state.dungeon.heroes[0]!.id;
  const result = ok(state, {
    type: "visitHamletBuilding",
    actorId,
    serviceId: "survivalist1",
    quirkIds: [],
  });
  expect(result.state.dungeon!.hamlet!.pounderBuildingHeroes).toEqual({ survivalist: actorId });
  expect(result.state.dungeon!.cursor).toBe(0);
  expect(bombs(result.events)).toHaveLength(0);
});

it("固定0–6空建筑夹具：可升级建筑只降一级，其余不假造建筑等级", () => {
  let downgrades = 0;
  for (const level of [2, 3] as const)
    for (let seed = 0; seed <= 6; seed++) {
      const base = fixture(seed, false);
      const levels = {
        survivalist: level,
        tavern: level,
        sanitarium: level,
        abbey: level,
        stagecoach: level,
        blacksmith: level,
        nomadWagon: level,
      };
      const state: GameState = { ...base, dungeon: { ...base.dungeon!, buildingLevels: levels } };
      const hit = caretakerBuilding(nextBattleRoll(seed, 0))!;
      const result = ok(state, pray(state));
      const key = Object.keys(levels).find((id) => id === hit) as keyof typeof levels | undefined;
      expect(result.state.dungeon!.buildingLevels).toEqual(
        key ? { ...levels, [key]: level - 1 } : levels,
      );
      if (key) downgrades++;
      expect(result.state.dungeon!.cursor).toBe(1);
    }
  expect(downgrades).toBeGreaterThan(0);
});

it("最后行动Intimidate移走Caretaker后不再免除轰炸", () => {
  const base = fixture(),
    d = base.dungeon!,
    order = d.heroes.map((h) => h.id);
  const hit = caretakerBuilding(nextBattleRoll(base.seed, 0))!;
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        caretaker: hit,
        heroOrder: [order[0]!, order[2]!, order[3]!, order[1]!],
        actedHeroes: [order[0]!, order[2]!, order[3]!],
        pounderBuildingHeroes: { [hit]: order[2]! },
      },
    },
  };
  const result = ok(state, { type: "useHamletSkill", actorId: order[1]!, skill: "intimidate" });
  expect(result.state.dungeon!.heroes[2]!.wounds).toBe(5);
  expect(result.state.dungeon!.cursor).toBe(1);
});

it("固定0–6死门夹具全部保留：死亡/存活均只掷一次死门，死亡续接不重掷轰炸", () => {
  const outcomes = new Set<boolean>();
  let deadState: GameState | undefined;
  for (let seed = 0; seed <= 6; seed++) {
    const base = fixture(seed);
    const state = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        heroes: base.dungeon!.heroes.map((h, i) =>
          i === 1 ? { ...h, wounds: h.life!, combat: { ...h.combat!, wounds: h.life! } } : h,
        ),
      },
    };
    const result = ok(state, pray(state));
    const d = result.state.dungeon!;
    const dead = d.heroes[1]!.dead ?? false;
    outcomes.add(dead);
    expect(d.cursor).toBe(2);
    expect(d.hamlet!.remainingDays).toBe(1);
    if (dead) {
      expect(d.phase).toBe("awaitingReplacement");
      expect(d.replacementResume).toBe("hamletThreat");
      deadState ??= result.state;
    }
  }
  expect([...outcomes].sort()).toEqual([false, true]);
  let state = deadState!;
  const cursor = state.dungeon!.cursor;
  for (let i = 0; i < 15 && state.dungeon!.phase !== "inHamlet"; i++) {
    const d = state.dungeon!;
    const choice = d.deathTrinketChoice ?? d.replacementPreparation?.choice ?? d.pending;
    const command: Command = choice
      ? { type: "resolveChoice", choiceId: choice.id, optionId: choice.options[0]!.id }
      : d.preparedReplacements?.length
        ? { type: "joinPreparedReplacements" }
        : { type: "prepareReplacementHero" };
    const result = ok(state, command);
    expect(bombs(result.events)).toHaveLength(0);
    state = result.state;
  }
  expect(state.dungeon!.phase).toBe("inHamlet");
  expect(state.dungeon!.hamlet!.remainingDays).toBe(1);
  expect(state.dungeon!.cursor).toBeGreaterThanOrEqual(cursor);
});

it("新村庄版本要求地牢版本；无效游标原子回滚行动与骰序", () => {
  const base = initial();
  const refused = applyCommand(base, {
    type: "establishImminentThreat",
    pounderHamletThreats: true,
  });
  expect(refused.state).toEqual(base);
  const state = fixture();
  const invalid = { ...state, dungeon: { ...state.dungeon!, cursor: -1 } };
  const result = applyCommand(invalid, pray(invalid));
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toEqual(invalid);
});

it("固定seed17原策略：普通任务→回村→逐日村庄，完整新日志严格恢复", () => {
  const entered = ok(initial(), threat);
  const run = naturalQuest(17, "quest:p001", true, coreQuestSources, 2, {
    continueFrom: entered.state,
  });
  expect(run.stopReason).toBeNull();
  let state = run.state;
  const commands: Command[] = [threat, ...run.commands];
  let bombardments = 0,
    stop: string | null = null;
  const step = (command: Command) => {
    const result = ok(state, command);
    state = result.state;
    commands.push(command);
    bombardments += bombs(result.events).length;
  };
  const settle = () => {
    for (let i = 0; i < 40 && state.dungeon!.pending; i++) {
      const p = state.dungeon!.pending!;
      step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
    }
  };
  step({ type: "beginReturnToHamlet" });
  settle();
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  settle();
  for (let i = 0; i < 100 && state.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      settle();
      continue;
    }
    const actorId = currentHamletHero(state)?.id;
    if (!actorId) {
      stop = state.dungeon!.phase;
      break;
    }
    const speech: Command = { type: "useHamletSkill", actorId, skill: "zealousSpeech" };
    const legal = !applyCommand(state, speech).events.some((e) => e.type === "commandRefused");
    const service = hamletActionOptions(state)
      .map((o) => o.command)
      .find((c) => c.type === "visitHamletBuilding");
    if (legal) step(speech);
    else if (service) step(service);
    else {
      stop = "村庄无可用建筑服务";
      break;
    }
    settle();
  }
  expect({
    phase: state.dungeon!.phase,
    hamlet: state.dungeon!.hamlet!.phase,
    bombardments,
    stop,
  }).toMatchSnapshot();
  expect(bombardments).toBeGreaterThan(0);
  expect(state.dungeon!.hamlet!.phase).toBe("preparationComplete");
  step({ type: "offerNextQuest" });
  settle();
  expect(state.dungeon!.pounderHamletThreats).toBe(true);
  expect(state.dungeon!.pounderDungeonThreats).toBe(true);
  expect(state.dungeon!.phase).toBe("awaitingProvisions");
  const start = {
    seed: 17,
    questId: "quest:p001",
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
  } as Parameters<typeof createQuestSave>[0];
  const save = createQuestSave(start, commands, state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(state);
}, 180000);
