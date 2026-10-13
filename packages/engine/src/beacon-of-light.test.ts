import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedVirtueAfflictionFileSchema } from "../../data/src/normalize/schema";
import {
  approvedExtraRuinsTiles,
  approvedExtraRuinsTileSchema,
} from "../../data/src/normalize/approved-ruins-tiles";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { finishTurn } from "./encounter";
import { QUIRK_NAMES } from "./passive";
import type { ResolveCard } from "./pressure";

const tile = approvedExtraRuinsTiles.find((t) => t.number === 5)!;
const stat = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.find((c) => c.name === "CRUSADER" && c.level === 1)!;
function setup(areaId: string, stress = 3, light = 5): GameState {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, i) => ({
      id: `h${i}`,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      wounds: 0,
      stress,
      areaId: i === 0 ? areaId : i === 1 ? "L6" : "L7",
      stance,
      dodge: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  const monster: BattleEntity = {
    id: "m",
    side: "monster",
    hero: null,
    life: 8,
    wounds: 1,
    areaId: "L1",
    stance: "aggressive",
    stanceSlots: 1,
    monsterCardId: "m",
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  const s = createBattleState(1, {
    roomName: tile.name,
    heroStats: [{ id: stat.id, name: stat.name, life: stat.life, attributesVerified: true }],
    entities: [...heroes, monster],
    areas: roomTileBattleAreas(tile),
    skills: [],
    monsters: [
      {
        id: "m",
        life: 8,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        skills: [],
      },
    ],
    light,
    resolveCards: JSON.parse(
      JSON.stringify(normalizedVirtueAfflictionFileSchema.parse(resolveFile).cards),
    ) as ResolveCard[],
  });
  const started = applyCommand(s, { type: "startBattle" }).state;
  return {
    ...started,
    battle: {
      ...started.battle!,
      encounter: {
        ...started.battle!.encounter!,
        deck: ["hero"],
        turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
it("R065/VQ14本面八条连接与六个明确区域钩子；usable/标记/来源漂移拒绝", () => {
  expect(tile.areas.map((a) => a.capacity)).toEqual([4, 4, 3, 2, 3, 2, 2, 2, 2]);
  expect(tile.edges).toHaveLength(8);
  const areas = roomTileBattleAreas(tile);
  expect(areas.filter((a) => a.endTurnStress === 1).map((a) => a.id)).toEqual([
    "L1",
    "L3",
    "L6",
    "L7",
    "L9",
  ]);
  expect(areas.filter((a) => a.endTurnStress === -1).map((a) => a.id)).toEqual(["L2"]);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.endTurnStress)).toBe(false);
  expect(
    approvedExtraRuinsTileSchema.safeParse({
      ...tile,
      specialRegions: tile.specialRegions.slice(1),
    }).success,
  ).toBe(false);
});
it("英雄回合结束红星+1/绿星-1只一次，低光只修正增压，恢复有零下限；怪物不触发", () => {
  for (const [area, stress, light, expected] of [
    ["L1", 3, 5, 4],
    ["L2", 3, 5, 2],
    ["L2", 0, 5, 0],
    ["L4", 3, 5, 3],
    ["L1", 3, 1, 5],
    ["L2", 3, 1, 2],
  ] as const) {
    const s = setup(area, stress, light),
      before = structuredClone(s);
    const done = applyCommand(s, { type: "changeStance", actorId: "h0", direction: "backward" });
    expect(done.state.battle!.entities[0]!.stress).toBe(expected);
    expect(done.state.battle!.entities.slice(1).map((e) => e.stress)).toEqual(
      s.battle!.entities.slice(1).map((e) => e.stress),
    );
    expect(done.state.battle!.light).toBe(light);
    expect(done.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
    expect(s).toEqual(before);
    expect(
      applyCommand(done.state, { type: "changeStance", actorId: "h0", direction: "backward" })
        .state,
    ).toBe(done.state);
  }
  const m = setup("L1");
  expect(finishTurn(m, "m", []).events.some((e) => e.type === "areaStressResolved")).toBe(false);
});
it("区域压力沿既有意志/心脏病收尾；Resilient/Nervous各修正一次", () => {
  const stressed = setup("L1", 9);
  const resolved = finishTurn(stressed, "h0", []);
  expect(resolved.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
  expect(resolved.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(0);
  for (const [name, area, expected] of [
    ["Resilient", "L2", 1],
    ["Nervous", "L1", 5],
  ] as const) {
    const s = setup(area);
    const holder = {
      ...s,
      battle: {
        ...s.battle!,
        entities: s.battle!.entities.map((e) =>
          e.id === "h0"
            ? {
                ...e,
                quirkIds: [`quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`],
              }
            : e,
        ),
      },
    };
    expect(finishTurn(holder, "h0", []).state.battle!.entities[0]!.stress).toBe(expected);
  }
});
