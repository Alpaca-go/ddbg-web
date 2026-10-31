import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type Command } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";

it("固定seed1真实探索P挖掘点，补给/免费休息待选存档续接，清理后保留柴火", () => {
  const start = {
    seed: 1,
    questId: "quest:p016" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  let game = createCoreDungeonQuest(
    start.seed,
    start.questId,
    start.mode,
    start.party,
    coreQuestSources,
  );
  const commands: Command[] = [];
  const step = (command: Command) => {
    const r = applyCommand(game, command);
    expect(
      r.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(r.events),
    ).toBe(false);
    commands.push(command);
    game = r.state;
    return r;
  };
  const checkpoint = () => {
    const save = createQuestSave(start, commands, game, coreQuestSources);
    const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources);
    expect(restored.game).toEqual(game);
    game = restored.game;
  };
  const settle = () => {
    for (let n = 0; n < 100; n++) {
      const p = game.dungeon!.pending;
      if (p) {
        const option =
          ["suffer", "food", "continue", "draw", "equal"]
            .map((id) => p.options.find((o) => o.id === id))
            .find(Boolean) ??
          p.options.find((o) => o.id.startsWith("stress:")) ??
          p.options[0]!;
        step({ type: "resolveChoice", choiceId: p.id, optionId: option.id });
        continue;
      }
      if (game.dungeon!.phase === "awaitingCurio") {
        step({ type: "resolveDungeonCurio" });
        continue;
      }
      if (game.dungeon!.phase === "blockedPressure") {
        step({ type: "resolveDungeonPressure" });
        continue;
      }
      return;
    }
    throw new Error("挖掘点自然待选未结束");
  };
  step({ type: "rollDungeonProvisions" });
  settle();
  step({ type: "beginDungeonExploration" });
  step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: "P" });
  step({ type: "rollDungeonExploration" });
  settle();
  const d = game.dungeon!;
  expect(d.position).toBe("P");
  expect(d.rooms.find((r) => r.id === "P")).toMatchObject({ kind: "empty", revealed: true });
  expect(d.rooms.find((r) => r.id === "P")!.cleared).not.toBe(true);
  expect(d.phase).toBe("awaitingRoom");
  const originalRest = d.rest;
  const cursor = d.cursor;
  step({ type: "resolveDungeonRoom" });
  checkpoint();
  settle();
  checkpoint();
  expect(game.dungeon!.cursor).toBe(cursor + 4);
  expect(game.dungeon!.rooms.find((r) => r.id === "P")!.cleared).toBe(true);
  expect(game.dungeon!.rest).toEqual(originalRest);
  expect(game.dungeon!.phase).toBe("ready");
  expect(game.dungeon!.darkest!.excavation).toBeUndefined();
  const pool = game.dungeon!.explorationSetup!.provisions;
  const afterCursor = game.dungeon!.cursor;
  for (const destination of ["S", "P"]) {
    step({ type: "beginDungeonBacktrack" });
    step({ type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId: destination });
    settle();
  }
  expect(game.dungeon!.rooms.find((r) => r.id === "P")!.cleared).toBe(true);
  expect(game.dungeon!.explorationSetup!.provisions).toEqual(pool);
  expect(game.dungeon!.cursor).toBe(afterCursor);
  checkpoint();
}, 40000);
