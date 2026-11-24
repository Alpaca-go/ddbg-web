import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty } from "./core-quest";
import { wealdTaskSources } from "./weald-task-battle";
/** 真实初始任务＋公开部署，显式受控抵达目标房／英雄回合。 */
export function wealdOakBattleFixture(round = 1): GameState {
  let game = createCoreDungeonQuest(
    0,
    "quest:weald:p011",
    "radiant",
    coreParty,
    wealdTaskSources,
    true,
    "full",
    ["core", "weald"],
    undefined,
    undefined,
    "tasks-v1",
  );
  const step = (cmd: Command) => {
    const r = applyCommand(game, cmd);
    if (r.events.some((e) => e.type === "commandRefused"))
      throw new Error(JSON.stringify(r.events));
    game = r.state;
  };
  step({ type: "rollDungeonProvisions" });
  for (let i = 0; game.dungeon!.pending && i < 100; i++) {
    const p = game.dungeon!.pending!;
    step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
  }
  const id = game.dungeon!.rooms.find((r) => r.kind === "objective")!.id;
  game = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      phase: "awaitingRoom",
      position: id,
      rooms: game.dungeon!.rooms.map((r) => (r.id === id ? { ...r, revealed: true } : r)),
    },
  };
  step({ type: "prepareDungeonBattle" });
  step({ type: "prepareDungeonMonsters" });
  step({ type: "startDungeonBattle" });
  step({ type: "startBattle" });
  const b = game.battle!,
    actorId = b.entities.find((e) => e.side === "hero")!.id;
  const star = b.areas.find((a) => a.poisonousRoots)!.id;
  return {
    ...game,
    battle: {
      ...b,
      provisions: [{ id: "oak-torch", face: "torch" }],
      entities: b.entities.map((e) => (e.id === actorId ? { ...e, areaId: star } : e)),
      encounter: {
        ...b.encounter!,
        round,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "hero", actorId, actions: 2, usedSkillIds: [] },
      },
    },
  };
}
