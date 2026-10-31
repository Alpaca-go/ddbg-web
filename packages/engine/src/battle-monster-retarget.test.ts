import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { coreQuestSources } from "./test-helpers/core-quest";
import { trinketBattle } from "./test-helpers/trinket-battle";
import { LEGACY_REFUSAL } from "./battle-monster-retarget";

const ok = (state: GameState, command: Command) => {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
};
const choose = (result: ReturnType<typeof applyCommand>, optionId: string) =>
  ok(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId,
  });

function monsterTargeted(seed = 0, held: Parameters<typeof trinketBattle>[0], face: "upright" | "inverted" = "inverted") {
  const { state } = trinketBattle(held, "aggressive", "hero_skill:p001", face, seed);
  return {
    ...state,
    battle: {
      ...state.battle!,
      resolveCards: coreQuestSources.resolveCards,
      entities: state.battle!.entities.map((e) =>
        e.id === "h0" ? { ...e, stress: 9 } : e.id === "m" ? { ...e, areaId: "a" } : e,
      ),
      encounter: {
        round: 1,
        deck: ["monster" as const],
        actedIds: [],
        turn: { type: "monster" as const, actorId: "m" },
      },
      monsterAction: {
        actorId: "m",
        skillSlot: 1,
        targetId: "h0",
        selectionRoll: null,
        positioned: true as const,
      },
    },
  };
}

it("目标死亡且 allTrinkets：重选后续接攻击，饰品已翻面", () => {
  const base = monsterTargeted(0, ["trinket:p036"], "inverted");
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "h0"
          ? { ...e, wounds: e.life!, stress: 0, areaId: "a" }
          : e.id === "m"
            ? { ...e, areaId: "a" }
            : e,
      ),
    },
  };
  const before = structuredClone(state);
  const open = applyCommand(state, {
    type: "useCoreTrinket",
    actorId: "h0",
    cardId: "trinket:p036",
    allTrinkets: true,
  });
  expect(open.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(open.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
  expect(open.pendingChoice?.options.map((o) => o.id).sort()).toEqual(["h1", "h2", "h3"]);
  expect(open.state.battle!.trinkets!.held.find((h) => h.cardId === "trinket:p036")!.face).toBe(
    "upright",
  );
  expect(open.state.battle!.usedTrinketIds).toContain("trinket:p036");
  const continued = choose(open, "h1");
  expect(continued.events.some((e) => e.type === "monsterSkillResolved")).toBe(true);
  expect(continued.state.battle!.monsterAction).toBeNull();
  expect(continued.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
  expect(applyCommand(before, {
    type: "useCoreTrinket",
    actorId: "h0",
    cardId: "trinket:p036",
  }).events[0]).toMatchObject({ type: "commandRefused", message: LEGACY_REFUSAL });
});

it("Book of Sanity 反面：JSON 续接不重掷怪物攻击骰", () => {
  let seed = 0;
  while (nextBattleRoll(seed, 0) !== 5) seed++;
  const base = monsterTargeted(seed, ["trinket:p036"], "inverted");
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "h0" ? { ...e, wounds: e.life!, stress: 0 } : e,
      ),
    },
  };
  const open = ok(state, {
    type: "useCoreTrinket",
    actorId: "h0",
    cardId: "trinket:p036",
    allTrinkets: true,
  });
  const rollBefore = open.state.battle!.rngCursor;
  const continued = choose(open, "h1");
  const event = continued.events.find((e) => e.type === "monsterSkillResolved")!;
  expect(event.roll).toBe(5);
  expect(continued.state.battle!.rngCursor).toBe(rollBefore + 1);
});

it("无合法重选目标时跳过怪物攻击并收尾", () => {
  const base = monsterTargeted(0, ["trinket:p036"], "inverted");
  const state = {
    ...base,
    battle: {
      ...base.battle!,
      areas: [
        { id: "a", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
        { id: "b", adjacent: ["a", "c"], elevation: "normal" as const, capacity: 8 },
        { id: "c", adjacent: ["b"], elevation: "normal" as const, capacity: 8 },
      ],
      entities: base.battle!.entities.map((e) =>
        e.id === "h0"
          ? { ...e, wounds: e.life! - 6, stress: 0, areaId: "a" }
          : e.id === "h1"
            ? { ...e, areaId: "c" }
            : e.id === "m"
              ? { ...e, areaId: "a" }
              : e,
      ),
    },
  };
  const result = ok(state, {
    type: "useCoreTrinket",
    actorId: "h0",
    cardId: "trinket:p036",
    allTrinkets: true,
  });
  expect(result.pendingChoice).toBeUndefined();
  expect(result.events.some((e) => e.type === "monsterActionSkipped")).toBe(true);
  expect(result.state.battle!.trinkets!.held.find((h) => h.cardId === "trinket:p036")!.face).toBe(
    "upright",
  );
});
