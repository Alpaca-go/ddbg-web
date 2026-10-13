import { describe, expect, it } from "vitest";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import distribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import roomData from "../../data/normalized/corebox/room.json";
import { roomFileSchema } from "../../data/src/room";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createDungeonSandbox } from "./dungeon";
import type { DungeonState } from "./dungeon";

const cards = roomFileSchema.parse(roomData).cards;
function setup(seed = 1, kind: DungeonState["rooms"][number]["kind"] = "lair"): GameState {
  const s = createDungeonSandbox(
    seed,
    layout,
    distribution,
    "radiant",
    "D",
    undefined,
    [],
    undefined,
    undefined,
    cards,
  );
  return {
    ...s,
    dungeon: {
      ...s.dungeon!,
      phase: "awaitingRoom",
      rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, kind } : r)),
    },
  };
}
const draw = (s: GameState) => applyCommand(s, { type: "prepareDungeonBattle" });
const patch = (s: GameState, fields: Partial<DungeonState>) => ({
  ...s,
  dungeon: { ...s.dungeon!, ...fields },
});
describe("守卫房间准备（R10、R15–17、R-048）", () => {
  it("种子 + 命令可回放，不改变输入；只洗一次，完整九张守恒，导航 / 奖励等待战斗", () => {
    for (const kind of ["lair", "treasure"] as const) {
      const s = setup(1, kind),
        before = structuredClone(s);
      const result = draw(s);
      expect(result).toEqual(draw(setup(1, kind)));
      expect(s).toEqual(before);
      const d = result.state.dungeon!;
      expect(d).toMatchObject({ cursor: 15, gold: 0, phase: "awaitingRoom", position: "D" });
      expect(d.roomCards!.deck).toHaveLength(8);
      expect(new Set([...d.roomCards!.deck!, d.roomCards!.active!.cardId]).size).toBe(9);
      expect(d.rooms.find((r) => r.id === "D")!.cleared).toBeUndefined();
      expect(result.state.battle).toBeUndefined();
      for (const command of [
        "prepareDungeonBattle",
        "beginDungeonExploration",
        "beginDungeonBacktrack",
        "scoutDungeon",
      ] as const)
        expect(applyCommand(result.state, { type: command }).state).toBe(result.state);
    }
  });
  it("所有九张可抽；五面完整运行时匹配，未就绪面保持原牌，Boss / 最暗地牢不混入", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const d = draw(setup(seed)).state.dungeon!;
      const active = d.roomCards!.active!;
      seen.add(active.cardId);
      expect(active.tileId).toBe(
        active.cardId === "room:p007"
          ? "room_tile:p004:front"
          : active.cardId === "room:p005"
            ? "room_tile:p003:front"
            : active.cardId === "room:p001"
              ? "room_tile:p001"
              : active.cardId === "room:p002"
                ? "room_tile:p002:back"
                : active.cardId === "room:p003"
                  ? "room_tile:p002:front"
                  : undefined,
      );
      expect(active.blockedReason).toContain(
        active.tileId ? "完整 Common + Ruins" : "完整特殊运行时尚未就绪",
      );
    }
    expect([...seen].sort()).toEqual(cards.slice(0, 9).map((c) => c.id));
  });
  it("非守卫入口、陈旧活动牌、截断 / 重复 / 错地点牌堆、缺目录均原子拒绝", () => {
    for (const kind of ["empty", "trap", "curio", "objective"] as const) {
      const s = setup(1, kind);
      expect(draw(s).state).toBe(s);
    }
    const s = setup();
    const c = s.dungeon!.roomCards!;
    const decks = [
      cards.slice(0, 8).map((c) => c.id),
      Array(9).fill("room:p001"),
      cards.slice(1, 10).map((c) => c.id),
    ];
    for (const deck of decks) {
      const bad = patch(s, { roomCards: { ...c, deck } });
      expect(draw(bad).state).toBe(bad);
    }
    const { roomCards: _cards, ...withoutCards } = s.dungeon!;
    expect(_cards).toBeDefined();
    for (const bad of [
      { ...s, dungeon: withoutCards },
      patch(s, { phase: "ready" }),
      patch(s, { roomCards: { ...c, cards: cards.slice(0, 9) } }),
      patch(s, {
        roomCards: { ...c, active: { roomId: "G", cardId: "room:p001", blockedReason: "stop" } },
      }),
      patch(s, {
        rooms: s.dungeon!.rooms.map((r) => (r.id === "D" ? { ...r, cleared: true } : r)),
      }),
    ])
      expect(draw(bad).state).toBe(bad);
  });
});
