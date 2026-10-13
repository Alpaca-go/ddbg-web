import { expect, it } from "vitest";
import {
  approvedExtraRuinsTiles,
  approvedExtraRuinsTileSchema,
} from "../../data/src/normalize/approved-ruins-tiles";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { finishTurn } from "./encounter";
import { QUIRK_NAMES } from "./passive";

const tile = approvedExtraRuinsTiles[0]!;
const stat = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.find((c) => c.name === "CRUSADER" && c.level === 1)!;
function setup(areaId = "G"): GameState {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, i) => ({
      id: `h${i}`,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      wounds: i === 0 ? 5 : 1,
      stress: 0,
      areaId: i === 0 ? areaId : i === 1 ? "I" : "J",
      stance,
      dodge: 0,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  const { heroStatId: _heroStatId, stress: _stress, ...monsterBase } = heroes[0]!;
  void _heroStatId;
  void _stress;
  const monster: BattleEntity = {
    ...monsterBase,
    id: "m",
    side: "monster",
    hero: null,
    areaId: "D",
    stanceSlots: 1,
    monsterCardId: "m",
    wounds: 0,
  };
  const s = createBattleState(1, {
    heroStats: [
      {
        id: stat.id,
        name: stat.name,
        life: stat.life,
        level: stat.level,
        attributesVerified: stat.attributesVerified,
      },
    ],
    entities: [...heroes, monster],
    areas: roomTileBattleAreas(tile),
    skills: [],
    monsters: [
      {
        id: "m",
        life: stat.life,
        verification: { unverified: false },
        type_position_tags: ["Beast"],
        skills: [],
      },
    ],
    light: 5,
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
it("VQ06锁定FRONT p2/遗迹3、高地/部署与十通路；候选/运行时漂移拒绝", () => {
  expect(tile.source).toEqual({ file: "DD_COREBOX_TILES_FRONT.pdf", page: 2, face: "front" });
  expect(tile.areas.filter((a) => a.elevation === "high").map((a) => a.id)).toEqual(["A", "C"]);
  expect(tile.edges.filter((e) => !e.blocked && !e.cornerOnly)).toHaveLength(10);
  expect(tile.deployment.lootAreas).toEqual([]);
  for (const changed of [
    { source: { ...tile.source, face: "back" } },
    { usable: false },
    { roomId: "room:p002" },
  ])
    expect(approvedExtraRuinsTileSchema.safeParse({ ...tile, ...changed }).success).toBe(false);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.endTurnHeal)).toBe(false);
});
it("Healing Waters只在存活英雄于G结束回合治疗3，保持RNG/他人/状态，结束后不再结算", () => {
  const s = setup(),
    before = structuredClone(s);
  const result = applyCommand(s, { type: "changeStance", actorId: "h0", direction: "backward" });
  expect(result.state.battle!.entities[0]!.wounds).toBe(2);
  expect(result.events.filter((e) => e.type === "heroHealthResolved")).toHaveLength(1);
  expect(result.state.battle!.entities.slice(1).map((e) => e.wounds)).toEqual(
    s.battle!.entities.slice(1).map((e) => e.wounds),
  );
  expect(result.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
  expect(s).toEqual(before);
  expect(
    applyCommand(result.state, { type: "changeStance", actorId: "h0", direction: "backward" })
      .state,
  ).toBe(result.state);
  expect(finishTurn(setup("F"), "h0", []).state.battle!.entities[0]!.wounds).toBe(5);
  const monsterHere = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) =>
        e.id === "m" ? { ...e, areaId: "G", wounds: 5 } : e,
      ),
    },
  };
  expect(
    finishTurn(monsterHere, "m", []).state.battle!.entities.find((e) => e.id === "m")!.wounds,
  ).toBe(5);
});
it("治疗离开死门不掷骰；缺Life拒绝本次结束回合，原状态保持", () => {
  const s = setup();
  const door = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) => (e.id === "h0" ? { ...e, wounds: stat.life } : e)),
    },
  };
  const result = finishTurn(door, "h0", []);
  expect(result.state.battle!.entities[0]!.wounds).toBe(stat.life - 3);
  const missing = {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) => {
        if (e.id !== "h0") return e;
        const { life: _life, ...missingLife } = e;
        void _life;
        return missingLife;
      }),
    },
  };
  expect(finishTurn(missing, "h0", []).state).toBe(missing);
  for (const [name, remaining] of [
    ["Infirm", 3],
    ["Fast Healer", 1],
  ] as const) {
    const id = `quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`;
    const holder = {
      ...s,
      battle: {
        ...s.battle!,
        entities: s.battle!.entities.map((e) => (e.id === "h0" ? { ...e, quirkIds: [id] } : e)),
      },
    };
    expect(finishTurn(holder, "h0", []).state.battle!.entities[0]!.wounds).toBe(remaining);
  }
});
