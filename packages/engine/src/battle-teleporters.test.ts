import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { approvedTeleporters as tile } from "../../data/src/normalize/teleporters";
import rooms from "../../data/normalized/corebox/room.json";
import catalog from "../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../data/src/normalize/room-tile-selection";
import { applyCommand, createBattleState } from "./index";
import type { BattleArea, BattleEntity, GameState, MonsterCardView } from "./index";
import { distance } from "./battle";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { readRoomTile } from "./room-tile-selection";
import { withTeleporterAdjacency } from "./battle-teleporters";
import { coreQuestSources } from "./test-helpers/core-quest";

const heroStat = coreQuestSources.catalog.heroStats.find(
  (s) => s.name === "HELLION" && s.attributesVerified,
)!;
const soldier = (
  JSON.parse(
    readFileSync(
      new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ).cards as MonsterCardView[]
).find((card) => card.id === "monster_medium:p001")!;
const areas = () => roomTileBattleAreas(tile);

function heroTurn(state: GameState, actorId: string, actions = 2): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        ...state.battle!.encounter!,
        turn: { type: "hero", actorId, actions, usedSkillIds: [], mustMove: false },
      },
    },
  };
}

function battleAt(heroArea: string, monsterArea: string, seed = 7): GameState {
  const battleAreas = areas();
  const hero: BattleEntity = {
    id: "h0",
    side: "hero",
    hero: heroStat.name,
    heroStatId: heroStat.id,
    heroLevel: heroStat.level,
    life: heroStat.life,
    skillIds: [],
    areaId: heroArea,
    stance: "ranged",
    wounds: 0,
    stress: 0,
    dodge: heroStat.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const monster: BattleEntity = {
    id: "m0",
    side: "monster",
    hero: null,
    skillIds: [],
    areaId: monsterArea,
    stance: "aggressive",
    stanceSlots: 1,
    monsterCardId: soldier.id,
    life: soldier.life,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const state = applyCommand(
    createBattleState(seed, {
      heroStats: [heroStat],
      monsters: [soldier],
      areas: battleAreas,
      skills: [],
      light: 5,
      entities: [hero, monster],
    }),
    { type: "startBattle" },
  ).state;
  return heroTurn(state, "h0");
}

it("R-159：参战闸门、橙星投影与 readRoomTile", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  const projected = areas();
  expect(projected.filter((a) => a.teleporter).map((a) => a.id)).toEqual(["A", "C", "F", "H"]);
  expect([...projected.find((a) => a.id === "A")!.adjacent].sort()).toEqual(["C", "D", "F", "H"]);
  expect(projected.find((a) => a.id === "B")!.adjacent).toEqual(["C"]);
  expect(projected.find((a) => a.id === "E")!.adjacent).toEqual(["H"]);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.teleporter)).toBe(false);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p019"),
      catalog,
    ),
  ).toMatchObject({ status: "matched" });
  expect(readRoomTile(rooms.cards.find((c) => c.id === "room:p019")).status).toBe("matched");
});

it("橙星虚拟邻接不污染非本房与无橙星区", () => {
  const plain: BattleArea[] = [
    { id: "x", capacity: 4, elevation: "normal", adjacent: ["y"] },
    { id: "y", capacity: 4, elevation: "normal", adjacent: ["x"] },
  ];
  expect(withTeleporterAdjacency(plain)).toEqual(plain);
  const mixed: BattleArea[] = [
    { id: "A", capacity: 4, elevation: "normal", adjacent: ["D"], teleporter: true },
    { id: "C", capacity: 4, elevation: "normal", adjacent: ["B"], teleporter: true },
    { id: "B", capacity: 4, elevation: "normal", adjacent: ["C"] },
    { id: "D", capacity: 4, elevation: "normal", adjacent: ["A"] },
  ];
  expect([...withTeleporterAdjacency(mixed).find((a) => a.id === "A")!.adjacent].sort()).toEqual([
    "C",
    "D",
  ]);
});

it("跨橙星移动成立；非橙星不能借传送跨孤岛", () => {
  const battleAreas = areas();
  expect(distance(battleAreas, "B", "H")).toBe(2);
  expect(distance(battleAreas, "B", "E")).toBe(3);
  expect(distance(battleAreas, "G", "A")).toBe(2);
  const moved = applyCommand(battleAt("B", "H"), {
    type: "moveHero",
    actorId: "h0",
    path: ["C", "H"],
  });
  expect(moved.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(moved.state.battle!.entities.find((e) => e.id === "h0")!.areaId).toBe("H");
  const blocked = applyCommand(battleAt("B", "E"), {
    type: "moveHero",
    actorId: "h0",
    path: ["E"],
  });
  expect(blocked.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("英雄穿过橙星区逐步压力 +1；非橙星路径不触发", () => {
  const through = applyCommand(battleAt("G", "A"), {
    type: "moveHero",
    actorId: "h0",
    path: ["F", "A"],
  });
  expect(through.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(through.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(2);
  expect(
    through.events.filter(
      (e) => e.type === "areaStressResolved" && e.message.includes("Teleporters"),
    ),
  ).toHaveLength(2);
  const physical = applyCommand(battleAt("B", "C"), {
    type: "moveHero",
    actorId: "h0",
    path: ["C"],
  });
  expect(physical.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(1);
  const replay = applyCommand(battleAt("G", "A"), {
    type: "moveHero",
    actorId: "h0",
    path: ["F", "A"],
  });
  expect(replay.state.battle!.rngCursor).toBe(through.state.battle!.rngCursor);
  expect(replay.events.filter((e) => e.type === "areaStressResolved")).toEqual(
    through.events.filter((e) => e.type === "areaStressResolved"),
  );
});

it("橙星虚拟邻接使跨岛攻击距离可达", () => {
  const battleAreas = areas();
  expect(distance(battleAreas, "D", "H")).toBe(2);
  expect(distance(battleAreas, "B", "F")).toBe(2);
});
