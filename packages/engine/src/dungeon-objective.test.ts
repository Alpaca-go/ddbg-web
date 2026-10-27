import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { allRuinsRoomCardIds, ruinsRoomDeckWithoutSetAside } from "./dungeon-objective";

it("Dem Bones 出征旁置 room:p007，遭遇堆守恒八张", () => {
  const game = createCoreDungeonQuest(1, "quest:p004", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  expect(d.setAsideRoomCardId).toBe("room:p007");
  const ids = allRuinsRoomCardIds(d);
  expect(ids).toHaveLength(9);
  expect(new Set(ids).size).toBe(9);
  expect(ids).not.toContain(undefined);
  expect(ruinsRoomDeckWithoutSetAside(d.roomCards!.cards, "room:p007")).toHaveLength(8);
});

it("目标房守卫战胜利后须两次拾取才清理", () => {
  let s = createCoreDungeonQuest(3, "quest:p004", "radiant", coreParty, coreQuestSources);
  let r = applyCommand(s, { type: "rollDungeonProvisions" });
  while (r.pendingChoice) {
    r = applyCommand(r.state, {
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: "torch",
    });
  }
  s = r.state;
  const objectiveId = s.dungeon!.rooms.find((r) => r.kind === "objective")!.id;
  s = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      position: objectiveId,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((room) =>
        room.id === objectiveId ? { ...room, revealed: true } : room,
      ),
      roomResolution: {
        kind: "objective",
        roomId: objectiveId,
        dungeonLevel: 1,
        resolvedHeroIds: [],
        actionsRemaining: 2,
        completed: false,
      },
    },
  };
  s = applyCommand(s, { type: "resolveDungeonRoom" }).state;
  expect(s.dungeon!.pending?.id).toMatch(/dungeon-objective-recover/);
  s = applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId: "hero-0",
  }).state;
  expect(s.dungeon!.roomResolution!.actionsRemaining).toBe(1);
  s = applyCommand(s, { type: "resolveDungeonRoom" }).state;
  s = applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId: "hero-1",
  }).state;
  expect(s.dungeon!.rooms.find((r) => r.id === objectiveId)!.cleared).toBe(true);
  expect(s.dungeon!.phase).toBe("ready");
});
