import { expect, it } from "vitest";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import heroData from "../../data/normalized/corebox/hero_stat.json";
import skillData from "../../data/normalized/corebox/hero_skill.json";
import monsterData from "../../data/normalized/corebox/monster_medium.json";
import resolveData from "../../data/normalized/corebox/virtue_affliction.json";
import { diseaseFileSchema } from "../../data/src/disease";
import {
  normalizedQuirkFileSchema,
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
  normalizedVirtueAfflictionFileSchema,
} from "../../data/src/normalize/schema";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import { applyCommand } from "./command";
import type { ApplyResult, GameState } from "./command";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import type { HeroSkillCardView } from "./hero-skill";
import type { MonsterCardView } from "./monster-skill";
import type { ResolveCard } from "./pressure";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import { nextBattleRoll } from "./encounter";
import { readMonsterAttackView } from "./monster-skill";
import { readPrintedRange } from "./hero-skill";

const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value)) as T;
const stats = clean<
  (NonNullable<BattleSetup["heroStats"]>[number] & { level: number; dodge: number })[]
>(
  normalizedHeroStatFileSchema
    .parse(heroData)
    .cards.filter((s) => s.attributesVerified && s.level === 1),
);
const skills = clean<(HeroSkillCardView & { name: string; level: number })[]>(
  normalizedHeroSkillFileSchema.parse(skillData).cards,
);
const monsters = clean<MonsterCardView[]>(
  normalizedMonsterMediumFileSchema.parse(monsterData).cards.filter((c) => "skills" in c),
);
const pool = () =>
  createConditionPool(
    diseaseFileSchema.parse(diseaseData).cards,
    normalizedQuirkFileSchema.parse(quirkData).cards,
  );
const hitSeed = Array.from({ length: 200 }, (_, i) => i).find(
  (seed) => nextBattleRoll(seed, 0) <= 2 && nextBattleRoll(seed, 1) <= 2,
)!;
function setup(cardId = "monster_medium:p031", seed = hitSeed): GameState {
  const monster = monsters.find((c) => c.id === cardId)!;
  const attack = readMonsterAttackView(monster, 1);
  if (attack.status !== "ready") throw new Error(attack.reason);
  const range = readPrintedRange(attack.view);
  if (range.kind !== "exact") throw new Error("缺少射程");
  const heroes: BattleEntity[] = stats.map((stat, i) => ({
    id: `h${i}`,
    hero: stat.name,
    heroStatId: stat.id,
    heroLevel: 1,
    side: "hero",
    areaId: "a",
    stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
    life: stat.life,
    wounds: 0,
    stress: 0,
    dodge: stat.dodge,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    skillIds: skills.filter((s) => s.hero === stat.name && s.level === 1).map((s) => s.id),
  }));
  const p = pool();
  return createBattleState(seed, {
    heroStats: stats,
    entities: [
      ...heroes,
      {
        id: "m",
        hero: null,
        side: "monster",
        areaId: range.distance === 0 ? "a" : "b",
        stance: "aggressive",
        stanceSlots: 1,
        monsterCardId: monster.id,
        life: monster.life,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        skillIds: [],
      },
    ],
    skills,
    monsters: [monster],
    light: 5,
    conditions: {
      ...p,
      diseaseDeck: p.diseases.map((c) => c.id),
      negativeDeck: p.quirks.filter((q) => q.polarity === "negative").map((q) => q.id),
    },
    areas: [
      { id: "a", adjacent: ["b", "c"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 8, elevation: "normal" },
      { id: "c", adjacent: ["a"], capacity: 8, elevation: "normal" },
    ],
    resolveCards: clean<ResolveCard[]>(
      normalizedVirtueAfflictionFileSchema.parse(resolveData).cards,
    ),
    provisions: [
      { id: "food", face: "food" },
      { id: "spare", face: "food" },
    ],
  });
}
function patch(state: GameState, changes: Partial<BattleEntity>): GameState {
  const b = state.battle!,
    p = b.conditions!;
  const entities = b.entities.map((e) => (e.id === "h0" ? { ...e, ...changes } : e));
  const heldDiseases = entities.flatMap((e) => (e.diseaseId ? [e.diseaseId] : [])),
    heldQuirks = entities.flatMap((e) => e.quirkIds ?? []);
  return {
    ...state,
    battle: {
      ...b,
      entities,
      conditions: {
        ...p,
        diseaseDeck: p.diseases.filter((d) => !heldDiseases.includes(d.id)).map((d) => d.id),
        negativeDeck: p.quirks
          .filter((q) => q.polarity === "negative" && !heldQuirks.includes(q.id))
          .map((q) => q.id),
      },
    },
  };
}
function hero(state: GameState) {
  return state.battle!.entities.find((e) => e.id === "h0")!;
}
function successful(result: ApplyResult) {
  expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(
    conditionPoolProblem(
      result.state.battle!.conditions!,
      result.state.battle!.entities.filter((e) => e.side === "hero"),
    ),
  ).toBeNull();
  return result.state;
}
const attack = { type: "playMonsterSkill", actorId: "m", targetId: "h0", skillSlot: 1 } as const;
const turn = (state: GameState, actor: "hero" | "monster" = "hero"): GameState => ({
  ...state,
  battle: {
    ...state.battle!,
    encounter: {
      round: 1,
      deck: ["hero", "hero", "hero"],
      actedIds: [],
      turn:
        actor === "hero"
          ? { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [] }
          : { type: "monster", actorId: "m" },
    },
  },
});

it("真实 Maggot 命中 / 再感染：完整目录、共享 RNG、旧病弃置与负面怪癖；无目录整次回滚", () => {
  const initial = setup(),
    before = structuredClone(initial);
  const first = applyCommand(initial, attack),
    firstState = successful(first);
  expect(hero(firstState).diseaseId).toBe("disease:p001");
  expect(firstState.battle!.rngCursor).toBe(1);
  expect(first.events.filter((e) => e.type === "diseaseAcquired")).toHaveLength(1);
  const second = successful(applyCommand(firstState, attack));
  expect(hero(second)).toMatchObject({ diseaseId: "disease:p002", quirkIds: ["quirk:p018"] });
  expect(second.battle!.conditions!.diseaseDiscard).toEqual(["disease:p001"]);
  expect(applyCommand(initial, attack)).toEqual(first);
  expect(initial).toEqual(before);
  const { conditions: _conditions, ...bare } = initial.battle!;
  void _conditions;
  const missing = { ...initial, battle: bare };
  const refused = applyCommand(missing, attack);
  expect(refused.state).toBe(missing);
  expect(refused.events).toMatchObject([
    { type: "commandRefused", message: expect.stringContaining("疾病") },
  ]);
});
it("第四张怪癖待选冻结回合；非法 / 过期选择不重掷，合法选择仅一次收尾", () => {
  const initial = turn(
    patch(setup(), {
      diseaseId: "disease:p011",
      quirkIds: ["quirk:p001", "quirk:p002", "quirk:p020"],
    }),
    "monster",
  );
  const result = applyCommand(initial, attack);
  successful(result);
  expect(result.pendingChoice?.options.map((o) => o.id)).toEqual(["quirk:p001", "quirk:p002"]);
  expect(result.state.battle!.encounter!.turn.type).toBe("monster");
  const blocked = applyCommand(result.state, { type: "ping", message: "不能绕过选择" });
  expect(blocked.state).toBe(result.state);
  const invalid = applyCommand(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "quirk:p020",
  });
  expect(invalid.state).toBe(result.state);
  const finished = successful(
    applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: "quirk:p002",
    }),
  );
  expect(hero(finished).quirkIds).toEqual(["quirk:p001", "quirk:p018", "quirk:p020"]);
  expect(finished.battle!.rngCursor).toBe(result.state.battle!.rngCursor);
  expect(finished.battle!.encounter!.turn.type).toBe("awaitingInitiative");
  expect(
    applyCommand(finished, {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: "quirk:p002",
    }).state,
  ).toBe(finished);
});
it("再感染第四张负面永久死亡，死亡补位与怪物收尾仍由真实命令执行", () => {
  const initial = turn(
    patch(setup(), {
      diseaseId: "disease:p011",
      quirkIds: ["quirk:p018", "quirk:p019", "quirk:p020"],
    }),
    "monster",
  );
  const next = successful(applyCommand(initial, attack));
  expect(hero(next)).toMatchObject({ dead: true, deathReason: "madness" });
  expect(next.battle!.entities.find((h) => h.id === "h1")!.stance).toBe("aggressive");
  expect(next.battle!.encounter!.turn.type).toBe("awaitingInitiative");
});
it("Syphilis + Fragile 和攻击同刻合并一次死门；DoT / Food 治疗不触发 takes Damage", () => {
  const initial = setup("monster_medium:p001");
  const atDoor = patch(initial, {
    diseaseId: "disease:p006",
    quirkIds: ["quirk:p031"],
    wounds: hero(initial).life!,
  });
  const result = applyCommand(atDoor, attack);
  successful(result);
  const healthEvents = result.events.filter(
    (e) => e.type === "heroHealthResolved" && e.entityId === "h0",
  );
  expect(healthEvents).toHaveLength(1);
  expect(result.state.battle!.rngCursor).toBe(2);
  expect(healthEvents[0]).toMatchObject({
    effect: { type: "wounds", amounts: [expect.any(Number), 1, 1] },
  });
  const healed = successful(
    applyCommand(turn(atDoor), {
      type: "useProvision",
      provisionId: "food",
      targetId: "h0",
      effect: "heal",
    }),
  );
  expect(hero(healed).wounds).toBe(hero(initial).life! - 1);
  expect(healed.battle!.rngCursor).toBe(0);
});
it("真实 Food 消耗触发 Bulimic 和 Stress Eater；Q-66 回滚治疗、补给、压力、伤口与 RNG", () => {
  const initial = turn(
    patch(setup(), { diseaseId: "disease:p002", quirkIds: ["quirk:p029"], wounds: 3 }),
  );
  const next = successful(
    applyCommand(initial, {
      type: "useProvision",
      provisionId: "food",
      targetId: "h0",
      effect: "heal",
    }),
  );
  expect(hero(next)).toMatchObject({ wounds: 2, stress: 2 });
  expect(next.battle!.provisions).toEqual([]);
  const boundary = turn(
    patch(setup(), { diseaseId: "disease:p008", quirkIds: ["quirk:p029"], wounds: 3, stress: 8 }),
  );
  const refused = applyCommand(boundary, {
    type: "useProvision",
    provisionId: "food",
    targetId: "h0",
    effect: "heal",
  });
  expect(refused.state).toBe(boundary);
  expect(refused.events).toMatchObject([
    { type: "commandRefused", message: expect.stringContaining("Q-66") },
  ]);
});
it("Lethargy 移动在死门死亡，消费移动后只补位 / 收尾一次，不攻击怪物", () => {
  const initial = setup();
  const state = turn(patch(initial, { diseaseId: "disease:p005", wounds: hero(initial).life! }));
  const result = applyCommand(state, { type: "moveHero", actorId: "h0", path: ["b"] });
  const next = successful(result);
  expect(hero(next)).toMatchObject({ dead: true, areaId: "b" });
  expect(next.battle!.rngCursor).toBe(1);
  expect(
    result.events.filter((e) => e.type === "casualtyRemoved" && e.actorId === "h0"),
  ).toHaveLength(1);
  expect(next.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
});
it("Spotted Fever / Clumsy 来自真实攻击；追加状态受获批防御，落空不触发", () => {
  const initial = patch(setup("monster_medium:p001"), {
    diseaseId: "disease:p011",
    quirkIds: ["quirk:p020"],
  });
  const next = successful(applyCommand(initial, attack));
  expect(hero(next).statusStacks).toEqual([
    { kind: "debuff", remaining: 1 },
    { kind: "blight", remaining: 2, amount: 1 },
  ]);
  const missSeed = Array.from({ length: 200 }, (_, i) => i).find(
    (seed) => nextBattleRoll(seed, 0) === 10,
  )!;
  const missed = successful(applyCommand({ ...initial, seed: missSeed }, attack));
  expect(hero(missed).statusStacks).toBeUndefined();
});
it("Bad Gambler 掷 10 死门死亡时中止技能，不执行随后治疗 / 攻击", () => {
  const seed = Array.from({ length: 1000 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === 10 && nextBattleRoll(s, 1) <= 3,
  )!;
  const initial = setup("monster_medium:p001", seed);
  const patched = patch(initial, { wounds: hero(initial).life!, quirkIds: ["quirk:p034"] });
  const state: GameState = {
    ...patched,
    battle: {
      ...patched.battle!,
      entities: patched.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "a" } : e)),
    },
  };
  const smite = skills.find((s) => s.id === "hero_skill:p001")!;
  const result = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId: smite.id,
  });
  const next = successful(result);
  expect(hero(next).dead).toBe(true);
  expect(next.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
  expect(result.events.some((e) => e.type === "heroSkillResolved")).toBe(false);
  expect(next.battle!.rngCursor).toBe(2);
});

it("Vertigo 在位移区域选择完成后触发一次，沿用原技能骰，不被暴击区域压力重算覆盖", () => {
  const initial = setup("monster_medium:p001");
  const stat = stats.find((s) => s.name === "HIGHWAYMAN")!;
  const pointBlank = skills.find(
    (s) => s.hero === stat.name && s.name.startsWith("Point Blank Shot") && s.level === 1,
  )!;
  const patched = patch(initial, {
    hero: stat.name,
    heroStatId: stat.id,
    life: stat.life,
    dodge: stat.dodge,
    diseaseId: "disease:p007",
    quirkIds: ["quirk:p028"],
    stress: 1,
    skillIds: [pointBlank.id],
  });
  const state: GameState = {
    ...patched,
    battle: {
      ...patched.battle!,
      entities: patched.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "a" } : e)),
    },
  };
  const played = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId: pointBlank.id,
  });
  successful(played);
  const moved = applyCommand(played.state, { type: "resolveShuffles" });
  expect(moved.pendingChoice?.options.map((o) => o.id)).toEqual(["b", "c"]);
  expect(hero(moved.state).stress).toBe(hero(played.state).stress);
  const finished = successful(
    applyCommand(moved.state, {
      type: "resolveChoice",
      choiceId: moved.pendingChoice!.id,
      optionId: "b",
    }),
  );
  expect(hero(finished)).toMatchObject({ areaId: "b", stress: 3 });
  expect(finished.battle!.rngCursor).toBe(played.state.battle!.rngCursor);
});
it("Ennui 的 -1 美德几率作用于公共命令的真实意志检定（同骰 2：普通为美德，疾病为苦难）", () => {
  const seed = Array.from({ length: 200 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 2)!;
  const ready = (diseaseId?: string): GameState => {
    const s = turn(
      patch(setup("monster_medium:p001", seed), { stress: 9, ...(diseaseId ? { diseaseId } : {}) }),
    );
    return {
      ...s,
      battle: {
        ...s.battle!,
        areas: s.battle!.areas.map((a) => (a.id === "a" ? { ...a, endTurnStress: 1 } : a)),
        encounter: {
          ...s.battle!.encounter!,
          turn: { type: "hero", actorId: "h0", actions: 1, usedSkillIds: [] },
        },
      },
    };
  };
  for (const [disease, role] of [
    [undefined, "virtue"],
    ["disease:p003", "affliction"],
  ] as const) {
    const result = successful(
      applyCommand(ready(disease), { type: "changeStance", actorId: "h0", direction: "backward" }),
    );
    expect(hero(result).stress).toBe(0);
    expect(
      result.battle!.resolveCards!.find((c) => c.id === hero(result).resolveCardId)!.role,
    ).toBe(role);
  }
});
it("Q-66 只拦截实际产生的复合压力事件，不因为 preflight 的骰面 1 拒绝落空", () => {
  const initial = patch(setup("monster_medium:p001"), { diseaseId: "disease:p008", stress: 8 });
  const critSeed = Array.from({ length: 200 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === 1,
  )!;
  const critical = { ...initial, seed: critSeed };
  const refused = applyCommand(critical, attack);
  expect(refused.state).toBe(critical);
  expect(refused.events).toMatchObject([
    { type: "commandRefused", message: expect.stringContaining("Q-66") },
  ]);
  const missSeed = Array.from({ length: 200 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === 10,
  )!;
  const missed = successful(applyCommand({ ...initial, seed: missSeed }, attack));
  expect(hero(missed)).toMatchObject({ wounds: 0, stress: 8 });
});
it("自身 Vertigo 位移会触及意志收尾时保留明确代码停点，不先攻击或重掷", () => {
  const initial = setup("monster_medium:p001");
  const stat = stats.find((s) => s.name === "HIGHWAYMAN")!;
  const skill = skills.find(
    (s) => s.hero === stat.name && s.name.startsWith("Point Blank Shot") && s.level === 1,
  )!;
  const patched = patch(initial, {
    hero: stat.name,
    heroStatId: stat.id,
    life: stat.life,
    dodge: stat.dodge,
    diseaseId: "disease:p007",
    stress: 8,
    skillIds: [skill.id],
  });
  const state: GameState = {
    ...patched,
    battle: {
      ...patched.battle!,
      entities: patched.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "a" } : e)),
    },
  };
  const refused = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId: skill.id,
  });
  expect(refused.state).toBe(state);
  expect(refused.events).toMatchObject([
    { type: "commandRefused", message: expect.stringContaining("自身位移") },
  ]);
});
it("Q-67：暴击叠加 Off Guard / Weak Grip / Nervous 停场；普通命中只触发一次 Off Guard 压力", () => {
  const criticalSeed = Array.from({ length: 200 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === 1,
  )!;
  const state = patch(setup("monster_medium:p001", criticalSeed), {
    quirkIds: ["quirk:p021", "quirk:p026", "quirk:p028"],
  });
  const refused = applyCommand(state, attack);
  expect(refused.state).toBe(state);
  expect(refused.events).toMatchObject([
    { type: "commandRefused", message: expect.stringContaining("Q-67") },
  ]);
  const hit = Array.from({ length: 200 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 4)!;
  const normal = successful(applyCommand({ ...state, seed: hit }, attack));
  expect(hero(normal).stress).toBe(2);
});
