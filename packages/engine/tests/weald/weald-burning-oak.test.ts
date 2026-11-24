import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../src/shared/core/command";
import { wealdOakBattleFixture } from "../helpers/weald-oak-battle";
import { endAfterCasualties, removeCasualties } from "../../src/shared/dungeon/encounter";
import { dungeonMonsterPoolThrough } from "../../src/shared/core/monster-pool-runtime";
function step(game: GameState, cmd: Parameters<typeof applyCommand>[1]) {
  const r = applyCommand(game, cmd);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}
function light(game: GameState) {
  return step(game, {
    type: "igniteWealdOak",
    actorId: game.battle!.entities.find((e) => e.side === "hero")!.id,
  }).state;
}
function wipe(game: GameState) {
  const ids = game.battle!.entities.filter((e) => e.side === "monster" && !e.dead).map((e) => e.id);
  return removeCasualties(
    {
      state: {
        ...game,
        battle: {
          ...game.battle!,
          entities: game.battle!.entities.map((e) =>
            ids.includes(e.id) ? { ...e, dead: true, wounds: e.life! } : e,
          ),
        },
      },
      events: [],
    },
    ids,
  );
}
function roundEnd(game: GameState) {
  let r = step(
    {
      ...game,
      battle: {
        ...game.battle!,
        encounter: { ...game.battle!.encounter!, deck: [], turn: { type: "awaitingInitiative" } },
      },
    },
    { type: "drawInitiative" },
  );
  for (let i = 0; r.pendingChoice && i < 20; i++) {
    const p = r.pendingChoice;
    const restored = JSON.parse(JSON.stringify(r.state)) as GameState;
    const cmd = { type: "resolveChoice" as const, choiceId: p.id, optionId: p.options[0]!.id };
    const next = step(r.state, cmd);
    expect(applyCommand(restored, cmd).state).toEqual(next.state);
    r = next;
  }
  expect(r.pendingChoice).toBeUndefined();
  return r.state;
}
it("点火后提前全灭仍等下一轮末，点火轮末补满，烧毁后才胜利交接", () => {
  const original = wealdOakBattleFixture();
  let game = light(original);
  expect(game.battle!.provisions).toEqual([]);
  expect(game.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
  let dead = wipe(game);
  expect(endAfterCasualties(dead)).toBeNull();
  game = roundEnd(dead.state);
  expect(game.battle!.encounter!.round).toBe(2);
  expect(
    game
      .battle!.entities.filter((e) => e.side === "monster" && !e.dead)
      .reduce((n, e) => n + (e.stanceSlots ?? 1), 0),
  ).toBe(4);
  expect(game.dungeon!.wealdBurnedOakRoomIds).toBeUndefined();
  dead = wipe(game);
  expect(endAfterCasualties(dead)).toBeNull();
  game = roundEnd(dead.state);
  expect(game.battle!.encounter!.turn).toMatchObject({ type: "finished", outcome: "victory" });
  expect(game.dungeon!.wealdBurnedOakRoomIds).toEqual([game.dungeon!.position]);
  expect(game.dungeon!.rooms.find((r) => r.id === game.dungeon!.position)!.cleared).toBeFalsy();
  game = step(game, { type: "finishDungeonBattle" }).state;
  expect(game.dungeon!.rooms.find((r) => r.id === game.dungeon!.position)!.cleared).toBe(true);
  expect(game.dungeon!.monsterPool!.remaining).toHaveLength(
    dungeonMonsterPoolThrough(game.dungeon!.monsterPool!, 3).length,
  );
});
it("第3轮点火，第4轮末烧毁但怪仍在则逃跑，目标XP保留且房间未清", () => {
  let game = roundEnd(light(wealdOakBattleFixture(3)));
  expect(game.battle!.encounter!.round).toBe(4);
  const living = game
    .battle!.entities.filter((e) => e.side === "monster" && !e.dead)
    .map((e) => e.id);
  game = roundEnd(game);
  expect(game.battle!.encounter!.turn).toMatchObject({ type: "finished", outcome: "retreat" });
  expect(
    game.battle!.entities.filter((e) => e.side === "monster" && !e.dead).map((e) => e.id),
  ).toEqual(living);
  game = step(game, { type: "finishDungeonBattle" }).state;
  expect(game.dungeon!.rooms.find((r) => r.id === game.dungeon!.position)!.cleared).toBeFalsy();
  const summary = step(
    { ...game, dungeon: { ...game.dungeon!, phase: "exited" } },
    { type: "summarizeDungeonQuest" },
  );
  expect(summary.state.dungeon!.questSummary).toMatchObject({ taskProgress: 1, xpPerHero: 1 });
});
it("第4轮点火原子拒绝；未点燃全灭正常结束但不清目标", () => {
  const game = wealdOakBattleFixture(4),
    actorId = game.battle!.entities[0]!.id;
  const refused = applyCommand(game, { type: "igniteWealdOak", actorId });
  expect(refused.state).toBe(game);
  expect(refused.events[0]!.type).toBe("commandRefused");
  const dead = wipe(wealdOakBattleFixture());
  expect(endAfterCasualties(dead)!.state.battle!.encounter!.turn).toMatchObject({
    type: "finished",
    outcome: "victory",
  });
});

it("烧毁时仍有怪物，目标记账但战斗继续到第3轮", () => {
  let game = roundEnd(light(wealdOakBattleFixture()));
  const ids = game.battle!.entities.filter((e) => e.side === "monster" && !e.dead).map((e) => e.id);
  game = roundEnd(game);
  expect(game.battle!.wealdOakBurnt).toBe(true);
  expect(game.battle!.encounter!.round).toBe(3);
  expect(game.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  expect(
    game.battle!.entities.filter((e) => e.side === "monster" && !e.dead).map((e) => e.id),
  ).toEqual(ids);
});

it("轮末补怪挤占待选保存队列，JSON续接不重复抽牌", () => {
  let game = wipe(light(wealdOakBattleFixture())).state;
  const b = game.battle!,
    area = b.monsterStanceAreas!.aggressive!;
  game = {
    ...game,
    battle: {
      ...b,
      entities: b.entities.map((e) => (e.side === "hero" ? { ...e, areaId: area } : e)),
      areas: b.areas.map((a) => (a.id === area ? { ...a, capacity: 4 } : a)),
      encounter: { ...b.encounter!, deck: [], turn: { type: "awaitingInitiative" } },
    },
  };
  let r = step(game, { type: "drawInitiative" });
  expect(r.state.battle!.pending?.type).toBe("wealdOakRefill");
  const remaining = r.state.dungeon!.monsterPool!.remaining;
  for (let i = 0; r.pendingChoice && i < 20; i++) {
    const p = r.pendingChoice,
      restored = JSON.parse(JSON.stringify(r.state)) as GameState;
    const cmd = { type: "resolveChoice" as const, choiceId: p.id, optionId: p.options[0]!.id };
    r = step(r.state, cmd);
    expect(applyCommand(restored, cmd).state).toEqual(r.state);
  }
  expect(r.state.battle!.encounter!.round).toBe(2);
  expect(r.state.dungeon!.monsterPool!.remaining).toEqual(remaining);
});
