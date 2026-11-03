import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { approvedEldritchPowerChamber as tile } from "../../data/src/normalize/eldritch-power-chamber";
import rooms from "../../data/normalized/corebox/room.json";
import catalog from "../../data/normalized/corebox/room_tile_geometry.json";
import { selectRoomTile } from "../../data/src/normalize/room-tile-selection";
import { applyCommand, createBattleState } from "./index";
import type { BattleArea, BattleEntity, GameState, MonsterCardView, SkillStance } from "./index";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { readRoomTile } from "./room-tile-selection";
import { finishTurn } from "./encounter";
import {
  endTurnEldritchPower,
  preferEldritchPowerMoveOptions,
  scoreEldritchPowerApproachSteps,
} from "./battle-eldritch-power";
import { coreQuestSources } from "./test-helpers/core-quest";

const soldier = (
  JSON.parse(
    readFileSync(
      new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ).cards as MonsterCardView[]
).find((card) => card.id === "monster_medium:p001")!;
const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const prepare = { type: "prepareMonsterAction", actorId: "m" } as const;
const move = { type: "moveMonsterToRange", actorId: "m" } as const;
const heroStat = coreQuestSources.catalog.heroStats.find((s) => s.name === "CRUSADER")!;

function graph(pairs: string[], eldritchAreaId?: string): BattleArea[] {
  return [...new Set(pairs.join(""))].sort().map((id) => ({
    id,
    capacity: 8,
    elevation: "normal" as const,
    adjacent: pairs.filter((pair) => pair.includes(id)).map((pair) => pair.replace(id, "")),
    ...(id === eldritchAreaId ? { eldritchPower: true as const } : {}),
  }));
}

function monsterTurn(
  areas: readonly BattleArea[],
  from: string,
  heroArea: string,
  seed = 11,
): GameState {
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: heroStat.name,
    heroStatId: heroStat.id,
    heroLevel: heroStat.level,
    life: heroStat.life,
    skillIds: [],
    areaId: index === 0 ? heroArea : areas.at(-1)!.id,
    stance,
    wounds: 0,
    stress: 0,
    dodge: heroStat.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const monster: BattleEntity = {
    id: "m",
    side: "monster",
    hero: null,
    skillIds: [],
    areaId: from,
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
  let state = applyCommand(
    createBattleState(seed, {
      monsters: [soldier],
      heroStats: [heroStat],
      areas,
      skills: [],
      light: 5,
      entities: [...heroes, monster],
    }),
    { type: "startBattle" },
  ).state;
  for (let i = 0; i < 8; i++) {
    state = applyCommand(state, { type: "drawInitiative" }).state;
    const turn = state.battle!.encounter!.turn;
    if (turn.type === "monster") return applyCommand(state, prepare).state;
    if (turn.type !== "hero") throw new Error("缺少英雄 / 怪物回合");
    const stance = state.battle!.entities.find((entity) => entity.id === turn.actorId)!.stance;
    const direction = stance === "aggressive" ? "backward" : "forward";
    state = applyCommand(state, { type: "changeStance", actorId: turn.actorId, direction }).state;
    state = applyCommand(state, {
      type: "changeStance",
      actorId: turn.actorId,
      direction: direction === "forward" ? "backward" : "forward",
    }).state;
  }
  throw new Error("没有抽到怪物");
}

it("R-158：参战闸门、橙星投影与 readRoomTile", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  expect(
    selectRoomTile(
      rooms.cards.find((c) => c.id === "room:p018"),
      catalog,
    ).status,
  ).toBe("matched");
  const areas = roomTileBattleAreas(tile);
  expect(areas.filter((a) => a.eldritchPower).map((a) => a.id)).toEqual(["C"]);
  expect(readRoomTile(rooms.cards.find((c) => c.id === "room:p018")).status).toBe("matched");
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.eldritchPower)).toBe(false);
});

it("R-158：进射程移动在同等落点中优先靠近橙星 C", () => {
  const pairs = ["ab", "ac", "bd", "cd", "de"];
  const plain = applyCommand(monsterTurn(graph(pairs), "a", "d"), move);
  expect(plain.pendingChoice?.options.map((o) => o.id).sort()).toEqual(["b", "c"]);

  const biased = applyCommand(monsterTurn(graph(pairs, "c"), "a", "d"), move);
  expect(biased.pendingChoice).toBeUndefined();
  expect(biased.events[0]).toMatchObject({ type: "monsterPositioned", to: "c", skipped: false });
});

it("R-158：已在射程内原地定位不额外朝橙星移动", () => {
  const moved = applyCommand(
    monsterTurn(graph(["ab", "ac", "bd", "cd", "de"], "c"), "c", "d"),
    move,
  );
  expect(moved.events[0]).toMatchObject({ from: "c", to: "c", steps: 0, skipped: false });
});

it("R-158：无法进射程时接近评分朝橙星而非出手位", () => {
  const pairs = ["ab", "ac", "bd", "cd", "de"];
  const areas = graph(pairs, "c");
  expect(scoreEldritchPowerApproachSteps(areas, "c", ["d"])).toBe(0);
  expect(scoreEldritchPowerApproachSteps(areas, "b", ["d"])).toBe(2);
  expect(preferEldritchPowerMoveOptions(areas, "a", ["b", "c"])).toEqual(["c"]);
  expect(scoreEldritchPowerApproachSteps(graph(pairs), "b", ["d"])).toBe(1);
});

it("R-158：怪物在 C 结束回合每名存活英雄 5 伤；不在 C 或无橙星区不触发", () => {
  const areas = roomTileBattleAreas(tile);
  const stat = coreQuestSources.catalog.heroStats[0]!;
  const heroes: BattleEntity[] = stances.map((stance, index) => ({
    id: `h${index}`,
    side: "hero",
    hero: stat.name,
    heroStatId: stat.id,
    heroLevel: stat.level,
    life: stat.life,
    skillIds: [],
    areaId: "G",
    stance,
    wounds: 0,
    stress: 0,
    dodge: stat.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  const base = createBattleState(5, {
    monsters: [soldier],
    heroStats: coreQuestSources.catalog.heroStats,
    areas,
    skills: [],
    light: 5,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        skillIds: [],
        areaId: "C",
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
      },
    ],
  });
  const onStar = {
    ...base,
    battle: {
      ...base.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster" as const, actorId: "m" },
      },
    },
  };
  const offStar = {
    ...onStar,
    battle: {
      ...onStar.battle!,
      entities: onStar.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "F" } : e)),
    },
  };
  expect(endTurnEldritchPower(offStar, "m", [])).toBeNull();
  const noStar = {
    ...onStar,
    battle: {
      ...onStar.battle!,
      areas: graph(["ab", "ac", "bd", "cd", "de"]),
      entities: onStar.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "c" } : e)),
    },
  };
  expect(endTurnEldritchPower(noStar, "m", [])).toBeNull();

  const resolved = finishTurn(onStar, "m", []);
  const liveHeroes = resolved.state.battle!.entities.filter((e) => e.side === "hero" && !e.dead);
  expect(liveHeroes.every((e) => e.wounds === 5)).toBe(true);
  expect(
    resolved.events.filter((e) => e.type === "passiveTriggered" && e.trigger === "eldritchPower"),
  ).toHaveLength(liveHeroes.length);
});

it("R-158：命令序列与回放稳定", () => {
  const run = () =>
    applyCommand(monsterTurn(graph(["ab", "ac", "bd", "cd", "de"], "c"), "a", "d", 19), move);
  expect(run()).toEqual(run());
});
