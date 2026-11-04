import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";
import { readDarkestMidBossRequiredCombatCardIds } from "./darkest-mid-boss-scripts";
import { closeBattleLoot } from "../loot";

function ok(state: GameState, command: Command) {
  const r = applyCommand(state, command);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}

function started(): GameState {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p018", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const bound = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  ).state;
  const deployed = ok(bound, { type: "deployMammothCystI" }).state;
  return ok(deployed, { type: "startBattle" }).state;
}

const finish = { type: "finishDungeonBattle" } as const;

it("Mammoth Cyst 生产路径胜利清房并记录 bossQuestVictory", () => {
  const s = started();
  const actorIds = readDarkestMidBossRequiredCombatCardIds("quest:p018");
  const finishedBattle = {
    ...s.battle!,
    loot: closeBattleLoot(s.battle!.loot)!,
    entities: s.battle!.entities.map((entity) =>
      entity.side === "monster" && entity.monsterCardId && actorIds.includes(entity.monsterCardId)
        ? { ...entity, dead: true, wounds: entity.life ?? 1 }
        : entity,
    ),
    encounter: {
      ...s.battle!.encounter!,
      turn: { type: "finished" as const, outcome: "victory" as const },
    },
  };
  const after = ok({ ...s, battle: finishedBattle }, finish).state;
  expect(after.dungeon!.bossQuestVictory).toBe(true);
  expect(after.dungeon!.darkest!.bossDeployment).toBeUndefined();
  expect(after.dungeon!.rooms.find((r) => r.id === after.dungeon!.position)!.cleared).toBe(true);
  expect(after.battle).toBeUndefined();
});

it("Mammoth Cyst 生产路径全灭仍 R-048 停点", () => {
  const s = started();
  const wiped = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) =>
        e.side === "hero" ? { ...e, dead: true, wounds: e.life ?? 1 } : e,
      ),
      encounter: {
        ...s.battle!.encounter!,
        turn: {
          type: "halted" as const,
          reason: "heroesDefeated" as const,
          monstersDefeated: false,
        },
      },
    },
  };
  expect(applyCommand(wiped, finish).events.some((e) => e.type === "commandRefused")).toBe(true);
});
