import { describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { nextBattleRoll } from "../battle-roll";
import { hamletActionOptions } from "../hamlet-actions";
import { savedCommandSchema } from "../../../data/src/quest-save";
import { NECROMANCER_II_SCRIPT_ID } from "./necromancer-ii";
import { isHauntedGraveyardGuard } from "./necromancer-ii-graveyard";

const ids = ["h0", "h1", "h2", "h3"];
function setup(tie = false): GameState {
  const seed = Array.from({ length: 500 }, (_, i) => i).find((seed) => {
    const rolls = ids.map((_, i) => nextBattleRoll(seed, i));
    return (
      rolls[0] === Math.min(...rolls) && rolls.filter((r) => r === rolls[0]).length > 1 === tie
    );
  })!;
  const base = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      phase: "inHamlet",
      pending: null,
      cursor: 0,
      gold: 10,
      questSummary: {
        questId: "quest:p001",
        name: "Scout Ahead I",
        clearedRoomIds: [],
        xpPerHero: 0,
        stagecoachXp: 0,
        awarded: true,
      },
      heroes: base.dungeon!.heroes.map((h, i) => ({ ...h, id: ids[i]! })),
      campaignLevel: 2,
      activeBossThreatScriptId: NECROMANCER_II_SCRIPT_ID,
      imminentThreatDescriptionCardId: "boss_ability:p002",
      hamletReturn: { phase: "complete", order: ids, resolveRoles: {}, convertedHeroIds: [] },
      hamlet: {
        phase: "awaitingCaretaker",
        deck: [],
        permanentlyRemoved: [],
        last: "hamlet_event:p001",
        active: null,
        preparationDays: 2,
        day: 1,
        noCaretaker: true,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        heroOrder: [],
      },
    },
  };
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
const roll: Command = { type: "rollHamletCaretaker" };
const guard: Command = {
  type: "visitHamletBuilding",
  actorId: "h0",
  serviceId: "graveyardGuard",
  quirkIds: [],
};
const virtue: Command = { ...guard, serviceId: "graveyardVirtue" };

describe("C-019 / R-125 · Haunted Graveyard", () => {
  it("唯一最低：姿态序四骰一次，输入不变、确定性与 JSON 往返，重复首日命令拒绝", () => {
    const initial = setup(),
      before = structuredClone(initial),
      result = ok(initial, roll);
    expect(initial).toEqual(before);
    expect(result).toEqual(ok(JSON.parse(JSON.stringify(initial)), roll));
    expect(result.state.dungeon!.cursor).toBe(4);
    expect(result.state.dungeon!.hamlet!.hauntedGraveyard).toEqual({
      guardHeroId: "h0",
      rolls: ids.map((heroId, i) => ({ heroId, roll: nextBattleRoll(initial.seed, i) })),
    });
    expect(applyCommand(result.state, roll).state).toBe(result.state);
  });
  it("并列只给最低者待选，冻结其它命令；选择不重掷，旧选择拒绝", () => {
    const result = ok(setup(true), roll),
      state = result.state;
    const minimum = Math.min(...state.dungeon!.hamlet!.hauntedGraveyard!.rolls.map((r) => r.roll));
    expect(result.pendingChoice!.options.map((o) => o.id)).toEqual(
      ids.filter((_, i) => nextBattleRoll(state.seed, i) === minimum),
    );
    expect(applyCommand(state, guard).state).toBe(state);
    expect(
      applyCommand(state, { type: "setHamletStances", heroIds: [...ids].reverse() }).state,
    ).toBe(state);
    const choice: Command = {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: result.pendingChoice!.options.at(-1)!.id,
    };
    expect(applyCommand(state, { ...choice, optionId: "not-a-hero" }).state).toBe(state);
    const done = ok(state, choice);
    expect(done).toEqual(ok(JSON.parse(JSON.stringify(state)), choice));
    expect(done.state.dungeon!.cursor).toBe(4);
    expect(done.state.dungeon!.hamlet!.hauntedGraveyard!.guardHeroId).toBe(choice.optionId);
    expect(applyCommand(done.state, choice).state).toBe(done.state);
  });
  it.each(["blocked", "visited", "weekBlocked"])(
    "%s：服务拒绝、仅守卫仍完成一次行动，不抽美德或花金币",
    (mode) => {
      const base = ok(setup(), roll).state,
        h = base.dungeon!.hamlet!;
      const state: GameState = {
        ...base,
        dungeon: {
          ...base.dungeon!,
          hamlet: {
            ...h,
            blockedBuildings: mode === "visited" ? [] : ["graveyard"],
            visitedBuildings: mode === "visited" ? ["graveyard"] : [],
            ...(mode === "weekBlocked" ? { weekBlockedBuildings: ["graveyard"] } : {}),
          },
        },
      };
      expect(applyCommand(state, virtue).state).toBe(state);
      expect(hamletActionOptions(state).map((o) => o.command)).toEqual([guard]);
      const done = ok(state, guard);
      expect(done.state.dungeon!.heroes).toEqual(state.dungeon!.heroes);
      expect(done.state.dungeon!.cursor).toBe(4);
      expect(done.state.dungeon!.gold).toBe(10);
      expect(done.state.dungeon!.hamlet!.actedHeroes).toEqual(["h0"]);
      expect(done.state.dungeon!.hamlet!.visitedBuildings).toEqual(["graveyard"]);
      expect(applyCommand(done.state, guard).state).toBe(done.state);
      expect(savedCommandSchema.parse(guard)).toEqual(guard);
    },
  );
  it("可用服务仍走真实美德牌堆和每日一次占用，不额外再花守卫行动", () => {
    const state = ok(setup(), roll).state,
      result = ok(state, virtue);
    expect(result.state.dungeon!.heroes[0]!.resolveCardId).toBeTruthy();
    expect(result.state.dungeon!.hamlet!.actedHeroes).toEqual(["h0"]);
    expect(result.state.dungeon!.hamlet!.visitedBuildings).toEqual(["graveyard"]);
    expect(applyCommand(result.state, { ...virtue, actorId: "h1" }).state).toBe(result.state);
  });
  it("看守人实际封锁墓地后仍可守卫，四个守卫骰接在看守人骰之后", () => {
    const seed = Array.from({ length: 1000 }, (_, i) => i).find((s) => {
      const rolls = ids.map((_, i) => nextBattleRoll(s, i + 1));
      return nextBattleRoll(s, 0) === 6 && rolls.slice(1).every((r) => r > rolls[0]!);
    })!;
    expect(seed).toBeDefined();
    const base = setup();
    const state = ok(
      {
        ...base,
        seed,
        dungeon: { ...base.dungeon!, hamlet: { ...base.dungeon!.hamlet!, noCaretaker: false } },
      },
      roll,
    ).state;
    expect(state.dungeon!.hamlet!.caretaker).toBe("graveyard");
    expect(state.dungeon!.cursor).toBe(5);
    expect(applyCommand(state, virtue).state).toBe(state);
    expect(ok(state, guard).state.dungeon!.cursor).toBe(5);
  });
  it("另一英雄先用墓地服务后，指定守卫仍能完成守卫，但不再抽第二张美德", () => {
    const rolled = ok(setup(), roll).state;
    const reordered = ok(rolled, {
      type: "setHamletStances",
      heroIds: ["h1", "h0", "h2", "h3"],
    }).state;
    const visited = ok(reordered, { ...virtue, actorId: "h1" }).state;
    expect(visited.dungeon!.heroes.find((h) => h.id === "h1")!.resolveCardId).toBeTruthy();
    expect(hamletActionOptions(visited).map((o) => o.command)).toEqual([guard]);
    const done = ok(visited, guard).state;
    expect(done.dungeon!.heroes.find((h) => h.id === "h0")!.resolveCardId).toBeFalsy();
    expect(done.dungeon!.cursor).toBe(visited.dungeon!.cursor);
    expect(done.dungeon!.hamlet!.actedHeroes).toEqual(["h1", "h0"]);
  });
  it("不能访问其它建筑、用村庄技能或提前结束首日绕过；换位后仍是同一英雄守卫", () => {
    const state = ok(setup(), roll).state;
    for (const command of [
      { type: "visitGuild", actorId: "h0" },
      { type: "visitNomadWagon", actorId: "h0" },
      { type: "visitBlacksmith", actorId: "h0", skillId: "hero_skill:p001" },
      { type: "useHamletSkill", actorId: "h0", skill: "zealousSpeech" },
      { ...guard, serviceId: "tavern3" },
    ] as const)
      expect(applyCommand(state, command).state).toBe(state);
    const reordered = ok(state, { type: "setHamletStances", heroIds: [...ids].reverse() }).state;
    expect(reordered.dungeon!.hamlet!.hauntedGraveyard!.guardHeroId).toBe("h0");
    expect(
      applyCommand(reordered, { type: "useHamletSkill", actorId: "h3", skill: "zealousSpeech" })
        .state,
    ).toBe(reordered);
    expect(applyCommand(reordered, { ...guard, actorId: "h3" }).state).toBe(reordered);
  });
  it("第二天不再掷守卫骰，不继续强制；I 级不产生义务或额外 RNG", () => {
    const state = ok(setup(), roll).state;
    const day2: GameState = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        hamlet: {
          ...state.dungeon!.hamlet!,
          day: 2,
          phase: "awaitingCaretaker",
          heroOrder: [],
          actedHeroes: [],
        },
      },
    };
    const next = ok(day2, roll);
    expect(next.state.dungeon!.cursor).toBe(4);
    expect(
      hamletActionOptions(next.state).some(
        (o) => o.command.type === "visitHamletBuilding" && o.command.serviceId === "graveyardGuard",
      ),
    ).toBe(false);
    const initial = setup();
    const ordinary = ok(
      {
        ...initial,
        dungeon: {
          ...initial.dungeon!,
          campaignLevel: 1,
          activeBossThreatScriptId: "boss:ruins:necromancer:1",
        },
      },
      roll,
    );
    expect(ordinary.state.dungeon!.cursor).toBe(0);
    expect(ordinary.state.dungeon!.hamlet!.hauntedGraveyard).toBeUndefined();
  });
  it("R-092：守卫阵亡后取消个人义务，替补不继承旧身份的守卫", () => {
    const d = ok(setup(), roll).state.dungeon!;
    expect(
      isHauntedGraveyardGuard(
        { ...d, heroes: d.heroes.map((h) => (h.id === "h0" ? { ...h, dead: true } : h)) },
        "h0",
      ),
    ).toBe(false);
    expect(
      isHauntedGraveyardGuard(
        { ...d, heroes: d.heroes.map((h) => (h.id === "h0" ? { ...h, id: "replacement" } : h)) },
        "replacement",
      ),
    ).toBe(false);
  });
  it("公开升幕抽牌激活 II，描述卡与实际脚本一致；其它 II 仍保留停点", () => {
    const outputs = Array.from({ length: 12 }, (_, seed) => {
      const base = createCoreDungeonQuest(
        seed,
        "quest:p001",
        "radiant",
        coreParty,
        coreQuestSources,
      );
      return ok(
        {
          ...base,
          dungeon: { ...base.dungeon!, campaignLevel: 2, defeatedRuinsBossIdentities: ["prophet"] },
        },
        { type: "drawImminentThreatAfterActAdvance" },
      ).state.dungeon!;
    });
    const necro = outputs.find((d) => d.imminentThreatDescriptionCardId === "boss_ability:p002")!;
    expect(necro.activeBossThreatScriptId).toBe(NECROMANCER_II_SCRIPT_ID);
    expect(necro.unregisteredImminentThreatHold).toBeUndefined();
    expect(
      outputs.some(
        (d) =>
          d.imminentThreatDescriptionCardId !== "boss_ability:p002" &&
          !d.activeBossThreatScriptId &&
          d.unregisteredImminentThreatHold,
      ),
    ).toBe(true);
  });
});
