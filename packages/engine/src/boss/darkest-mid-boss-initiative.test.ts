import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import {
  DARKEST_MAMMOTH_CYST_SCRIPT_ID,
  DARKEST_SHUFFLING_HORROR_SCRIPT_ID,
  DARKEST_TEMPLARS_SCRIPT_ID,
} from "./darkest-mid-boss-scripts";
import { readDarkestMidBossRequiredCombatCardIds } from "./darkest-mid-boss-scripts";

const quests = [
  ["quest:p016", DARKEST_SHUFFLING_HORROR_SCRIPT_ID, 8] as const,
  ["quest:p017", DARKEST_TEMPLARS_SCRIPT_ID, 8] as const,
  ["quest:p018", DARKEST_MAMMOTH_CYST_SCRIPT_ID, 7] as const,
];

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function deployed(questId: (typeof quests)[number][0]) {
  const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function started(game: GameState) {
  const withBattle = ok(game, { type: "deployDarkestMidBoss" }).state;
  const result = applyCommand(withBattle, { type: "startBattle" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}

describe("最暗中途 Boss deployDarkestMidBoss / startBattle", () => {
  it.each(quests)(
    "p016–p018：部署 → deployDarkestMidBoss → startBattle → awaitingInitiative（%s）",
    (questId, _scriptId, deckSize) => {
      const base = deployed(questId);
      expect(base.battle).toBeUndefined();
      const game = ok(base, { type: "deployDarkestMidBoss" }).state;
      expect(game.dungeon!.phase).toBe("inBattle");
      expect(game.battle!.encounter).toBeUndefined();
      const actorIds = readDarkestMidBossRequiredCombatCardIds(questId);
      expect(
        game.battle!.entities.filter(
          (e) => e.side === "monster" && actorIds.includes(e.monsterCardId!),
        ).length,
      ).toBe(actorIds.length);
      const afterStart = started(base);
      expect(afterStart.battle!.encounter).toEqual({
        round: 1,
        deck: expect.any(Array),
        actedIds: [],
        turn: { type: "awaitingInitiative" },
      });
      expect(afterStart.battle!.encounter!.deck).toHaveLength(deckSize);
      expect(afterStart.battle!.rngCursor).toBeGreaterThan(game.battle!.rngCursor);
      expect(applyCommand(afterStart, { type: "startBattle" }).state).toBe(afterStart);
    },
  );

  it("重复 deployDarkestMidBoss 拒绝", () => {
    const game = ok(deployed("quest:p016"), { type: "deployDarkestMidBoss" }).state;
    expect(
      applyCommand(game, { type: "deployDarkestMidBoss" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("未 prepareDungeonMonsters 不能 deployDarkestMidBoss / startBattle", () => {
    const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((r) => r.kind === "objective")!;
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    ).state;
    expect(
      applyCommand(bound, { type: "deployDarkestMidBoss" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(
      applyCommand(bound, { type: "startBattle" }).events.some((e) => e.type === "commandRefused"),
    ).toBe(true);
  });

  it("drawInitiative 在最暗 Boss inBattle 下可续接", () => {
    const game = started(deployed("quest:p017"));
    const drawn = applyCommand(game, { type: "drawInitiative" });
    expect(drawn.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(drawn.state.battle!.encounter!.turn.type).not.toBe("awaitingInitiative");
  });

  it("存档白名单包含 deployDarkestMidBoss", async () => {
    const { savedCommandSchema } = await import("../../../data/src/quest-save");
    expect(savedCommandSchema.safeParse({ type: "deployDarkestMidBoss" }).success).toBe(true);
  });
});
