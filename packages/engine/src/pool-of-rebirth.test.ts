import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import quirkFile from "../../data/normalized/corebox/quirk.json";
import diseaseFile from "../../data/normalized/corebox/disease.json";
import resolveFile from "../../data/normalized/corebox/virtue_affliction.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { diseaseFileSchema } from "../../data/src/disease";
import { approvedPoolOfRebirth as tile } from "../../data/src/normalize/pool-of-rebirth";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import type { ResolveCard } from "./pressure";
import { endTurnPoolOfRebirth } from "./battle-pool-of-rebirth";
import { nextBattleRoll } from "./encounter";

const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  );
const quirks = normalizedQuirkFileSchema.parse(quirkFile).cards;
const q = (name: string) => quirks.find((entry) => entry.name === name)!.id;
const diseases = diseaseFileSchema.parse(diseaseFile).cards;
function setup(changes: Partial<BattleEntity> = {}, light = 5, seed = 1): GameState {
  const heroes: BattleEntity[] = stats.map((s, i) => ({
    id: `h${i}`,
    side: "hero",
    hero: s.name,
    heroStatId: s.id,
    heroLevel: 1,
    life: s.life,
    wounds: i ? 0 : 12,
    stress: 0,
    areaId: i ? "L" : "F",
    dodge: s.dodge,
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(i ? {} : changes),
  }));
  // 独立区域机制夹具；公开清场复活由pool-rebirth-flow场景覆盖。
  const created = createBattleState(seed, {
    heroStats: JSON.parse(JSON.stringify(stats)) as NonNullable<BattleSetup["heroStats"]>,
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        areaId: "F",
        stance: "aggressive",
        stanceSlots: 1,
        monsterCardId: "m",
        life: 10,
        wounds: 0,
        dodge: 0,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: roomTileBattleAreas({ ...tile, usable: true }),
    skills: [],
    light,
    resolveCards: resolveFile.cards as ResolveCard[],
    conditions: createConditionPool(diseases, quirks),
    monsters: [
      {
        id: "m",
        life: 10,
        verification: { unverified: false },
        skills: [],
        stanceGroups: [{ stances: ["aggressive", "defensive", "ranged", "support"], skill: 1 }],
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
const healed = (r: ReturnType<typeof end>) =>
  r.events.filter((e) => e.type === "heroHealthResolved").filter((e) => e.effect.type === "heal");

it("生产面开放后仅F区投影重生池区域效果，关闭面时不投影", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRoomEffect.runtimeReady).toBe(true);
  expect(roomTileBattleAreas({ ...tile, usable: false }).some((a) => a.poolOfRebirth)).toBe(false);
  expect(
    roomTileBattleAreas({ ...tile, usable: true })
      .filter((a) => a.poolOfRebirth)
      .map((a) => a.id),
  ).toEqual(["F"]);
});
it.each([0, 1, 2, 3])("%i个负面怪癖：单次压力N后单次治疗3N，不计正面怪癖", (count) => {
  const state = setup({
    quirkIds: [q("Off Guard"), q("Anemic"), q("Weak Grip")].slice(0, count),
  });
  const before = structuredClone(state),
    result = end(state);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(hero(result.state)).toMatchObject({ stress: count, wounds: 12 - 3 * count });
  expect(healed(result)).toHaveLength(count ? 1 : 0);
  expect(result.state.battle!.rngCursor).toBe(0);
  expect(state).toEqual(before);
  expect(result).toEqual(end(JSON.parse(JSON.stringify(state)) as GameState));
});
it("低光/Nervous/Soft一次修正压力，Fast Healer一次修正治疗", () => {
  const state = setup({ quirkIds: [q("Nervous"), q("Soft"), q("Fast Healer")] }, 2);
  const result = end(state);
  expect(hero(result.state)).toMatchObject({ stress: 4, wounds: 6 });
  expect(result.events.filter((e) => e.type === "heroHealthResolved").map((e) => e.effect)).toEqual(
    [
      { type: "wounds", amounts: [1] },
      { type: "heal", amount: 7 },
    ],
  );
});
it.each([
  ["Infirm", 2, 5],
  ["Fast Healer", 1, 4],
] as const)("%s只修正一次完整治疗", (name, stress, amount) => {
  const result = end(setup({ quirkIds: [q("Off Guard"), q(name)] }));
  expect(hero(result.state)).toMatchObject({ stress, wounds: 12 - amount });
  expect(healed(result).map((event) => event.effect)).toEqual([{ type: "heal", amount }]);
});
it("未耗尽行动时不触发，实际结束回合才结算一次", () => {
  const initial = setup({ quirkIds: [q("Off Guard")] });
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        ...initial.battle!.encounter!,
        turn: {
          type: "hero" as const,
          actorId: "h0",
          actions: 2,
          usedSkillIds: [],
          mustMove: false,
        },
      },
    },
  };
  const first = end(state);
  expect(first.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(hero(first.state)).toMatchObject({ stress: 0, wounds: 12 });
  expect(healed(first)).toHaveLength(0);
  const second = end(first.state);
  expect(second.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(hero(second.state)).toMatchObject({ stress: 1, wounds: 9 });
  expect(healed(second)).toHaveLength(1);
});
it("心脏病死亡取消治疗，且不影响其它英雄/怪物", () => {
  const state = setup({
    stress: 9,
    quirkIds: [q("Off Guard")],
    resolveTested: true,
    resolveCardId: resolveFile.cards[0]!.id,
  });
  const result = end(state);
  expect(hero(result.state).dead).toBe(true);
  expect(healed(result)).toHaveLength(0);
  expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
  expect(
    result.state.battle!.entities.filter((e) => e.id !== "h0").every((e) => e.wounds === 0),
  ).toBe(true);
  expect(endTurnPoolOfRebirth(state, "m", [])).toBeNull();
});
it("压力追加伤口先死门；死亡不意志/治疗，存活先意志再治疗；可确定回放", () => {
  for (const dies of [true, false]) {
    const seed = Array.from({ length: 100 }, (_, i) => i).find(
      (s) => nextBattleRoll(s, 0) <= 3 === dies,
    )!;
    const state = setup({ stress: 9, wounds: stats[0]!.life, quirkIds: [q("Soft")] }, 5, seed),
      result = end(state);
    expect(hero(result.state).dead).toBe(dies);
    expect(healed(result)).toHaveLength(dies ? 0 : 1);
    expect(result.events.some((e) => e.type === "resolveTested")).toBe(!dies);
    if (!dies) {
      expect(hero(result.state).wounds).toBe(stats[0]!.life - 3);
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
it("非F区/仅正面怪癖不触发；缺池原子拒绝；禁疗仍收取压力", () => {
  for (const state of [
    setup({ areaId: "L", quirkIds: [q("Off Guard")] }),
    setup({ quirkIds: [q("Fast Healer")] }),
  ]) {
    const result = end(state);
    expect(hero(result.state)).toMatchObject({ stress: 0, wounds: 12 });
    expect(healed(result)).toHaveLength(0);
  }
  const initial = setup({ quirkIds: [q("Off Guard")] });
  const { conditions: _pool, ...missing } = initial.battle!;
  void _pool;
  const invalid = { ...initial, battle: missing };
  expect(end(invalid).state).toBe(invalid);
  const blocked = {
    ...initial,
    battle: {
      ...initial.battle!,
      areas: initial.battle!.areas.map((a) =>
        a.id === "F" ? { ...a, healingForbidden: true as const } : a,
      ),
    },
  };
  const result = end(blocked);
  expect(hero(result.state)).toMatchObject({ stress: 1, wounds: 12 });
  expect(result.events.some((e) => e.type === "healingPrevented")).toBe(true);
});
