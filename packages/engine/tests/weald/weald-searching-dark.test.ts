import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty } from "../helpers/core-quest";
import { wealdTaskSources } from "../helpers/weald-task-battle";
import { applyCommand, type GameState } from "../../src/shared/core/command";
import { removeCasualties, endAfterCasualties } from "../../src/shared/dungeon/encounter";
import { dungeonMonsterPoolThrough } from "../../src/shared/core/monster-pool-runtime";

it.each(["quest:weald:p008"] as const)(
  "%s 受控抵达巢穴只部署当地怪，普通牌池守恒",
  (id) => {
    let game = createCoreDungeonQuest(
      0,
      id,
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
    const step = (command: Parameters<typeof applyCommand>[1]) => {
      const result = applyCommand(game, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      game = result.state;
    };
    step({ type: "rollDungeonProvisions" });
    for (let i = 0; game.dungeon!.pending && i < 100; i++) {
      const p = game.dungeon!.pending!;
      step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
    }
    const objectives = game.dungeon!.rooms.filter((r) => r.kind === "lair").map((r) => r.id);
    const usedCards: string[] = [];
    for (const roomId of objectives) {
      game = {
        ...game,
        dungeon: {
          ...game.dungeon!,
          phase: "awaitingRoom",
          position: roomId,
          visited: [...(game.dungeon!.visited ?? []), roomId],
          rooms: game.dungeon!.rooms.map((r) => (r.id === roomId ? { ...r, revealed: true } : r)),
        },
      };
      step({ type: "prepareDungeonBattle" });
      usedCards.push(game.dungeon!.roomCards!.active!.cardId);
      step({ type: "prepareDungeonMonsters" });
      const active = game.dungeon!.monsterPool!.active!;
      expect(active.monsters.every((m) => m.cardId.includes(":weald:"))).toBe(true);
      expect(active.monsters.reduce((n, m) => n + m.stanceSlots, 0)).toBe(4);
      step({ type: "startDungeonBattle" });
      step({ type: "startBattle" });
      // 受控终局仅核对组件复用，不冒充自然胜利。
      const ids = game.battle!.entities.filter((e) => e.side === "monster").map((e) => e.id);
      const terminal: GameState = {
        ...game,
        battle: {
          ...game.battle!,
          entities: game.battle!.entities.map((e) =>
            e.side === "monster" ? { ...e, dead: true, wounds: e.life! } : e,
          ),
        },
      };
      game = endAfterCasualties(removeCasualties({ state: terminal, events: [] }, ids))!.state;
      step({ type: "finishDungeonBattle" });
      expect(game.dungeon!.monsterPool!.remaining).toHaveLength(
        dungeonMonsterPoolThrough(
          game.dungeon!.monsterPool!,
          game.dungeon!.explorationSetup!.dungeonLevel,
        ).length,
      );
    }
    expect(new Set(usedCards).size).toBe(3);
  },
  60000,
);

import { basicQuests, storedDistributionMatchesQuest } from "../../../data/src/basic-quests";
import { drawAndMaterializeRoomDistribution } from "../../../data/src/room-distribution-expand";
import { createRng } from "../../src/shared/core/rng";
it("p008 建局五格无放回，不增巢穴或目标，模板不变", () => {
  const template = basicQuests.find((q) => q.id === "quest:weald:p008")!.distribution;
  const before = JSON.stringify(template);
  for (let seed = 0; seed < 32; seed++) {
    const rng = createRng(seed);
    const result = drawAndMaterializeRoomDistribution(template, () => rng.next());
    expect(result.counts.find((r) => r.kind === "lair")?.count).toBe(3);
    expect(result.counts.some((r) => r.kind === "objective")).toBe(false);
    expect(result.counts.reduce((n, r) => n + r.count, 0)).toBe(8);
    expect(result.counts.every((r) => r.count <= 3)).toBe(true);
    expect(storedDistributionMatchesQuest(result, template)).toBe(true);
  }
  expect(JSON.stringify(template)).toBe(before);
});
