import { playNaturalBattle } from "../../helpers/natural-battle";
import { closeBattleLoot } from "../../../src/shared/trinkets/loot";
import { expect, it } from "vitest";
import { applyCommand, type GameState, type Command } from "../../../src/shared/core/command";
import { shriekerMechanismFixture } from "../../helpers/shrieker-i";
import { removeCasualties } from "../../../src/shared/dungeon/encounter";

it("R-262 正式版本可开战、移除 Nest 后切回印刷 Push 2；Boss 死亡后交接不额外消费牌池", () => {
  const { started } = shriekerMechanismFixture();
  expect(started.battle!.encounter!.deck.filter((s) => s === "monster")).toHaveLength(3);
  expect(started.dungeon!.bossCombatThreatCeased).toBe("boss:weald:shrieker:1");
  const nestDead = {
    ...started,
    battle: {
      ...started.battle!,
      entities: started.battle!.entities.map((e) =>
        e.id === "boss:shrieker:nest" ? { ...e, dead: true } : e,
      ),
    },
  };
  const cleared = removeCasualties({ state: nestDead, events: [] }, ["boss:shrieker:nest"]);
  expect(cleared.state.battle!.monsters![0]!.skills[1]!.shriekerFlight).toBeUndefined();
  const victory: GameState = {
    ...cleared.state,
    battle: {
      ...cleared.state.battle!,
      loot: closeBattleLoot(started.battle!.loot),
      pending: null,
      monsterAction: null,
      entities: cleared.state.battle!.entities.map((e) =>
        e.side === "monster" ? { ...e, dead: true } : e,
      ),
      encounter: {
        ...cleared.state.battle!.encounter!,
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
  const after = applyCommand(victory, { type: "finishDungeonBattle" });
  expect(after.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(after.state.battle).toBeUndefined();
  expect(after.state.dungeon!.bossQuestVictory).toBe(true);
  expect(after.state.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(after.state.dungeon!.defeatedWealdBossIdentities).toContain("shrieker");
  expect(after.state.dungeon!.monsterPool).toEqual(victory.dungeon!.monsterPool);
  expect(after.state.dungeon!.cursor).toBe(victory.battle!.rngCursor);
  const step = (state: GameState, command: Command) => {
    const r = applyCommand(state, command);
    expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    return r.state;
  };
  let returned = step(after.state, { type: "leaveDungeon" });
  returned = step(returned, {
    type: "resolveChoice",
    choiceId: returned.dungeon!.pending!.id,
    optionId: "agree",
  });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
  ] as const)
    returned = step(returned, { type });
  expect(returned.dungeon!.heroes.map((h) => h.xp)).toEqual(
    after.state.dungeon!.heroes.map((h) => (h.xp ?? 0) + 3),
  );
  expect(applyCommand(returned, { type: "finishReturnToHamlet" }).state).toBe(returned);
});

it("R-044 英雄全灭不清目标房、不发奖励；非法存活本体终局原子拒绝", () => {
  const { started } = shriekerMechanismFixture();
  const invalid: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      encounter: { ...started.battle!.encounter!, turn: { type: "finished", outcome: "victory" } },
    },
  };
  expect(applyCommand(invalid, { type: "finishDungeonBattle" }).state).toBe(invalid);
  const wiped: GameState = {
    ...started,
    battle: {
      ...started.battle!,
      loot: closeBattleLoot(started.battle!.loot),
      pending: null,
      monsterAction: null,
      entities: started.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true, wounds: e.life! } : e,
      ),
      encounter: {
        ...started.battle!.encounter!,
        turn: { type: "halted", reason: "heroesDefeated", monstersDefeated: false },
      },
    },
  };
  const result = applyCommand(wiped, { type: "finishDungeonBattle" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.bossQuestVictory).not.toBe(true);
  expect(
    result.state.dungeon!.rooms.find((r) => r.id === result.state.dungeon!.position)!.cleared,
  ).toBe(started.dungeon!.rooms.find((r) => r.id === started.dungeon!.position)!.cleared);
});

it("受控抵达检查点沿原策略执行完整 Shrieker 战斗，保留实际胜负并确定性续接", () => {
  const { bound, deployed } = shriekerMechanismFixture();
  let state = deployed;
  const commands: Command[] = [{ type: "deployShriekerI" }];
  const step = (command: Command) => {
    const result = applyCommand(state, command);
    const refused = result.events.find((e) => e.type === "commandRefused");
    if (refused) throw new Error(refused.message);
    state = result.state;
    commands.push(command);
  };
  const settle = () => {
    for (let i = 0; i < 200; i++) {
      const p = state.battle?.pending?.choice ?? state.dungeon?.pending;
      if (!p) return;
      const id =
        [
          "continue",
          "food",
          "collective",
          "discard-new",
          "gold",
          "pressure",
          "suffer",
          "attack",
          "agree",
          "20",
        ].find((id) => p.options.some((o) => o.id === id)) ??
        p.options.find((o) => o.id.startsWith("use:"))?.id ??
        p.options[0]!.id;
      step({ type: "resolveChoice", choiceId: p.id, optionId: id });
    }
    throw new Error("choice loop");
  };
  let stop: string | null = null;
  try {
    playNaturalBattle({ state: () => state, step, settle });
  } catch (error) {
    stop = error instanceof Error ? error.message : String(error);
  }
  expect(
    commands.some((c) => c.type === "playMonsterSkill" && c.actorId === "boss:shrieker"),
    JSON.stringify({ stop, last: commands.slice(-3) }),
  ).toBe(true);
  let replay = JSON.parse(JSON.stringify(bound)) as GameState;
  for (const command of commands) {
    const result = applyCommand(replay, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    replay = result.state;
  }
  expect(replay).toEqual(state);
  expect({
    stop,
    phase: state.dungeon?.phase,
    turn: state.battle?.encounter?.turn,
    failure: state.dungeon?.campaignFailure,
    victory: state.dungeon?.bossQuestVictory,
  }).toMatchSnapshot();
}, 180000);
