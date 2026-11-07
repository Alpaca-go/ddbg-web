import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import purify from "../../data/normalized/corebox/purify_the_fountains_distribution.json";
import { applyCommand, type Command, type GameEvent, type GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import { isQuestProvisionId, QUEST_PROVISION_PREFIX } from "./quest-provisions";

const heroes = (["aggressive", "defensive", "ranged", "support"] as const).map((stance, i) => ({
  id: `h${i}`,
  stance,
  stress: 0,
}));

function embark(seed = 1, bonus = 0): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    purify,
    "standard",
    "S",
    heroes,
    [],
    { dungeonLevel: 2, light: 5, provisions: [] },
    undefined,
    undefined,
    undefined,
    undefined,
    true,
  );
  return bonus
    ? {
        ...s,
        dungeon: {
          ...s.dungeon!,
          heroes: s.dungeon!.heroes.map((hero, index) =>
            index === 0 ? { ...hero, nextQuestProvisionDice: bonus } : hero,
          ),
        },
      }
    : s;
}

function resolveAllChoices(result: { state: GameState; events: readonly GameEvent[] }): {
  state: GameState;
  events: readonly GameEvent[];
} {
  let current = result;
  while (current.state.dungeon!.pending) {
    const command: Command = {
      type: "resolveChoice",
      choiceId: current.state.dungeon!.pending.id,
      optionId: "torch",
    };
    const next = applyCommand(current.state, command);
    current = { state: next.state, events: [...current.events, ...next.events] };
  }
  return current;
}

it("R-197：Purify the Fountains 开局携带 3 个不可丢弃的任务药水", () => {
  const rolled = resolveAllChoices(applyCommand(embark(), { type: "rollDungeonProvisions" })).state;
  const provisions = rolled.dungeon!.explorationSetup!.provisions;
  const questProvision = provisions.filter((provision) => isQuestProvisionId(provision.id));
  expect(questProvision).toHaveLength(3);
  expect(questProvision.every((provision) => provision.face === "potion")).toBe(true);
  expect(provisions).toHaveLength(11);
  expect(rolled.dungeon!.phase).toBe("ready");
});

it("R-197：补给池已满 16 时先拿任务药水，再丢弃既有超出部分（任务药水保留）", () => {
  const rolled = resolveAllChoices(applyCommand(embark(1, 8), { type: "rollDungeonProvisions" }));
  const provisions = rolled.state.dungeon!.explorationSetup!.provisions;
  expect(provisions).toHaveLength(16);
  expect(provisions.filter((provision) => isQuestProvisionId(provision.id))).toHaveLength(3);
  expect(
    rolled.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes("任务补给") &&
        event.message.includes("丢弃"),
    ),
  ).toBe(true);
});

function objectiveState(seed = 3): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    purify,
    "standard",
    "D",
    heroes,
    [],
    { dungeonLevel: 2, light: 5, provisions: [] },
    undefined,
    undefined,
    undefined,
    undefined,
    false,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      position: "D",
      rooms: s.dungeon!.rooms.map((room) =>
        room.id === "D" ? { ...room, kind: "objective", revealed: true } : room,
      ),
      roomResolution: {
        kind: "objective",
        roomId: "D",
        dungeonLevel: 2,
        resolvedHeroIds: [],
        actionsRemaining: 2,
        completed: false,
      },
      explorationSetup: {
        ...s.dungeon!.explorationSetup!,
        provisions: [0, 1, 2].map((index) => ({
          id: `${QUEST_PROVISION_PREFIX}potion:${index}`,
          face: "potion" as const,
        })),
      },
      pending: {
        id: "dungeon-objective-recover:1",
        prompt: "净化喷泉：选择英雄",
        options: heroes.map((hero) => ({ id: hero.id, label: hero.id })),
      },
    },
  };
}

it("R-197：净化消耗 1 个任务药水 + 2 行动，任务房仅在完成后清理", () => {
  const state = objectiveState();
  const firstCommand: Command = {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId: "h0",
  };
  const first = applyCommand(state, firstCommand);
  expect(first.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    first.state.dungeon!.explorationSetup!.provisions.filter((provision) =>
      isQuestProvisionId(provision.id),
    ),
  ).toHaveLength(2);
  expect(first.state.dungeon!.roomResolution!.actionsRemaining).toBe(1);
  expect(first.state.dungeon!.rooms.find((room) => room.id === "D")!.cleared).toBeUndefined();
  const second = applyCommand(first.state, {
    type: "resolveChoice",
    choiceId: first.state.dungeon!.pending!.id,
    optionId: "h1",
  });
  expect(second.state.dungeon!.roomResolution!.completed).toBe(true);
  expect(second.state.dungeon!.rooms.find((room) => room.id === "D")!.cleared).toBe(true);
  expect(
    second.state.dungeon!.explorationSetup!.provisions.filter((provision) =>
      isQuestProvisionId(provision.id),
    ),
  ).toHaveLength(2);
});

it("R-197：任务药水不能作普通药水使用", () => {
  const rolled = resolveAllChoices(applyCommand(embark(), { type: "rollDungeonProvisions" })).state;
  const questProvision = rolled.dungeon!.explorationSetup!.provisions.find((provision) =>
    isQuestProvisionId(provision.id),
  )!;
  const result = applyCommand(rolled, {
    type: "useProvision",
    targetId: "h0",
    provisionId: questProvision.id,
    effect: "reduceStress",
  });
  expect(result.state).toBe(rolled);
  expect(result.events[0]!.type).toBe("commandRefused");
  expect((result.events[0] as { message?: string }).message).toContain("任务药水只用于净化喷泉");
});

it("R-197：没有任务药水时净化被拒绝且状态不变", () => {
  const state = objectiveState();
  const without = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      explorationSetup: { ...state.dungeon!.explorationSetup!, provisions: [] },
    },
  };
  const result = applyCommand(without, {
    type: "resolveChoice",
    choiceId: without.dungeon!.pending!.id,
    optionId: "h0",
  });
  expect(result.state).toBe(without);
  expect(result.events[0]!.type).toBe("commandRefused");
});
