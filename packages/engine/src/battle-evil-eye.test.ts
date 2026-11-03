import { expect, it } from "vitest";
import { approvedEvilEye as tile } from "../../data/src/normalize/evil-eye";
import rooms from "../../data/normalized/corebox/room.json";
import catalog from "../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../data/src/normalize/room-tile-selection";
import { savedCommandSchema } from "../../data/src/quest-save";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { roomEffectFixture } from "./test-helpers/room-effects";
import { conditionPoolProblem } from "./conditions";
import { readRoomTile } from "./room-tile-selection";
const setup = (quirkIds: readonly string[] = [], areaId = "E") =>
  roomEffectFixture(roomTileBattleAreas(tile), { quirkIds, areaId });
const hero = (s: GameState) => s.battle!.entities.find((e) => e.id === "h0")!;
const destroy = (s: GameState) => applyCommand(s, { type: "destroyEvilEye", actorId: "h0" });
const end = (s: GameState) => {
  const b = s.battle!;
  return applyCommand(
    {
      ...s,
      battle: {
        ...b,
        encounter: {
          ...b.encounter!,
          turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [], mustMove: false },
        },
      },
    },
    { type: "changeStance", actorId: "h0", direction: "backward" },
  );
};

it("R-160/170：生产选择与区域投影、存档命令", () => {
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p020"),
      catalog,
    ).status,
  ).toBe("matched");
  expect(readRoomTile(rooms.cards.find((c) => c.id === "room:p020")).status).toBe("matched");
  expect(
    roomTileBattleAreas(tile)
      .filter((a) => a.staringEyes)
      .map((a) => a.id),
  ).toEqual(["A", "D", "H", "I"]);
  expect(
    roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.evilGaze || a.staringEyes),
  ).toBe(false);
  expect(savedCommandSchema.safeParse({ type: "destroyEvilEye", actorId: "h0" }).success).toBe(
    true,
  );
});
it("结束回合抽负面怪癖，确定性且不改输入；非星区不触发", () => {
  const s = setup(),
    before = structuredClone(s);
  const result = end(s);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(hero(result.state).quirkIds).toHaveLength(1);
  expect(hero(result.state).quirkIds![0]).toMatch(/^quirk:p0(1[89]|[23]\d)/);
  expect(end(s)).toEqual(result);
  expect(s).toEqual(before);
  expect(hero(end(setup([], "B")).state).quirkIds).toEqual([]);
});
it("第四负面替换选择后续完回合，不重复抽牌；无效选择原子拒绝", () => {
  const opened = end(setup(["quirk:p001", "quirk:p018", "quirk:p019"]));
  expect(opened.pendingChoice?.options.map((o) => o.id)).toEqual(["quirk:p001"]);
  const bad = applyCommand(opened.state, {
    type: "resolveChoice",
    choiceId: opened.pendingChoice!.id,
    optionId: "bad",
  });
  expect(bad.state).toBe(opened.state);
  const done = applyCommand(opened.state, {
    type: "resolveChoice",
    choiceId: opened.pendingChoice!.id,
    optionId: "quirk:p001",
  });
  expect(done.state.battle!.pending).toBeNull();
  expect(hero(done.state).quirkIds).toHaveLength(3);
  expect(hero(done.state).quirkIds).not.toContain("quirk:p001");
  expect(
    conditionPoolProblem(
      done.state.battle!.conditions!,
      done.state.battle!.entities.filter((e) => e.side === "hero"),
    ),
  ).toBeNull();
});
it("三负面再抽发疯死亡，沿用伤亡与持牌回收", () => {
  const result = end(setup(["quirk:p018", "quirk:p019", "quirk:p020"]));
  expect(hero(result.state).dead).toBe(true);
  expect(result.events.some((e) => e.type === "casualtyRemoved" && e.actorId === "h0")).toBe(true);
});
it("毁眼支付两行动、正面怪癖与全体减压；E关闭，凝视区保留", () => {
  const s = setup();
  const stressed = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) => (e.side === "hero" ? { ...e, stress: 6 } : e)),
    },
  };
  const result = destroy(stressed);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.evilEyeDestroyed).toBe(true);
  expect(hero(result.state).quirkIds).toHaveLength(1);
  expect(
    result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
  ).toEqual([1, 1, 1, 1]);
  expect(hero(end(result.state).state).quirkIds).toHaveLength(1);
  const onB = setup([], "A");
  const watched = end({ ...onB, battle: { ...onB.battle!, evilEyeDestroyed: true } });
  expect(hero(watched.state).stress).toBe(2);
});
it("毁眼的第四正面允许弃新卡，完成后减压且不抽负面；重复/错位/缺行动拒绝", () => {
  const opened = destroy(setup(["quirk:p001", "quirk:p002", "quirk:p003"]));
  expect(opened.pendingChoice?.options).toHaveLength(4);
  const option = opened.pendingChoice!.options[3]!.id;
  const done = applyCommand(opened.state, {
    type: "resolveChoice",
    choiceId: opened.pendingChoice!.id,
    optionId: option,
  });
  expect(hero(done.state).quirkIds).toEqual(["quirk:p001", "quirk:p002", "quirk:p003"]);
  expect(done.state.battle!.evilEyeDestroyed).toBe(true);
  for (const state of [setup([], "B"), done.state]) expect(destroy(state).state).toBe(state);
  const s = setup();
  const b = s.battle!;
  const short = {
    ...s,
    battle: {
      ...b,
      encounter: {
        ...b.encounter!,
        turn: {
          type: "hero" as const,
          actorId: "h0",
          actions: 1,
          usedSkillIds: [],
          mustMove: false,
        },
      },
    },
  };
  expect(destroy(short).state).toBe(short);
});

it("怪癖堆耗尽时，毁眼费用/标记/压力及结束回合状态全部回滚", () => {
  for (const positive of [true, false]) {
    const s = setup(),
      b = s.battle!,
      pool = b.conditions!;
    const exhausted = {
      ...s,
      battle: {
        ...b,
        conditions: {
          ...pool,
          ...(positive ? { positiveDeck: [] } : { negativeDeck: [] }),
          quirkDiscard: pool.quirks
            .filter((q) => q.polarity === (positive ? "positive" : "negative"))
            .map((q) => q.id),
        },
      },
    };
    const result = positive
      ? destroy(exhausted)
      : applyCommand(exhausted, { type: "changeStance", actorId: "h0", direction: "backward" });
    if (positive) expect(result.state).toBe(exhausted);
    // 负面触发使用最后一个行动，确保实际走到结束回合。
    if (!positive) {
      const last = {
        ...exhausted,
        battle: {
          ...exhausted.battle,
          encounter: {
            ...b.encounter!,
            turn: {
              type: "hero" as const,
              actorId: "h0",
              actions: 1,
              usedSkillIds: [],
              mustMove: false,
            },
          },
        },
      };
      const failed = applyCommand(last, {
        type: "changeStance",
        actorId: "h0",
        direction: "backward",
      });
      expect(failed.state).toBe(last);
      expect(failed.events[0]!.type).toBe("commandRefused");
    } else expect(result.events[0]!.type).toBe("commandRefused");
  }
});
