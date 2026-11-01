import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type GameState } from "./command";
import { closeBattleLoot } from "./loot";
import { readDarkestBossEncounter } from "./boss/darkest-content";
import { readDarkestMidBossRequiredCombatCardIds } from "./boss/darkest-mid-boss-scripts";

const quests = ["quest:p016", "quest:p017", "quest:p018"] as const;

function ok(game: GameState, command: Parameters<typeof applyCommand>[1]) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function ordinaryGuardedRoom(game: GameState) {
  return game.dungeon!.rooms.find((room) => room.kind === "lair" || room.kind === "treasure")!;
}

function deployedOrdinary(questId: (typeof quests)[number]) {
  const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = ordinaryGuardedRoom(game);
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function startedOrdinary(questId: (typeof quests)[number]) {
  const base = deployedOrdinary(questId);
  const withBattle = ok(base, { type: "deployDarkestOrdinaryEncounter" }).state;
  return ok(withBattle, { type: "startBattle" }).state;
}

function terminalVictory(game: GameState) {
  return {
    ...game,
    battle: {
      ...game.battle!,
      loot: closeBattleLoot(game.battle!.loot)!,
      entities: game.battle!.entities.map((entity) =>
        entity.side === "monster" ? { ...entity, dead: true } : entity,
      ),
      encounter: {
        ...game.battle!.encounter!,
        round: 4,
        deck: [],
        turn: { type: "finished" as const, outcome: "victory" as const },
      },
    },
  };
}

function terminalRetreat(game: GameState) {
  return {
    ...game,
    battle: {
      ...game.battle!,
      loot: closeBattleLoot(game.battle!.loot)!,
      encounter: {
        ...game.battle!.encounter!,
        round: 4,
        deck: [],
        turn: { type: "finished" as const, outcome: "retreat" as const },
      },
    },
  };
}

function deployedMidBoss(questId: (typeof quests)[number]) {
  const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((entry) => entry.kind === "objective")!;
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function startedMidBoss(questId: (typeof quests)[number]) {
  const base = deployedMidBoss(questId);
  const withBattle = ok(base, { type: "deployDarkestMidBoss" }).state;
  return ok(withBattle, { type: "startBattle" }).state;
}

function midBossVictory(game: GameState) {
  const questId = game.dungeon!.questDistribution!.questId as (typeof quests)[number];
  const actorIds = readDarkestMidBossRequiredCombatCardIds(questId);
  return terminalVictory({
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((entity) => {
        if (entity.side !== "monster" || !entity.monsterCardId) return entity;
        return actorIds.includes(entity.monsterCardId)
          ? { ...entity, dead: true, wounds: entity.life ?? 1 }
          : entity;
      }),
    },
  });
}

describe("最暗 finishDungeonBattle", () => {
  it.each(quests)("%s 缺失或仍存活的目标 Boss 不可仅凭脚本绑定冒充击败", (questId) => {
    const base = midBossVictory(startedMidBoss(questId));
    const target = readDarkestBossEncounter(questId)!.actors[0]!.cardId;
    for (const entities of [
      base.battle!.entities.filter((e) => e.monsterCardId !== target),
      base.battle!.entities.map((e) =>
        e.monsterCardId === target ? { ...e, dead: false, wounds: 0 } : e,
      ),
    ]) {
      const state = { ...base, battle: { ...base.battle!, entities } };
      const result = applyCommand(state, { type: "finishDungeonBattle" });
      expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
      expect(result.state).toBe(state);
    }
  });
  it.each(quests)(
    "%s：普通房胜利 → ready、清 ordinaryDeployment、遭遇牌入弃且 26 守恒",
    (questId) => {
      const before = startedOrdinary(questId);
      const deploymentIds = before.dungeon!.darkest!.ordinaryDeployment!.monsters.map(
        (monster) => monster.instanceId,
      );
      const remainingBefore = [...(before.dungeon!.darkest!.monsterDeckRemaining ?? [])];
      const discardedBefore = before.dungeon!.darkest!.monsterDeckDiscarded ?? [];
      const finished = ok(terminalVictory(before), { type: "finishDungeonBattle" }).state;
      expect(finished.battle).toBeUndefined();
      expect(finished.dungeon!.phase).toBe("ready");
      expect(finished.dungeon!.darkest!.ordinaryDeployment).toBeUndefined();
      expect(finished.dungeon!.darkest!.monsterDeckRemaining).toEqual(remainingBefore);
      expect(finished.dungeon!.darkest!.monsterDeckDiscarded).toEqual([
        ...discardedBefore,
        ...deploymentIds,
      ]);
      const ids = [
        ...(finished.dungeon!.darkest!.monsterDeckRemaining ?? []),
        ...(finished.dungeon!.darkest!.monsterDeckDiscarded ?? []),
      ].sort();
      expect(ids).toEqual([...finished.dungeon!.darkest!.monsterDeck].sort());
      expect(applyCommand(finished, { type: "finishDungeonBattle" }).state).toBe(finished);
    },
  );

  it("普通房撤退：遭遇牌回到余牌、mustLeaveRoomId", () => {
    const before = startedOrdinary("quest:p016");
    const deploymentIds = before.dungeon!.darkest!.ordinaryDeployment!.monsters.map(
      (monster) => monster.instanceId,
    );
    const remainingBefore = [...(before.dungeon!.darkest!.monsterDeckRemaining ?? [])];
    const finished = ok(terminalRetreat(before), { type: "finishDungeonBattle" }).state;
    expect(finished.dungeon!.phase).toBe("ready");
    expect(finished.dungeon!.mustLeaveRoomId).toBe(finished.dungeon!.position);
    expect(finished.dungeon!.darkest!.ordinaryDeployment).toBeUndefined();
    expect(finished.dungeon!.darkest!.monsterDeckRemaining).toEqual([
      ...remainingBefore,
      ...deploymentIds,
    ]);
  });

  it.each(quests)(
    "%s：中途 Boss 胜利 → 26 堆不变、清 bossDeployment、bossQuestVictory",
    (questId) => {
      const before = startedMidBoss(questId);
      const deckSnapshot = before.dungeon!.darkest!.monsterDeck;
      const finished = ok(midBossVictory(before), { type: "finishDungeonBattle" }).state;
      expect(finished.battle).toBeUndefined();
      expect(finished.dungeon!.phase).toBe("ready");
      expect(finished.dungeon!.darkest!.bossDeployment).toBeUndefined();
      expect(finished.dungeon!.darkest!.monsterDeck).toEqual(deckSnapshot);
      expect(finished.dungeon!.darkest!.monsterDeckRemaining).toBe(
        before.dungeon!.darkest!.monsterDeckRemaining,
      );
      expect(finished.dungeon!.bossQuestVictory).toBe(true);
      expect(readDarkestBossEncounter(questId)!.actors.length).toBeGreaterThan(0);
    },
  );

  it("中途 Boss 撤退：不记 bossQuestVictory、26 堆不变", () => {
    const before = startedMidBoss("quest:p017");
    const deckSnapshot = [...before.dungeon!.darkest!.monsterDeck];
    const finished = ok(terminalRetreat(before), { type: "finishDungeonBattle" }).state;
    expect(finished.dungeon!.bossQuestVictory).toBeUndefined();
    expect(finished.dungeon!.darkest!.monsterDeck).toEqual(deckSnapshot);
    expect(finished.dungeon!.darkest!.bossDeployment).toBeUndefined();
  });
});
