import { describe, expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "./command";
import stygianRooms from "../../data/normalized/corebox/stygian_rooms.json";

const quests = ["quest:p016", "quest:p017", "quest:p018"] as const;

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

function ordinaryGuardedRoom(game: GameState) {
  const d = game.dungeon!;
  return d.rooms.find((room) => room.kind === "lair" || room.kind === "treasure")!;
}

function deployed(questId: (typeof quests)[number]) {
  const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = ordinaryGuardedRoom(game);
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function started(game: GameState) {
  const withBattle = ok(game, { type: "deployDarkestOrdinaryEncounter" }).state;
  const result = applyCommand(withBattle, { type: "startBattle" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result.state;
}

function deployedStygian(cardId: string, rules: "r227" | "r229" | "full") {
  const game = createCoreDungeonQuest(
    7,
    "quest:p016",
    "stygian",
    coreParty,
    coreQuestSources,
    true,
    rules,
  );
  const d = game.dungeon!;
  const roomCards = d.roomCards!;
  // 固定测试首抽，地图与怪物部署仍走公开命令。
  const prepared = ok(
    {
      ...game,
      dungeon: {
        ...d,
        phase: "awaitingRoom",
        position: ordinaryGuardedRoom(game).id,
        roomCards: {
          ...roomCards,
          deck: [cardId, ...roomCards.deck!.filter((id) => id !== cardId)],
        },
      },
    },
    { type: "prepareDungeonBattle" },
  ).state;
  expect(prepared.dungeon!.roomCards!.active!.cardId).toBe(cardId);
  return ok(prepared, { type: "prepareDungeonMonsters" }).state;
}

describe("最暗普通房 deployDarkestOrdinaryEncounter / startBattle", () => {
  it.each(quests)(
    "p016–p018：26 牌堆部署 → deployDarkestOrdinaryEncounter → startBattle → awaitingInitiative（%s）",
    (questId) => {
      const base = deployed(questId);
      expect(base.battle).toBeUndefined();
      const deckBefore = [
        ...(base.dungeon!.darkest!.monsterDeckRemaining ?? []),
        ...(base.dungeon!.darkest!.monsterDeckDiscarded ?? []),
        ...base.dungeon!.darkest!.ordinaryDeployment!.monsters.map((m) => m.instanceId),
      ].sort();
      const game = ok(base, { type: "deployDarkestOrdinaryEncounter" }).state;
      expect(game.dungeon!.phase).toBe("inBattle");
      expect(game.battle!.encounter).toBeUndefined();
      expect(
        game
          .battle!.entities.filter((e) => e.side === "monster")
          .reduce((n, e) => n + (e.stanceSlots ?? 1), 0),
      ).toBe(4);
      const deckAfter = [
        ...(game.dungeon!.darkest!.monsterDeckRemaining ?? []),
        ...(game.dungeon!.darkest!.monsterDeckDiscarded ?? []),
        ...game.dungeon!.darkest!.ordinaryDeployment!.monsters.map((m) => m.instanceId),
      ].sort();
      expect(deckAfter).toEqual(deckBefore);
      const afterStart = started(base);
      expect(afterStart.battle!.encounter).toEqual({
        round: 1,
        deck: expect.any(Array),
        actedIds: [],
        turn: { type: "awaitingInitiative" },
      });
      expect(afterStart.battle!.encounter!.deck).toHaveLength(8);
      expect(afterStart.battle!.rngCursor).toBeGreaterThan(game.battle!.rngCursor);
      expect(applyCommand(afterStart, { type: "startBattle" }).state).toBe(afterStart);
    },
  );

  it("重复 deployDarkestOrdinaryEncounter 拒绝", () => {
    const game = ok(deployed("quest:p016"), { type: "deployDarkestOrdinaryEncounter" }).state;
    expect(
      applyCommand(game, { type: "deployDarkestOrdinaryEncounter" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it.each([
    [
      "room:p014",
      "r229",
      [{ id: "F", poolOfRebirth: { stressPerNegativeQuirk: 2, healPerNegativeQuirk: 3 } }],
    ],
    [
      "room:p020",
      "r229",
      [
        { id: "E", evilGazeDisease: true },
        ...["A", "D", "H", "I"].map((id) => ({ id, staringEyesStress: 3 })),
      ],
    ],
    ["room:p020", "r227", []],
  ] as const)("Stygian 最暗普通房真实部署 %s（%s）", (cardId, rules, expected) => {
    const battle = ok(deployedStygian(cardId, rules), {
      type: rules === "r229" ? "startDungeonBattle" : "deployDarkestOrdinaryEncounter",
    }).state.battle!;
    const changedAreas = battle.areas.filter(
      (area) => area.poolOfRebirth || area.evilGazeDisease || area.staringEyesStress,
    );
    expect(changedAreas).toHaveLength(expected.length);
    expect(changedAreas).toEqual(
      expect.arrayContaining(expected.map((area) => expect.objectContaining(area))),
    );
  });

  it.each(stygianRooms.cards.filter((card) => card.location === "darkestDungeon"))(
    "新版 Stygian $name 从网页使用的正式命令进入战斗",
    (card) => {
      const entered = ok(deployedStygian(card.replacesCardId, "full"), {
        type: "startDungeonBattle",
      }).state;
      expect(entered.battle?.roomName).toBe(card.name);
      expect(ok(entered, { type: "startBattle" }).state.battle!.encounter!.round).toBe(1);
    },
  );

  it("未 prepareDungeonMonsters 不能 deploy / startBattle", () => {
    const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = ordinaryGuardedRoom(game);
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    ).state;
    expect(
      applyCommand(bound, { type: "deployDarkestOrdinaryEncounter" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(
      applyCommand(bound, { type: "startBattle" }).events.some((e) => e.type === "commandRefused"),
    ).toBe(true);
  });

  it("目标房不能走普通 deploy 路径", () => {
    const game = createCoreDungeonQuest(7, "quest:p016", "radiant", coreParty, coreQuestSources);
    const d = game.dungeon!;
    const room = d.rooms.find((entry) => entry.kind === "objective")!;
    const bound = ok(
      { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
      { type: "prepareDungeonBattle" },
    ).state;
    expect(
      applyCommand(bound, { type: "prepareDungeonMonsters" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    const midDeployed = ok(bound, { type: "deployShufflingHorrorI" }).state;
    expect(
      applyCommand(midDeployed, { type: "deployDarkestOrdinaryEncounter" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
    expect(
      applyCommand(midDeployed, { type: "deployDarkestMidBoss" }).events.some(
        (e) => e.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("drawInitiative 在最暗普通 inBattle 下可续接", () => {
    const game = started(deployed("quest:p017"));
    const drawn = applyCommand(game, { type: "drawInitiative" });
    expect(drawn.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(drawn.state.battle!.encounter!.turn.type).not.toBe("awaitingInitiative");
  });

  it("存档白名单包含 deployDarkestOrdinaryEncounter", async () => {
    const { savedCommandSchema } = await import("../../data/src/quest-save");
    expect(savedCommandSchema.safeParse({ type: "deployDarkestOrdinaryEncounter" }).success).toBe(
      true,
    );
  });
});
