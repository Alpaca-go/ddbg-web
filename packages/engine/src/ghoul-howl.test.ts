import { expect, it } from "vitest";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createBattleState } from "./battle";
import type { BattleEntity } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { resolveMonsterSkillEffects } from "./monster-skill";
import { conditionPoolProblem } from "./conditions";

const card = sources.catalog.monsters.find((c) => c.id === "monster_large:p003")!;
const seedFor = (roll: number) =>
  Array.from({ length: 1000 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
const howl = { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 3 } as const;
function setup(roll = 3, light = 5): GameState {
  const initial = createBattleState(seedFor(roll), {
    ...sources.catalog,
    resolveCards: sources.resolveCards,
    light,
    entities: [
      ...coreParty.map((h, i): BattleEntity => {
        const stat = sources.catalog.heroStats.find((s) => s.id === h.heroStatId)!;
        return {
          id: `h${i}`,
          hero: stat.name,
          heroStatId: stat.id,
          heroLevel: 1,
          side: "hero",
          life: stat.life,
          wounds: 0,
          stress: 0,
          dodge: 0,
          stance: h.stance,
          areaId: "a",
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
        };
      }),
      {
        id: "m",
        hero: null,
        side: "monster",
        monsterCardId: card.id,
        life: 26,
        wounds: 0,
        dodge: 1,
        stance: "aggressive",
        stanceSlots: 2,
        areaId: "b",
        innateProtection: true,
        protection: true,
        shuffleResist: true,
        skillIds: [],
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
    areas: [
      { id: "a", adjacent: ["b"], elevation: "normal", capacity: 8 },
      { id: "b", adjacent: ["a"], elevation: "normal", capacity: 8 },
    ],
  });
  return {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        actedIds: [],
        deck: ["hero"],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}
const hero = (s: GameState, id: string) => s.battle!.entities.find((e) => e.id === id)!;
function patch(s: GameState, id: string, changes: Partial<BattleEntity>): GameState {
  return {
    ...s,
    battle: {
      ...s.battle!,
      entities: s.battle!.entities.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    },
  };
}
function ok(s: GameState, c: Command = howl) {
  const r = applyCommand(s, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r;
}
function conserved(s: GameState) {
  expect(
    conditionPoolProblem(
      s.battle!.conditions!,
      s.battle!.entities.filter((e) => e.side === "hero"),
    ),
  ).toBeNull();
}

it("Howl全部骰面：光照5零伤害命中无生命效果/反弹；光照4的暴击伤害1先行", () => {
  for (const light of [5, 4])
    for (let roll = 1; roll <= 10; roll++) {
      const r = resolveMonsterSkillEffects(
        card,
        3,
        {
          actor: { id: "m", wounds: 0 },
          target: { id: "h", side: "hero", wounds: 17, stress: 0, dodge: 0, riposte: true },
          areaDistance: 1,
          targetsInArea: 4,
          light,
        },
        roll,
      );
      if (r.status !== "resolved") throw new Error(r.reason);
      const crit = light === 4 && roll === 1,
        miss = light === 5 && roll === 10;
      expect(r.resolution).toMatchObject({
        outcome: crit ? "crit" : miss ? "miss" : "hit",
        damageDealt: crit ? 1 : miss ? null : 0,
        targetStress: crit ? 1 : 0,
        skipped: [],
      });
      expect(r.resolution.orderedMonsterTargetEffects).toEqual(
        miss ? undefined : { light: -1, stress: 2 },
      );
      expect(r.healthEffects).toHaveLength(crit ? 2 : 0);
    }
});

it("R-084四目标共享一骰，逐名光照4/3/2/1与压力2/2/3/3；完整实体池守恒", () => {
  const s = patch(setup(), "h3", { guard: true }),
    before = structuredClone(s),
    r = ok(s, { ...howl, targetId: "h3" });
  expect(
    r.events
      .filter((e) => e.type === "monsterTargetEffectsResolved")
      .map((e) => [e.light, e.stress]),
  ).toEqual([
    [4, 2],
    [3, 2],
    [2, 3],
    [1, 3],
  ]);
  expect(r.events.filter((e) => e.type === "diseaseAcquired").map((e) => e.entityId)).toEqual([
    "h0",
    "h1",
    "h2",
    "h3",
  ]);
  expect(r.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.wounds)).toEqual([
    0, 0, 0, 0,
  ]);
  expect(r.state.battle!.rngCursor).toBe(11); // 攻击1 + 首次完整11张疾病洗牌10。
  expect(r.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  expect(applyCommand(s, { ...howl, targetId: "h3" })).toEqual(r);
  expect(s).toEqual(before);
  conserved(r.state);
});

it("命中名单按声明光照固定，落空者不降光照/增压/感染；后续降光不重判命中", () => {
  let s = setup(9);
  for (const id of ["h1", "h2", "h3"]) s = patch(s, id, { dodge: 1 });
  const r = ok(s);
  expect(r.state.battle!.light).toBe(4);
  expect(hero(r.state, "h0")).toMatchObject({ stress: 2, wounds: 0 });
  for (const id of ["h1", "h2", "h3"])
    expect(hero(r.state, id)).toMatchObject({ stress: 0, wounds: 0 });
  expect(r.events.filter((e) => e.type === "diseaseAcquired")).toHaveLength(1);
  conserved(r.state);
});

it("全落空只消费一次攻击骰，不洗疾病牌，不改光照和压力", () => {
  const s = setup(10),
    r = ok(s);
  expect(r.state.battle!.light).toBe(5);
  expect(r.state.battle!.rngCursor).toBe(1);
  expect(r.state.battle!.conditions).toEqual(s.battle!.conditions);
  expect(r.events.some((e) => e.type === "monsterTargetEffectsResolved")).toBe(false);
});

it("Vestal III疾病免疫只跳感染，仍支付该目标光照及压力，已有疾病保留", () => {
  const stat = sources.catalog.heroStats.find((s) => s.name === "VESTAL" && s.level === 3)!;
  const s = patch(setup(), "h3", {
    heroStatId: stat.id,
    heroLevel: 3,
    life: stat.life,
    diseaseId: "disease:p001",
  });
  const r = ok(s);
  expect(hero(r.state, "h3")).toMatchObject({ diseaseId: "disease:p001", stress: 3 });
  expect(r.state.battle!.light).toBe(1);
  expect(r.events.filter((e) => e.type === "diseaseAcquired")).toHaveLength(3);
  expect(
    r.events.some((e) => e.type === "passiveTriggered" && e.trigger === "diseaseImmunity"),
  ).toBe(true);
  conserved(r.state);
});

it("目标压力心脏病发生在感染前，取消该名疾病但继续下一名", () => {
  const s = patch(setup(), "h0", {
    stress: 8,
    resolveTested: true,
    resolveCardId: sources.resolveCards[0]!.id,
  });
  const r = ok(s);
  expect(hero(r.state, "h0").dead).toBe(true);
  expect(hero(r.state, "h0").diseaseId).toBeUndefined();
  expect(r.events.filter((e) => e.type === "diseaseAcquired").map((e) => e.entityId)).toEqual([
    "h1",
    "h2",
    "h3",
  ]);
  expect(r.state.battle!.light).toBe(1);
  conserved(r.state);
});

it("全部暴击压力先行，因暴击心脏病死亡者不再降低光照", () => {
  const s = patch(setup(1, 4), "h0", {
    stress: 9,
    resolveTested: true,
    resolveCardId: sources.resolveCards[0]!.id,
  });
  const r = ok(s);
  expect(hero(r.state, "h0").dead).toBe(true);
  expect(r.state.battle!.light).toBe(1);
  expect(
    r.events.filter((e) => e.type === "monsterTargetEffectsResolved").map((e) => e.entityId),
  ).toEqual(["h1", "h2", "h3"]);
  expect(r.events.findIndex((e) => e.type === "heartAttack")).toBeLessThan(
    r.events.findIndex((e) => e.type === "monsterTargetEffectsResolved"),
  );
});

it("压力首次到10先抽意志再感染，新病不回改本次压力", () => {
  const s = patch(setup(), "h0", { stress: 8 }),
    r = ok(s);
  expect(hero(r.state, "h0").resolveTested).toBe(true);
  expect(r.events.findIndex((e) => e.type === "resolveTested")).toBeLessThan(
    r.events.findIndex((e) => e.type === "diseaseAcquired"),
  );
  conserved(r.state);
});

it("重复感染第四怪癖待选：JSON恢复后只续接其余目标，不重复光照、攻击或抽牌", () => {
  const s = patch(setup(), "h0", {
    diseaseId: "disease:p001",
    quirkIds: ["quirk:p001", "quirk:p002", "quirk:p018"],
  });
  const r = ok(s);
  expect(r.state.battle!.pending?.type).toBe("conditionReplace");
  expect(r.state.battle!.light).toBe(4);
  expect(hero(r.state, "h1").stress).toBe(0);
  const choice = r.pendingChoice!;
  const c: Command = {
    type: "resolveChoice",
    choiceId: choice.id,
    optionId: choice.options[0]!.id,
  };
  const before = structuredClone(r.state),
    resumed = ok(JSON.parse(JSON.stringify(r.state)), c);
  expect(resumed).toEqual(applyCommand(r.state, c));
  expect(r.state).toEqual(before);
  expect(resumed.state.battle!.light).toBe(1);
  expect(resumed.events.filter((e) => e.type === "diseaseAcquired").map((e) => e.entityId)).toEqual(
    ["h1", "h2", "h3"],
  );
  expect(resumed.state.battle!.rngCursor).toBe(r.state.battle!.rngCursor);
  expect(resumed.state.battle!.pending).toBeNull();
  expect(hero(resumed.state, "h0").stress).toBe(2);
  conserved(resumed.state);
});

it("降低光照触发Night Blindness/Soft死门后，取消该目标卡文压力/感染", () => {
  const quirks = ["Night Blindness", "Soft"].map(
    (name) => sources.catalog.conditions!.quirks.find((q) => q.name === name)!.id,
  );
  let lethal: ReturnType<typeof applyCommand> | undefined;
  for (let seed = 0; seed < 200 && !lethal; seed++) {
    if (nextBattleRoll(seed, 0) !== 3) continue;
    const initial = setup();
    const s = patch({ ...initial, seed }, "h0", {
      wounds: hero(initial, "h0").life!,
      quirkIds: quirks,
    });
    const r = ok(s);
    if (hero(r.state, "h0").dead) lethal = r;
  }
  expect(lethal).toBeDefined();
  expect(hero(lethal!.state, "h0").stress).toBe(1);
  expect(lethal!.state.battle!.light).toBe(1);
  expect(lethal!.events.filter((e) => e.type === "diseaseAcquired").map((e) => e.entityId)).toEqual(
    ["h1", "h2", "h3"],
  );
  conserved(lethal!.state);
});

it("连续两名第四怪癖待选各保留剩余目标；错误/过期选择不推进，最终顺序不重付", () => {
  let s = patch(setup(), "h0", {
    diseaseId: "disease:p001",
    quirkIds: ["quirk:p001", "quirk:p002", "quirk:p018"],
  });
  s = patch(s, "h1", {
    diseaseId: "disease:p002",
    quirkIds: ["quirk:p003", "quirk:p004", "quirk:p019"],
  });
  let r = ok(s);
  const oldChoice = r.pendingChoice!;
  expect(r.state.battle!.light).toBe(4);
  for (const [index, light] of [
    [0, 3],
    [1, 1],
  ]) {
    expect(r.pendingChoice?.actorId).toBe(`h${index}`);
    const c: Command = {
      type: "resolveChoice",
      choiceId: r.pendingChoice!.id,
      optionId: r.pendingChoice!.options[0]!.id,
    };
    const bad = applyCommand(r.state, { ...c, optionId: "invalid" });
    expect(bad.state).toBe(r.state);
    r = ok(JSON.parse(JSON.stringify(r.state)), c);
    expect(r.state.battle!.light).toBe(light);
    conserved(r.state);
  }
  expect(r.state.battle!.pending).toBeNull();
  expect(
    applyCommand(r.state, {
      type: "resolveChoice",
      choiceId: oldChoice.id,
      optionId: oldChoice.options[0]!.id,
    }).state,
  ).toBe(r.state);
  expect(["h0", "h1", "h2", "h3"].map((id) => hero(r.state, id).stress)).toEqual([2, 2, 3, 3]);
});

it("缺失疾病池或英雄防御时整次回滚伤害、光照、压力和全部RNG", () => {
  for (const broken of ["conditions", "defence"] as const) {
    const s = setup();
    const { conditions: _conditions, ...noConditions } = s.battle!;
    void _conditions;
    const state =
      broken === "conditions"
        ? { ...s, battle: noConditions }
        : patch(s, "h0", { heroStatId: "unknown" });
    const before = structuredClone(state),
      r = applyCommand(state, howl);
    expect(r.state).toBe(state);
    expect(r.events).toEqual([expect.objectContaining({ type: "commandRefused" })]);
    expect(state).toEqual(before);
  }
});
