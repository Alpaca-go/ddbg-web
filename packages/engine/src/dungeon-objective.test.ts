import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createDungeonSandbox } from "./dungeon";
import { asQuestMapPairingQuest, basicQuests } from "../../data/src/basic-quests";
import { pickEmbarkQuestMapLayout } from "../../data/src/quest-map-pairing";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import type { GameState } from "./command";
import {
  allRuinsRoomCardIds,
  objectiveRoomClearsOnVictory,
  ruinsRoomDeckWithoutSetAside,
} from "./dungeon-objective";

const purifyQuest = basicQuests.find((q) => q.id === "quest:p010")!;

function purifyFountainsFixture(seed = 1): GameState {
  const initialHeroes = createCoreDungeonQuest(
    seed,
    "quest:p001",
    "radiant",
    coreParty,
    coreQuestSources,
  ).dungeon!.heroes;
  const heroes = initialHeroes.map((h) => {
    const old = coreQuestSources.catalog.heroStats.find((s) => s.id === h.heroStatId)!;
    const stat = coreQuestSources.catalog.heroStats.find(
      (s) => s.name === old.name && s.level === 2,
    )!;
    return {
      ...h,
      heroStatId: stat.id,
      level: 2 as const,
      heroLevel: 2,
      life: stat.life,
      skillIds: coreQuestSources.catalog.skills
        .filter((s) => s.hero === old.name && s.level === 1)
        .slice(0, 4)
        .map((s) => s.id),
    };
  });
  const layout = pickEmbarkQuestMapLayout(asQuestMapPairingQuest(purifyQuest), seed, 0);
  return createDungeonSandbox(
    seed,
    layout,
    purifyQuest.distribution,
    "radiant",
    "S",
    heroes,
    coreQuestSources.resolveCards,
    { dungeonLevel: 2, light: 5, provisions: [] },
    coreQuestSources.curios,
    coreQuestSources.rooms,
    coreQuestSources.monsters,
    coreQuestSources.catalog,
  );
}

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
  expect(s.dungeon!.pending!.prompt).toContain("拾取骨骸");
  expect(s.dungeon!.pending!.prompt).not.toContain("净化");
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

it("Purify the Fountains II 出征旁置 room:p003，遭遇堆守恒八张", () => {
  const game = purifyFountainsFixture(2);
  const d = game.dungeon!;
  expect(d.setAsideRoomCardId).toBe("room:p003");
  const ids = allRuinsRoomCardIds(d);
  expect(ids).toHaveLength(9);
  expect(new Set(ids).size).toBe(9);
  expect(ruinsRoomDeckWithoutSetAside(d.roomCards!.cards, "room:p003")).toHaveLength(8);
});

it("Purify 目标房守卫战胜利不直接清理，须两次净化行动", () => {
  let s = purifyFountainsFixture(5);
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
        dungeonLevel: 2,
        resolvedHeroIds: [],
        actionsRemaining: 2,
        completed: false,
      },
    },
  };
  expect(objectiveRoomClearsOnVictory(s.dungeon!, "objective")).toBe(false);
  s = applyCommand(s, { type: "resolveDungeonRoom" }).state;
  expect(s.dungeon!.pending!.prompt).toContain("净化喷泉");
  expect(s.dungeon!.pending!.prompt).not.toContain("骨骸");
  s = applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId: "hero-0",
  }).state;
  expect(s.dungeon!.roomResolution!.actionsRemaining).toBe(1);
  expect(s.dungeon!.rooms.find((r) => r.id === objectiveId)!.cleared).not.toBe(true);
  s = applyCommand(s, { type: "resolveDungeonRoom" }).state;
  s = applyCommand(s, {
    type: "resolveChoice",
    choiceId: s.dungeon!.pending!.id,
    optionId: "hero-1",
  }).state;
  expect(s.dungeon!.rooms.find((r) => r.id === objectiveId)!.cleared).toBe(true);
});
