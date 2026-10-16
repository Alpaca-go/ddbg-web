import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import quirkFile from "../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../data/normalized/corebox/disease.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import {
  approvedExtraRuinsTiles,
  approvedExtraRuinsTileSchema,
} from "../../data/src/normalize/approved-ruins-tiles";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import type { ResolveCard } from "./pressure";
import { endTurnOldAbbey } from "./battle-old-abbey";
import { nextBattleRoll } from "./encounter";

const tile = approvedExtraRuinsTiles.find((t) => t.number === 9)!;
const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  );
const battleStats: NonNullable<BattleSetup["heroStats"]> = JSON.parse(JSON.stringify(stats));
const quirks = normalizedQuirkFileSchema.parse(quirkFile).cards;
const q = (name: string) => quirks.find((q) => q.name === name)!.id;
const diseaseCards = diseaseFileSchema.parse(diseaseFile).cards;
function setup(changes: Partial<BattleEntity> = {}, light = 5, seed = 1): GameState {
  const heroes: BattleEntity[] = stats.map((s, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: s.name,
    heroStatId: s.id,
    heroLevel: 1,
    life: s.life,
    wounds: i ? 0 : 5,
    stress: 0,
    areaId: i ? "O8" : "O5",
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    dodge: s.dodge,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(i ? {} : changes),
  }));
  const created = createBattleState(seed, {
    heroStats: battleStats,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        areaId: "O5",
        stance: "aggressive",
        stanceSlots: 1,
        monsterCardId: "m",
        life: 10,
        wounds: 5,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: roomTileBattleAreas(tile),
    skills: [],
    light,
    resolveCards: resolveFile.cards as ResolveCard[],
    conditions: createConditionPool(diseaseCards, quirks),
    monsters: [
      {
        id: "m",
        life: 10,
        verification: { unverified: false },
        skills: [],
        type_position_tags: ["Beast"],
      },
    ],
  });
  const started = applyCommand(created, { type: "startBattle" }).state;
  return {
    ...started,
    battle: {
      ...started.battle!,
      rngCursor: 0,
      encounter: {
        ...started.battle!.encounter!,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [], mustMove: false },
      },
    },
  };
}
const hero = (s: GameState) => s.battle!.entities.find((e) => e.id === "h0")!;
const end = (s: GameState) =>
  applyCommand(s, { type: "changeStance", actorId: "h0", direction: "backward" });
it("整面深度锁定及仅O1/O5星区；未就绪不投影", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  expect(approvedExtraRuinsTileSchema.safeParse({ ...tile, usable: false }).success).toBe(false);
  expect(
    roomTileBattleAreas(tile)
      .filter((a) => a.feelingThePresence)
      .map((a) => a.id),
  ).toEqual(["O1", "O5"]);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.feelingThePresence)).toBe(
    false,
  );
});
it.each(["O1", "O5"])(
  "%s单次负面总压力修正、伤口、再单次正面治疗；净伤口相同也保留两个事件",
  (areaId) => {
    const state = setup({
      areaId,
      diseaseId: diseaseCards.find((d) => d.name === "The Worries")!.id,
      quirkIds: [q("Infirm"), q("Fast Healer"), q("Resilient")],
    });
    const before = structuredClone(state),
      result = end(state);
    expect(
      result.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toBe(false);
    expect(hero(result.state)).toMatchObject({ stress: 2, wounds: 5 });
    const health = result.events.filter((e) => e.type === "heroHealthResolved");
    expect(health.map((e) => e.effect)).toEqual([
      { type: "wounds", amounts: [2] },
      { type: "heal", amount: 2 },
    ]);
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(state).toEqual(before);
    expect(result).toEqual(end(state));
  },
);
it("三个负面合并一个压力事件，低光／Nervous／Soft只修正一次；零正面不免费治疗", () => {
  const state = setup({ quirkIds: [q("Nervous"), q("Soft"), q("Off Guard")] }, 2);
  const result = end(state);
  expect(hero(result.state)).toMatchObject({ stress: 5, wounds: 6 });
  expect(result.events.filter((e) => e.type === "heroHealthResolved").map((e) => e.effect)).toEqual(
    [{ type: "wounds", amounts: [1] }],
  );
});
it("零负面不触发Worries或额外压力；正面治疗总量与Fast Healer加成各一次", () => {
  const state = setup(
    {
      diseaseId: diseaseCards.find((d) => d.name === "The Worries")!.id,
      quirkIds: [q("Fast Healer"), q("Resilient"), q("On Guard")],
    },
    0,
  );
  const result = end(state);
  expect(hero(result.state)).toMatchObject({ stress: 0, wounds: 1 });
  expect(result.events.filter((e) => e.type === "heroHealthResolved").map((e) => e.effect)).toEqual(
    [{ type: "heal", amount: 4 }],
  );
});
it("心脏病死亡取消后续治疗；其他英雄与怪物不受益", () => {
  const state = setup({
    stress: 9,
    quirkIds: [q("Infirm"), q("Fast Healer")],
    resolveTested: true,
    resolveCardId: resolveFile.cards[0]!.id,
  });
  const result = end(state);
  expect(hero(result.state)).toMatchObject({ stress: 10, wounds: 5, dead: true });
  expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
  expect(
    result.events.some((e) => e.type === "heroHealthResolved" && e.effect.type === "heal"),
  ).toBe(false);
  expect(result.state.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(5);
  expect(endTurnOldAbbey(state, "m", [])).toBeNull();
});
it("压力追加傷口死门死亡取消意志与治疗；空白存活才意志后治疗", () => {
  for (const dies of [true, false]) {
    const seed = Array.from({ length: 100 }, (_, i) => i).find(
      (s) => nextBattleRoll(s, 0) <= 3 === dies,
    )!;
    const state = setup(
      { stress: 9, wounds: stats[0]!.life, quirkIds: [q("Soft"), q("Fast Healer")] },
      5,
      seed,
    );
    const result = end(state);
    expect(hero(result.state).dead).toBe(dies);
    expect(result.events.some((e) => e.type === "resolveTested")).toBe(!dies);
    const healing = result.events.filter(
      (e) => e.type === "heroHealthResolved" && e.effect.type === "heal",
    );
    expect(healing).toHaveLength(dies ? 0 : 1);
    if (dies) expect(result.state.battle!.rngCursor).toBe(1);
    else {
      expect(hero(result.state).wounds).toBe(stats[0]!.life - 2);
      expect(result.events.findIndex((e) => e.type === "resolveTested")).toBeLessThan(
        result.events.findIndex((e) => e.type === "heroHealthResolved" && e.effect.type === "heal"),
      );
    }
    expect(
      conditionPoolProblem(
        result.state.battle!.conditions!,
        result.state.battle!.entities.filter((e) => e.side === "hero"),
      ),
    ).toBeNull();
    expect(result).toEqual(end(state));
  }
});
it("非星区、零怪癖不触发；缺资料原子拒绝，新增自动治疗不能绕过禁疗", () => {
  for (const state of [setup({ areaId: "O8", quirkIds: [q("Nervous")] }), setup()]) {
    const result = end(state);
    expect(hero(result.state)).toMatchObject({ stress: 0, wounds: 5 });
    expect(
      result.events.some((e) => e.type === "areaStressResolved" || e.type === "heroHealthResolved"),
    ).toBe(false);
  }
  const initial = setup({ quirkIds: [q("Infirm"), q("Fast Healer")] });
  const { conditions: _pool, ...withoutPool } = initial.battle!;
  void _pool;
  const missing = { ...initial, battle: withoutPool };
  expect(end(missing).state).toBe(missing);
  const blocked = {
    ...initial,
    battle: {
      ...initial.battle!,
      areas: initial.battle!.areas.map((a) =>
        a.id === "O5" ? { ...a, healingForbidden: true as const } : a,
      ),
    },
  };
  const result = end(blocked);
  expect(hero(result.state)).toMatchObject({ stress: 1, wounds: 5 });
  expect(result.events.some((e) => e.type === "healingPrevented")).toBe(true);
});
