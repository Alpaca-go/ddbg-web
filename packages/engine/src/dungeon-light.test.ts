import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import statData from "../../data/normalized/corebox/hero_stat.json";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { applyCommand } from "./command";
import type { GameState, ApplyResult } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState, DungeonBattleCatalog } from "./dungeon";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import type { ResolveCard } from "./pressure";

const stats = normalizedHeroStatFileSchema
  .parse(statData)
  .cards.filter((s) => s.attributesVerified && s.level === 1) as DungeonBattleCatalog["heroStats"];
function setup(
  changes: Partial<DungeonState["heroes"][number]> = {},
  light = 5,
  level = 1,
): GameState {
  const stat = stats.find((s) => s.name === "CRUSADER")!;
  const initial = createDungeonSandbox(
    1,
    layout,
    distribution,
    "standard",
    "D",
    [
      {
        id: "h",
        stress: 0,
        heroStatId: stat.id,
        level: 1,
        life: stat.life,
        wounds: 0,
        stance: "aggressive",
        attributesVerified: true,
        ...changes,
      },
    ],
    resolveData.cards as ResolveCard[],
    {
      light,
      dungeonLevel: level,
      provisions: [
        { id: "torch", face: "torch" },
        { id: "tool", face: "tool" },
      ],
    },
  );
  const d = initial.dungeon!;
  const dark = d.rooms.find((r) => r.kind === "dark")!;
  const originalKind = d.rooms.find((r) => r.id === "D")!.kind;
  return {
    ...initial,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      visited: ["G", "D"],
      traversedCorridors: [["G", "D"]],
      battleCatalog: { heroStats: stats, skills: [], monsters: [] },
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseaseData).cards,
        normalizedQuirkFileSchema.parse(quirkData).cards,
      ),
      rooms: d.rooms.map((r) =>
        r.id === "D"
          ? { ...r, kind: "dark", revealed: true }
          : r.id === dark.id
            ? { ...r, kind: originalKind }
            : r.id === "G"
              ? { ...r, cleared: true, revealed: true }
              : r,
      ),
    },
  };
}
const room = { type: "resolveDungeonRoom" } as const;
const torch = {
  type: "useProvision",
  provisionId: "torch",
  targetId: "h",
  effect: "raiseLight",
} as const;
function ok(result: ApplyResult): GameState {
  expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(
    conditionPoolProblem(result.state.dungeon!.conditions!, result.state.dungeon!.heroes),
  ).toBeNull();
  return result.state;
}
function back(state: GameState, to: string): GameState {
  const pending = applyCommand(state, { type: "beginDungeonBacktrack" });
  return ok(
    applyCommand(pending.state, {
      type: "resolveChoice",
      choiceId: pending.pendingChoice!.id,
      optionId: to,
    }),
  );
}
it.each([1, 3])("Dark DL%d 每次进入只降光 1，保留代币、不掷骰；Torch 恢复后可重复返回", (level) => {
  const initial = setup({}, 5, level);
  const snapshot = structuredClone(initial);
  const first = ok(applyCommand(initial, room));
  expect(first.dungeon).toMatchObject({
    phase: "ready",
    cursor: 7,
    roomResolution: { kind: "dark", completed: true },
  });
  expect(first.dungeon!.explorationSetup!.light).toBe(4);
  expect(first.dungeon!.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
  expect(first.dungeon!.gold).toBe(0);
  expect(applyCommand(first, room).state).toBe(first);
  expect(applyCommand(first, { type: "beginDungeonExploration" }).pendingChoice).toBeDefined();
  const outside = back(first, "G");
  const restored = ok(applyCommand(outside, torch));
  expect(restored.dungeon!.explorationSetup!.light).toBe(5);
  expect(restored.dungeon!.explorationSetup!.provisions).toEqual([{ id: "tool", face: "tool" }]);
  expect(applyCommand(restored, torch).state).toBe(restored);
  expect(applyCommand(restored, { type: "beginDungeonExploration" }).pendingChoice).toBeDefined();
  const second = ok(applyCommand(back(restored, "D"), room));
  expect(second.dungeon!.explorationSetup!.light).toBe(4);
  expect(second.dungeon!.heroes[0]!.stress).toBe(2);
  expect(second.dungeon!.cursor).toBe(7);
  expect(applyCommand(initial, room).state).toEqual(first);
  expect(initial).toEqual(snapshot);
});
it("光照边界不触发虚构变化：Dark 在 0 不再降，Torch 在 5 不再触发被动", () => {
  const low = setup({ quirkIds: ["quirk:p025"] }, 0);
  const dark = ok(applyCommand(low, room));
  expect(dark.dungeon!.explorationSetup!.light).toBe(0);
  expect(dark.dungeon!.heroes[0]!.stress).toBe(0);
  const high = setup({ quirkIds: ["quirk:p019"] });
  const ready = { ...high, dungeon: { ...high.dungeon!, phase: "ready" as const } };
  const used = ok(applyCommand(ready, torch));
  expect(used.dungeon!.heroes[0]!.stress).toBe(0);
  expect(used.dungeon!.cursor).toBe(7);
});
it("Dark 在新光照 2 应用 Night Blindness / Nervous 与低光压力修正一次，并接意志收尾", () => {
  const initial = setup({ stress: 7, quirkIds: ["quirk:p025", "quirk:p028"] }, 3);
  const result = applyCommand(initial, room);
  const done = ok(result);
  expect(done.dungeon).toMatchObject({ phase: "ready", cursor: 12, scoutBonus: false });
  expect(done.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: true });
  expect(done.dungeon!.explorationSetup!.light).toBe(2);
  expect(done.dungeon!.rooms).toEqual(initial.dungeon!.rooms);
  expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
});
it("Dark 的 Night Owl 与 Torch 的 Early Riser / Warrior of Light 读取获批防御和 Life", () => {
  const dark = ok(applyCommand(setup({ stress: 3, quirkIds: ["quirk:p005"] }), room));
  expect(dark.dungeon!.heroes[0]!.stress).toBe(2);
  const initial = setup({ quirkIds: ["quirk:p002", "quirk:p013"], wounds: 4 });
  const ready = ok(applyCommand(initial, room));
  const raised = ok(applyCommand(ready, torch));
  expect(raised.dungeon!.heroes[0]).toMatchObject({
    wounds: 2,
    statusStacks: [{ kind: "buff", remaining: 2 }],
  });
  expect(raised.dungeon!.cursor).toBe(7);
});
it("Dark 压力资料缺失时光照只支付一次；补齐意志资料后完成房间，不进入 Trap 分配", () => {
  const initial = setup({ stress: 9, quirkIds: ["quirk:p025"] });
  const missing = { ...initial, dungeon: { ...initial.dungeon!, resolveCards: [] } };
  const stopped = ok(applyCommand(missing, room));
  expect(stopped.dungeon).toMatchObject({
    phase: "blockedPressure",
    cursor: 7,
    roomResolution: { completed: false },
  });
  expect(stopped.dungeon!.explorationSetup!.light).toBe(4);
  expect(applyCommand(stopped, room).state).toBe(stopped);
  expect(applyCommand(stopped, torch).state).toBe(stopped);
  const repaired = {
    ...stopped,
    dungeon: { ...stopped.dungeon!, resolveCards: initial.dungeon!.resolveCards },
  };
  const done = ok(applyCommand(repaired, { type: "resolveDungeonPressure" }));
  expect(done.dungeon).toMatchObject({
    phase: "ready",
    pending: null,
    roomResolution: { completed: true },
  });
  expect(done.dungeon!.explorationSetup!.light).toBe(4);
});
it("Torch 引发意志检定或心脏病时不重扣补给，不改变房间揭示或给侦察减骰", () => {
  for (const tested of [false, true]) {
    const initial = setup(
      {
        stress: 9,
        quirkIds: ["quirk:p019"],
        ...(tested ? { resolveTested: true, resolveCardId: "virtue_affliction:p001" } : {}),
      },
      4,
    );
    const ready = { ...initial, dungeon: { ...initial.dungeon!, phase: "ready" as const } };
    const result = applyCommand(ready, torch);
    const done = ok(result);
    expect(done.dungeon!.explorationSetup!.provisions).toEqual([{ id: "tool", face: "tool" }]);
    expect(done.dungeon!.rooms).toEqual(ready.dungeon!.rooms);
    expect(done.dungeon!.scoutBonus).toBe(false);
    expect(done.dungeon!.phase).toBe(tested ? "awaitingReplacement" : "ready");
    expect(result.events.filter((e) => e.type === "provisionConsumed")).toHaveLength(1);
    expect(result.events.filter((e) => e.type === "heartAttack")).toHaveLength(Number(tested));
    expect(applyCommand(done, torch).state).toBe(done);
  }
});
it("追加伤口先于意志；缺防御／非法光照仍拒绝且不能插入未完成窗口（R-069）", () => {
  const mixed = setup({ stress: 9, quirkIds: ["quirk:p025", "quirk:p035"] });
  const changed = ok(applyCommand(mixed, room));
  expect(changed.dungeon!.heroes[0]).toMatchObject({ wounds: 1, stress: 0, resolveTested: true });
  expect(changed.dungeon!.explorationSetup!.light).toBe(4);
  const mixedTorch = setup({ stress: 9, quirkIds: ["quirk:p019", "quirk:p035"] }, 4);
  const mixedReady = {
    ...mixedTorch,
    dungeon: { ...mixedTorch.dungeon!, phase: "ready" as const },
  };
  const raised = ok(applyCommand(mixedReady, torch));
  expect(raised.dungeon!.heroes[0]).toMatchObject({ wounds: 1, stress: 0, resolveTested: true });
  expect(raised.dungeon!.explorationSetup!.light).toBe(5);
  expect(raised.dungeon!.explorationSetup!.provisions.some((p) => p.id === "torch")).toBe(false);
  const unverified = setup({ quirkIds: ["quirk:p002"] }, 4);
  const missing = {
    ...unverified,
    dungeon: {
      ...unverified.dungeon!,
      phase: "ready" as const,
      battleCatalog: { heroStats: [], skills: [], monsters: [] },
    },
  };
  expect(applyCommand(missing, torch).state).toBe(missing);
  const invalid = setup({}, 6);
  expect(applyCommand(invalid, room).state).toBe(invalid);
  const ready = ok(applyCommand(setup(), room));
  const pending = applyCommand(ready, { type: "scoutDungeon" }).state;
  expect(applyCommand(pending, torch).state).toBe(pending);
  expect(applyCommand(setup(), torch).events[0]!.type).toBe("commandRefused");
  expect(applyCommand(ready, { ...torch, provisionId: "tool" }).state).toBe(ready);
});
