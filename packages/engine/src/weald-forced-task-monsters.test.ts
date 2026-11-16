import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty } from "./test-helpers/core-quest";
import { wealdTaskSources } from "./test-helpers/weald-task-battle";
import { applyCommand, type GameState } from "./command";
import { removeCasualties, endAfterCasualties } from "./encounter";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";

it.each(["quest:weald:p006", "quest:weald:p009", "quest:weald:p012"] as const)(
  "%s 受控抵达三目标房，公开部署与组件回收",
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
    const objectives = game.dungeon!.rooms.filter((r) => r.kind === "objective").map((r) => r.id);
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
      expect(
        active.monsters.some(
          (m) =>
            m.cardId ===
            (id.endsWith("006")
              ? "monster_medium:weald:p018"
              : id.endsWith("009")
                ? "monster_medium:weald:p006"
                : "monster_large:weald:p003"),
        ),
      ).toBe(true);
      expect(active.monsters.reduce((sum, m) => sum + m.stanceSlots, 0)).toBe(
        id.endsWith("009") ? 3 : 4,
      );
      step({ type: "startDungeonBattle" });
      step({ type: "startBattle" });
      if (id.endsWith("012"))
        expect(game.battle!.encounter!.deck.filter((side) => side === "monster")).toHaveLength(
          active.monsters.length + 1,
        );
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
    if (id.endsWith("009")) expect(new Set(usedCards).size).toBe(3);
    if (id.endsWith("006")) expect(game.dungeon!.wealdViragoKills).toBe(3);
  },
  60000,
);
