import { readFileSync } from "node:fs";
import { nextBattleRoll } from "./encounter";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, createRng, rollD10 } from "./index";
import type {
  BattleEntity,
  BattleSetup,
  GameState,
  HeroSkillCardView,
  MonsterCardView,
} from "./index";

function cards<T>(file: string): T[] {
  return (
    JSON.parse(
      readFileSync(new URL(`../../data/normalized/corebox/${file}.json`, import.meta.url), "utf8"),
    ) as { cards: T[] }
  ).cards;
}
const skills = cards<HeroSkillCardView>("hero_skill");
const soldier = cards<MonsterCardView>("monster_medium")[0]!;
const defender = cards<MonsterCardView>("monster_medium").find(
  (card) => card.id === "monster_medium:p010",
)!;
const profiles = cards<NonNullable<BattleSetup["heroStats"]>[number]>("hero_stat");
const crusader = profiles.find((card) => card.id === "hero_stat:p001:front")!;
const vestal = profiles.find((card) => card.name === "VESTAL")!;
function skill(id: string) {
  return skills.find((card) => card.id === `hero_skill:${id}`)!;
}
function setup(card = skill("p001"), seed = 1, monster = soldier): GameState {
  const stat = card.hero === "VESTAL" ? vestal : crusader;
  const hero: BattleEntity = {
    id: "hero",
    side: "hero",
    hero: stat.name,
    heroStatId: stat.id,
    life: stat.life,
    skillIds: [card.id],
    areaId: "a",
    stance: "aggressive",
    wounds: stat.life - 1,
    stress: 3,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return createBattleState(seed, {
    heroStats: profiles,
    skills: [card],
    monsters: [monster],
    light: 5,
    areas: [
      { id: "a", adjacent: ["b"], capacity: 8, elevation: "normal" },
      { id: "b", adjacent: ["a"], capacity: 8, elevation: "normal" },
    ],
    entities: [
      hero,
      {
        id: "monster",
        side: "monster",
        hero: null,
        skillIds: [],
        monsterCardId: monster.id,
        life: monster.life,
        areaId: "b",
        stance: "ranged",
        stanceSlots: 1,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
      },
    ],
  });
}
function hero(state: GameState) {
  return state.battle!.entities[0]!;
}
function patch(state: GameState, id: string, changes: Partial<BattleEntity>): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entry) =>
        entry.id === id ? { ...entry, ...changes } : entry,
      ),
    },
  };
}
const attack = {
  type: "playMonsterSkill",
  actorId: "monster",
  targetId: "hero",
  skillSlot: 1,
} as const;
const smite = {
  type: "playHeroSkill",
  actorId: "hero",
  targetId: "monster",
  skillId: "hero_skill:p001",
} as const;

describe("战斗技能生命命令沙盒（R20、R29、R-005、R-048）", () => {
  it("首次进入死门封顶，不掷死门骰；下一击从攻击骰之后接一次死门骰", () => {
    const initial = setup();
    const first = applyCommand(initial, attack);
    expect(hero(first.state)).toMatchObject({ wounds: crusader.life, dead: false });
    expect(first.state.battle!.rngCursor).toBe(1);
    expect(first.events[1]).toMatchObject({
      type: "heroHealthResolved",
      resolution: { enteredDeathDoor: true, face: null },
    });
    const rng = createRng(initial.seed);
    rollD10(rng);
    rollD10(rng);
    const face = rollD10(rng) <= 3 ? "skull" : "blank";
    const second = applyCommand(first.state, attack);
    expect(hero(second.state)).toMatchObject({ wounds: crusader.life, dead: face === "skull" });
    expect(second.state.battle!.rngCursor).toBe(3);
    expect(second.events[1]).toMatchObject({ resolution: { face, deathblow: face === "skull" } });
  });

  it.each([1, 7, 15])("死门共享种子与游标，完整命令回放一致（seed=%s）", (seed) => {
    const initial = patch(setup(skill("p001"), seed), "hero", { wounds: crusader.life });
    const before = structuredClone(initial);
    const first = applyCommand(initial, attack);
    expect(first).toEqual(applyCommand(initial, attack));
    expect(initial).toEqual(before);
    const rng = createRng(seed);
    const roll = rollD10(rng);
    const resolved = first.events[0]!;
    expect(resolved).toMatchObject({ roll });
    if (resolved.type !== "monsterSkillResolved") throw new Error("未执行攻击");
    if (resolved.resolution.outcome === "miss") {
      expect(first.state.battle!.rngCursor).toBe(1);
      expect(first.events).toHaveLength(1);
    } else {
      const face = rollD10(rng) <= 3 ? "skull" : "blank";
      expect(first.state.battle!.rngCursor).toBe(2);
      expect(first.events[1]).toMatchObject({ resolution: { face } });
      expect(hero(first.state).dead).toBe(face === "skull");
      if (face === "skull") expect(applyCommand(first.state, attack).state).toBe(first.state);
    }
  });

  it("Smite 反击伤口封顶，首次达到 Life 不消费额外骰", () => {
    const initial = patch(setup(), "monster", { riposte: true, protection: true, areaId: "a" });
    const hit = applyCommand(initial, smite);
    expect(hero(hit.state)).toMatchObject({ wounds: crusader.life, dead: false });
    expect(hit.state.battle!.rngCursor).toBe(1);
    expect(hit.events[1]).toMatchObject({
      effect: { type: "wounds", amounts: [4] },
      resolution: { enteredDeathDoor: true },
    });
  });

  it("Battle Heal 未附逐卡射程注解时仍拒绝，生命接线不绕过 R-048", () => {
    const { verified_range, ...card } = skill("p013");
    expect(verified_range).toBeDefined();
    const initial = patch(setup(card), "hero", { wounds: crusader.life, stance: "support" });
    const result = applyCommand(initial, {
      type: "playHeroSkill",
      actorId: "hero",
      targetId: "hero",
      skillId: card.id,
    });
    expect(result.events[0]?.type).toBe("commandRefused");
    expect(result.events.filter((event) => event.type === "heroHealthResolved")).toHaveLength(0);
    expect(result.state).toBe(initial);
  });

  it("Divine Comfort 落空仍自疗，目标不受治疗；先自疗后目标的事件顺序固定", () => {
    const card = skill("p097");
    const base = setup(card);
    const actor = { ...hero(base), stance: "support" as const, wounds: vestal.life };
    const ally = {
      ...actor,
      id: "ally",
      hero: crusader.name,
      heroStatId: crusader.id,
      life: crusader.life,
      wounds: crusader.life,
      stance: "aggressive" as const,
      skillIds: [],
      areaId: "b",
    };
    const initial = createBattleState(1, {
      ...base.battle!,
      entities: [actor, ally, base.battle!.entities[1]!],
    });
    const command = {
      type: "playHeroSkill",
      actorId: "hero",
      targetId: "ally",
      skillId: card.id,
    } as const;
    const hit = applyCommand(initial, command);
    expect(
      hit.events
        .filter((event) => event.type === "heroHealthResolved")
        .map((event) => event.entityId),
    ).toEqual(["hero", "ally"]);
    const miss = applyCommand(patch(initial, "ally", { dodge: 100 }), command);
    expect(miss.events[0]).toMatchObject({ resolution: { outcome: "miss" } });
    expect(hero(miss.state).wounds).toBe(vestal.life - 2);
    expect(miss.state.battle!.entities[1]!.wounds).toBe(crusader.life);
    expect(miss.events.filter((event) => event.type === "heroHealthResolved")).toHaveLength(1);
  });

  it("未核实属性、缺关联、身份 / Life 不匹配与超上限伤口不进入生命沙盒", () => {
    const base = setup().battle!;
    for (const changes of [
      { heroStatId: "unknown" },
      { hero: "HELLION" },
      { life: 99 },
      { wounds: crusader.life + 1 },
    ])
      expect(() =>
        createBattleState(1, {
          ...base,
          entities: [{ ...base.entities[0]!, ...changes }, base.entities[1]!],
        }),
      ).toThrow();
    expect(() =>
      createBattleState(1, {
        ...base,
        heroStats: profiles.map((card) => ({ ...card, attributesVerified: false })),
      }),
    ).toThrow();
    expect(() =>
      createBattleState(1, { ...base, heroStats: [...profiles, profiles[0]!] }),
    ).toThrow();
  });

  it("生命层拒绝原子保留技能前的 RNG / 状态；单英雄不能启动普通遭遇战", () => {
    const initial = setup();
    const invalid = patch(initial, "hero", { wounds: crusader.life + 1 });
    const refused = applyCommand(invalid, attack);
    expect(refused.state).toBe(invalid);
    expect(refused.events[0]?.type).toBe("commandRefused");
    expect(applyCommand(initial, { type: "startBattle" }).state).toBe(initial);
  });

  it("怪物自身位移的暴击续接不撤销英雄 Life 封顶或死门骰结果", () => {
    const initial = patch(setup(skill("p001"), 1, defender), "hero", { wounds: crusader.life });
    const prepared = { ...initial, battle: { ...initial.battle!, light: 4, rngCursor: 1 } };
    const rolled = applyCommand(prepared, { ...attack, skillSlot: 3 });
    expect(rolled.events[0]).toMatchObject({ resolution: { outcome: "crit" } });
    const done = applyCommand(rolled.state, { type: "resolveShuffles" });
    expect(hero(done.state)).toMatchObject({
      wounds: crusader.life,
      dead: nextBattleRoll(prepared.seed, rolled.state.battle!.rngCursor) <= 3,
    });
    expect(hero(rolled.state).dead).toBe(false);
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor + 1);
    expect(done.events.filter((event) => event.type === "heroHealthResolved")).toHaveLength(1);
    expect(done.state.battle!.shuffleIntents).toEqual([]);
  });
});
