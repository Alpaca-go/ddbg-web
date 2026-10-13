import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import roomData from "../../data/normalized/corebox/room.json";
import poolData from "../../data/normalized/corebox/monster_pool.json";
import { roomFileSchema } from "../../data/src/room";
import { monsterPoolFileSchema, ruinsMonsterPool } from "../../data/src/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import type { GameState } from "./command";
import { applyCommand } from "./command";

const cards = monsterPoolFileSchema.parse(poolData).cards;
function setup(seed = 11): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    undefined,
    [],
    { dungeonLevel: 1, light: 5, provisions: [] },
    undefined,
    roomFileSchema.parse(roomData).cards,
    cards,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "treasure" } : r)),
    },
  };
}
const room = (s: GameState) => applyCommand(s, { type: "prepareDungeonBattle" }).state;
const draw = (s: GameState) => applyCommand(s, { type: "prepareDungeonMonsters" });

it("错配板块与已入库不可用Torture都不能抽怪物，保留原房间牌和游标", () => {
  const original = room(setup()),
    d = original.dungeon!,
    pool = d.roomCards!;
  for (const active of [
    { ...pool.active!, tileId: "room_tile:p002:back" },
    { ...pool.active!, cardId: "room:p002", tileId: "room_tile:p002:back" },
  ]) {
    const state = { ...original, dungeon: { ...d, roomCards: { ...pool, active } } };
    const before = structuredClone(state);
    const result = draw(state);
    expect(result.state).toBe(state);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(state).toEqual(before);
    expect(result.state.dungeon!.monsterPool!.active).toBeNull();
    expect(result.state.dungeon!.cursor).toBe(d.cursor);
  }
});

it("真实种子+命令可回放，完整42张只洗一次；部署+弃牌+余牌守恒，未执行战斗/奖励", () => {
  const s = room(setup()),
    before = structuredClone(s);
  expect(s.dungeon!.roomCards!.active!.tileId).toBe("room_tile:p001");
  const result = draw(s),
    d = result.state.dungeon!,
    p = d.monsterPool!;
  expect(result).toEqual(draw(room(setup())));
  expect(s).toEqual(before);
  expect(d.cursor).toBe(s.dungeon!.cursor + 41);
  expect(p.active!.monsters.reduce((n, m) => n + m.stanceSlots, 0)).toBe(4);
  const ids = [...p.remaining!, ...p.discarded, ...p.active!.monsters.map((m) => m.instanceId)];
  expect(ids.sort()).toEqual(
    ruinsMonsterPool(cards, 1)
      .map((m) => m.instanceId)
      .sort(),
  );
  expect(d).toMatchObject({ position: "D", phase: "awaitingRoom", gold: 0 });
  expect(d.heroes).toEqual(s.dungeon!.heroes);
  expect(d.explorationSetup).toEqual(s.dungeon!.explorationSetup);
  expect(d.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
  expect(result.state.battle).toBeUndefined();
  for (const type of [
    "prepareDungeonMonsters",
    "prepareDungeonBattle",
    "beginDungeonExploration",
    "beginDungeonBacktrack",
  ] as const)
    expect(applyCommand(result.state, { type }).state).toBe(result.state);
});

it("不筛牌：42实例均可抽到，包括Small和Large；基础字段全获批，部署保持守恒", () => {
  const seen = new Set<string>();
  let large = false,
    blocked = false,
    displaced = false;
  for (let seed = 1; seed <= 1400; seed++) {
    const s = room(setup(seed));
    if (!s.dungeon!.roomCards!.active!.tileId) continue;
    const p = draw(s).state.dungeon!.monsterPool!;
    for (const m of p.active!.monsters) {
      seen.add(m.instanceId);
      large ||= m.stanceSlots === 2;
    }
    displaced ||= p.discarded.length > 0;
    blocked ||= p.active!.blockedReason.includes("待核实战斗字段");
    const ids = [...p.remaining!, ...p.discarded, ...p.active!.monsters.map((m) => m.instanceId)];
    expect(ids).toHaveLength(42);
    expect(new Set(ids).size).toBe(42);
  }
  expect(seen.size).toBe(42);
  expect([large, blocked, displaced]).toEqual([true, false, true]);
});

it("错误入口、未获批板块、缺目录/错等级/陈旧牌堆均原子拒绝，不消费RNG", () => {
  const s = room(setup()),
    d = s.dungeon!,
    p = d.monsterPool!;
  const badStates: GameState[] = [
    setup(),
    room(setup(12)),
    { ...s, dungeon: { ...d, phase: "ready" } },
    { ...s, dungeon: { ...d, explorationSetup: { ...d.explorationSetup!, dungeonLevel: 2 } } },
    { ...s, dungeon: { ...d, monsterPool: { ...p, cards: cards.slice(1) } } },
    { ...s, dungeon: { ...d, monsterPool: { ...p, remaining: ["monster-deck:p001"] } } },
    { ...s, dungeon: { ...d, roomCards: { ...d.roomCards!, deck: [] } } },
    {
      ...s,
      dungeon: {
        ...d,
        roomCards: { ...d.roomCards!, active: { ...d.roomCards!.active!, roomId: "G" } },
      },
    },
  ];
  for (const bad of badStates) {
    expect(draw(bad).state).toBe(bad);
    expect(draw(bad).events[0]!.type).toBe("commandRefused");
  }
});
