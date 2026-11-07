import { expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import risingThreat from "../../data/normalized/corebox/rising_threat_distribution.json";
import scout from "../../data/normalized/corebox/scout_ahead_distribution.json";
import roomData from "../../data/normalized/corebox/room.json";
import curioData from "../../data/normalized/corebox/curio.json";
import poolData from "../../data/normalized/corebox/monster_pool.json";
import { roomFileSchema } from "../../data/src/room";
import { curioFileSchema } from "../../data/src/curio";
import { monsterPoolFileSchema } from "../../data/src/monster-pool";
import { createDungeonSandbox } from "./dungeon";
import { applyCommand, type GameState } from "./command";
import { readCurioRoomAlwaysGuarded } from "./dungeon-curio-room";

const rooms = roomFileSchema.parse(roomData).cards;
const curios = curioFileSchema.parse(curioData).cards;
const pool = monsterPoolFileSchema.parse(poolData).cards;

function setup(seed: number, distribution: unknown): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    undefined,
    [],
    { dungeonLevel: 1, light: 5, provisions: [] },
    curios,
    rooms,
    pool,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      exploration: null,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind: "curio" } : r)),
    },
  };
}

it("R-197：只有 Rising Threat 的 Curio 房强制守卫", () => {
  expect(readCurioRoomAlwaysGuarded(setup(1, risingThreat).dungeon!)).toEqual({ level: 2 });
  expect(readCurioRoomAlwaysGuarded(setup(1, scout).dungeon!)).toBeNull();
});

it("Rising Threat：进入 Curio 房不掷守卫骰、必有守卫；守卫战包含 1 只 II 级怪并补满四姿态", () => {
  for (let seed = 1; seed <= 300; seed += 1) {
    const base = setup(seed, risingThreat);
    const enteredResult = applyCommand(base, { type: "resolveDungeonRoom" });
    const entered = enteredResult.state;
    const d = entered.dungeon!;
    if (d.curioRoom?.stage !== "guarded") continue;
    expect(d.cursor, `seed ${seed}`).toBe(base.dungeon!.cursor);
    expect(
      enteredResult.events.some(
        (event) =>
          event.type === "dungeonUpdated" &&
          event.message.includes("Rising Threat") &&
          event.message.includes("不掷守卫骰"),
      ),
    ).toBe(true);
    const room = applyCommand(entered, { type: "prepareDungeonBattle" }).state;
    const active = room.dungeon!.roomCards?.active;
    if (active?.roomId !== d.position || !active.tileId) continue;
    const spawned = applyCommand(room, { type: "prepareDungeonMonsters" });
    if (spawned.events.some((event) => event.type === "commandRefused")) continue;
    const guardPool = spawned.state.dungeon!.monsterPool!;
    const monsters = guardPool.active!.monsters;
    expect(monsters.reduce((sum, monster) => sum + monster.stanceSlots, 0)).toBe(4);
    const guard = monsters.find(
      (monster) => pool.find((entry) => entry.combatCardId === monster.cardId)?.level === 2,
    );
    expect(guard).toBeDefined();
    expect(spawned.state.dungeon!.curioRoom!.guardInstanceId).toBe(guard!.instanceId);
    expect(spawned.state.dungeon!.cursor).toBeGreaterThan(room.dungeon!.cursor);
    expect(
      spawned.events.some(
        (event) =>
          event.type === "dungeonUpdated" &&
          event.message.includes("包含 1 只 II 级怪") &&
          event.message.includes(guard!.cardId),
      ),
    ).toBe(true);
    const ids = [
      ...(guardPool.remaining ?? []),
      ...guardPool.discarded,
      ...monsters.map((monster) => monster.instanceId),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    expect(guardPool.remaining).not.toContain(guard!.instanceId);
    return;
  }
  expect.fail("未找到可用的 Rising Threat Curio 房守卫种子");
});

it("非 Rising Threat：Curio 房仍按 d10 守卫骰（cursor +1）", () => {
  let guarded = 0;
  let reward = 0;
  for (let seed = 1; seed <= 30; seed += 1) {
    const base = setup(seed, scout);
    const entered = applyCommand(base, { type: "resolveDungeonRoom" }).state;
    expect(entered.dungeon!.cursor).toBe(base.dungeon!.cursor + 1);
    expect(entered.dungeon!.curioRoom!.guardRoll).toBeGreaterThanOrEqual(1);
    if (entered.dungeon!.curioRoom!.stage === "guarded") guarded += 1;
    else reward += 1;
  }
  expect(guarded).toBeGreaterThan(0);
  expect(reward).toBeGreaterThan(0);
});
