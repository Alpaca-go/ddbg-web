import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "./command";
import {
  darkestOrdinaryDeploymentHold,
  prepareDarkestOrdinaryMonsterDeployment,
} from "./darkest-ordinary-monster-deploy";
import {
  darkestMidBossDeploymentHold,
  prepareDarkestMidBossDeployment,
} from "./boss/darkest-mid-boss-runtime";

const quests = ["quest:p016", "quest:p017", "quest:p018"] as const;

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result;
}

function ordinaryGuardedRoom(game: GameState) {
  const d = game.dungeon!;
  return d.rooms.find((room) => room.kind === "lair" || room.kind === "treasure")!;
}

function preparedOrdinary(game: GameState) {
  const d = game.dungeon!;
  const room = ordinaryGuardedRoom(game);
  return ok(
    {
      ...game,
      dungeon: { ...d, phase: "awaitingRoom", position: room.id },
    },
    { type: "prepareDungeonBattle" },
  );
}

describe("最暗普通房 26 牌堆部署", () => {
  it.each(quests)("%s：prepareDungeonBattle → 抽牌身份、26 张守恒、重复拒绝", (questId) => {
    const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
    const battlePrep = preparedOrdinary(game);
    const d0 = game.dungeon!;
    expect(battlePrep.state.dungeon!.roomCards!.active!.tileId).toBeUndefined();
    expect(battlePrep.state.dungeon!.cursor).toBe(d0.cursor);
    const deployed = ok(battlePrep.state, { type: "prepareDungeonMonsters" });
    const d = deployed.state.dungeon!;
    const darkest = d.darkest!;
    const deployment = darkest.ordinaryDeployment!;
    expect(deployment.roomId).toBe(d.position);
    expect(deployment.monsters.reduce((n, m) => n + m.stanceSlots, 0)).toBe(4);
    expect(deployment.monsters.every((m) => m.verified === false)).toBe(true);
    expect(deployment.monsters.every((m) => m.areaId.startsWith("darkest-ordinary-"))).toBe(true);
    expect(deployment.blockedReason).toContain("battleReady: false");
    expect(deployment.blockedReason).toContain("不能进入半场战斗");
    const ids = [
      ...(darkest.monsterDeckRemaining ?? []),
      ...(darkest.monsterDeckDiscarded ?? []),
      ...deployment.monsters.map((m) => m.instanceId),
    ];
    expect(ids.sort()).toEqual([...darkest.monsterDeck].sort());
    expect(new Set(ids).size).toBe(26);
    expect(darkestOrdinaryDeploymentHold(d)).toContain("不能进入半场战斗");
    expect(prepareDarkestOrdinaryMonsterDeployment(deployed.state)).toMatchObject({
      events: [{ type: "commandRefused" }],
    });
    expect(applyCommand(deployed.state, { type: "prepareDungeonMonsters" }).state).toBe(
      deployed.state,
    );
    const battle = applyCommand(deployed.state, { type: "startDungeonBattle" });
    expect(battle.state).toBe(deployed.state);
    expect(battle.events[0]).toMatchObject({
      type: "commandRefused",
      message: expect.stringContaining("不能进入半场战斗"),
    });
  });

  it.each(quests)("%s：目标房仍走 mid-boss，不消费 26 张牌堆", (questId) => {
    const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((entry) => entry.kind === "objective")!;
    const battlePrep = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    );
    expect(battlePrep.state.dungeon!.darkest!.bossEncounterPlan).toBeTruthy();
    const deckBefore = battlePrep.state.dungeon!.darkest!.monsterDeck;
    const deployed = ok(battlePrep.state, { type: "prepareDungeonMonsters" });
    expect(deployed.state.dungeon!.darkest!.bossDeployment?.monsters.length).toBeGreaterThan(0);
    expect(deployed.state.dungeon!.darkest!.ordinaryDeployment).toBeUndefined();
    expect(deployed.state.dungeon!.darkest!.monsterDeckRemaining).toBeUndefined();
    expect(deployed.state.dungeon!.darkest!.monsterDeck).toEqual(deckBefore);
    expect(darkestMidBossDeploymentHold(deployed.state.dungeon!)).toContain("不能进入半场战斗");
    expect(prepareDarkestMidBossDeployment(deployed.state)).toMatchObject({
      events: [{ type: "commandRefused" }],
    });
  });
});
