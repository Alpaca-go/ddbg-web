import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { expect, it } from "vitest";
import { approvedTempleOfTheChosen as tile } from "../../data/src/normalize/temple-of-the-chosen";
import rooms from "../../data/normalized/corebox/room.json";
import catalog from "../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../data/src/normalize/room-tile-selection";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { roomEffectFixture } from "./test-helpers/room-effects";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { readRoomTile } from "./room-tile-selection";

function setup(areaId = "A", wounds = 8): GameState {
  const state = roomEffectFixture(roomTileBattleAreas(tile));
  const b = state.battle!;
  return {
    ...state,
    battle: {
      ...b,
      entities: b.entities.map((e) =>
        e.side === "monster" ? { ...e, areaId, wounds } : { ...e, areaId: "F" },
      ),
      encounter: { ...b.encounter!, deck: ["hero"], turn: { type: "monster", actorId: "m" } },
    },
  };
}
const end = (s: GameState) => applyCommand(s, { type: "finishMonsterTurn", actorId: "m" });

it("R-161/171：生产入口与星标投影，仅A区有区域效果", () => {
  const card = rooms.cards.find((c) => c.id === "room:p021");
  expect(selectRoomTile(card, catalog).status).toBe("matched");
  expect(readRoomTile(card).status).toBe("matched");
  expect(
    roomTileBattleAreas(tile)
      .filter((a) => a.riteOfTheChosen)
      .map((a) => a.id),
  ).toEqual(["A"]);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.riteOfTheChosen)).toBe(
    false,
  );
});
it("只由存活怪物在A结束回合触发，治疗全场存活怪物且封顶，不治疗英雄或复活", () => {
  const s = setup();
  const m = s.battle!.entities.find((e) => e.id === "m")!;
  const withOthers = {
    ...s,
    battle: {
      ...s.battle!,
      entities: [
        ...s.battle!.entities,
        { ...m, id: "m2", areaId: "C", stance: "defensive" as const, wounds: 2 },
        { ...m, id: "dead", areaId: "E", dead: true, wounds: 10 },
      ],
    },
  };
  const result = end(withOthers);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(
    result.state.battle!.entities.filter((e) => e.side === "monster").map((e) => e.wounds),
  ).toEqual([3, 0, 10]);
  expect(result.state.battle!.entities.find((e) => e.id === "h0")!.wounds).toBe(12);
  expect(
    result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
  ).toEqual([1, 1, 1, 1]);
  expect(end(setup("C")).state.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(8);
});
it("压力仅按各英雄自身负面怪癖计数，单次结算且顺序为姿态顺序，不发新怪癖", () => {
  const s = setup();
  const b = s.battle!;
  const held = {
    ...s,
    battle: {
      ...b,
      entities: b.entities
        .map((e) =>
          e.id === "h0"
            ? { ...e, quirkIds: ["quirk:p001", "quirk:p018"] }
            : e.id === "h1"
              ? { ...e, quirkIds: ["quirk:p019", "quirk:p020"] }
              : e,
        )
        .reverse(),
    },
  };
  const before = structuredClone(held),
    result = end(held);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  const stress = result.events.filter((e) => e.type === "areaStressResolved");
  expect(stress.map((e) => e.actorId)).toEqual(["h0", "h1", "h2", "h3"]);
  expect(result.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(2);
  expect(result.state.battle!.entities.find((e) => e.id === "h1")!.stress).toBe(3);
  expect(result.state.battle!.conditions).toEqual(b.conditions);
  expect(held).toEqual(before);
  expect(end(held)).toEqual(result);
});
it("压力触发心脏病即时移除，继续后面的英雄；治疗事件先于压力事件", () => {
  const s = setup();
  const b = s.battle!;
  const r = end({
    ...s,
    battle: {
      ...b,
      entities: b.entities.map((e) =>
        e.id === "h0"
          ? { ...e, stress: 9, resolveTested: true, resolveCardId: resolveFile.cards[0]!.id }
          : e,
      ),
    },
  });
  expect(r.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(r.state.battle!.entities.find((e) => e.id === "h0")!.dead).toBe(true);
  expect(r.state.battle!.entities.find((e) => e.id === "h1")!.stress).toBe(1);
  expect(
    r.events.findIndex((e) => e.type === "passiveTriggered" && e.trigger === "riteOfTheChosen"),
  ).toBeLessThan(r.events.findIndex((e) => e.type === "areaStressResolved"));
});
it("后续英雄压力预检拒绝时，怪物治疗、先前压力和RNG全部回滚", () => {
  const s = setup();
  const b = s.battle!;
  const unknown = {
    ...s,
    battle: { ...b, entities: b.entities.map((e) => (e.id === "h3" ? { ...e, stress: NaN } : e)) },
  };
  const r = end(unknown);
  expect(r.state).toBe(unknown);
  expect(r.events).toHaveLength(1);
  expect(r.events[0]!.type).toBe("commandRefused");
});
