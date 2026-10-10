import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleEntity, HeroSkillCardView, MonsterCardView } from "./index";

const skills = (
  JSON.parse(
    readFileSync(new URL("../../data/normalized/corebox/hero_skill.json", import.meta.url), "utf8"),
  ) as { cards: HeroSkillCardView[] }
).cards;
const monsters = (
  JSON.parse(
    readFileSync(
      new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
      "utf8",
    ),
  ) as { cards: MonsterCardView[] }
).cards;
const card = (id: string) => skills.find((skill) => skill.id === `hero_skill:${id}`)!;
const soldier = monsters.find((monster) => monster.id === "monster_medium:p001")!;
function setup(skill = card("p007"), seed = 0, enemyCard = soldier, count = 1) {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: skill.hero!,
      stance,
      areaId: "a",
      skillIds: [skill.id],
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    }),
  );
  const enemies: BattleEntity[] = Array.from({ length: count }, (_, index) => ({
    id: `m${index}`,
    side: "monster",
    hero: null,
    stance: index === 0 ? "aggressive" : "defensive",
    stanceSlots: 1,
    monsterCardId: enemyCard.id,
    areaId: "a",
    skillIds: [],
    wounds: 0,
    life: enemyCard.life,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  }));
  return createBattleState(seed, {
    entities: [...heroes, ...enemies],
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
    skills: [skill],
    monsters: [enemyCard],
    light: 5,
  });
}
const command = (skill = card("p007")) => ({
  type: "playHeroSkill" as const,
  actorId: "h0",
  targetId: "m0",
  skillId: skill.id,
});

describe("完整 Nt 注解的技能状态接线（R19–21 / R-048）", () => {
  it("真实 Stunning Blow 命中施加 Stun 1t；怪物下一回合弹出后跳过，不多掷骰", () => {
    const original = setup();
    const applied = applyCommand(original, command());
    expect(applied.events[0]?.type).toBe("heroSkillResolved");
    expect(applied.state.battle!.entities[4]!.statusStacks).toEqual([
      { kind: "stun", remaining: 1 },
    ]);
    expect(applied.state.battle!.rngCursor).toBe(1);
    const start = applyCommand(applied.state, { type: "startBattle" }).state;
    const ready = {
      ...start,
      battle: {
        ...start.battle!,
        encounter: { ...start.battle!.encounter!, deck: ["monster" as const, "hero" as const] },
      },
    };
    const skipped = applyCommand(ready, { type: "drawInitiative" });
    expect(skipped.state.battle!.encounter!.actedIds).toEqual(["m0"]);
    expect(skipped.state.battle!.entities[4]!.statusStacks).toEqual([]);
    expect(skipped.state.battle!.rngCursor).toBe(ready.battle!.rngCursor);
    expect(original.battle!.entities[4]!.statusStacks).toBeUndefined();
    expect(applied).toEqual(applyCommand(original, command()));
  });

  it("落空不施加目标状态，死亡目标不放新堆；缺抗性栏在消费 RNG 前拒绝", () => {
    let miss;
    for (let seed = 0; seed < 100; seed += 1) {
      const result = applyCommand(setup(card("p007"), seed), command());
      const event = result.events[0];
      if (event?.type === "heroSkillResolved" && event.resolution.outcome === "miss") {
        miss = result;
        break;
      }
    }
    expect(miss).toBeDefined();
    expect(miss!.state.battle!.entities[4]!.statusStacks).toBeUndefined();
    const lethal = setup();
    const dead = applyCommand(
      {
        ...lethal,
        battle: {
          ...lethal.battle!,
          entities: lethal.battle!.entities.map((entity) =>
            entity.id === "m0" ? { ...entity, wounds: entity.life! - 1 } : entity,
          ),
        },
      },
      command(),
    );
    expect(dead.state.battle!.entities[4]).toMatchObject({ dead: true });
    expect(dead.state.battle!.entities[4]!.statusStacks).toBeUndefined();
    const missing = { ...soldier };
    delete missing.resistances;
    const incomplete = setup(card("p007"), 0, missing);
    const refused = applyCommand(incomplete, command());
    expect(refused.state).toBe(incomplete);
    expect(refused.events[0]).toMatchObject({ type: "commandRefused" });
  });

  it("真实骨骷髅免疫 Bleed，明确空免疫测试夹具才施加面值 2 / 2t", () => {
    const bleed = card("p082");
    const immune = applyCommand(setup(bleed), command(bleed));
    expect(immune.events[0]?.type).toBe("heroSkillResolved");
    expect(immune.state.battle!.entities[4]!.statusStacks).toEqual([]);
    // 抗性路由夹具，不修改任何真实怪物卡数据。
    const plain = applyCommand(setup(bleed, 0, { ...soldier, immunities: [] }), command(bleed));
    expect(plain.state.battle!.entities[4]!.statusStacks).toEqual([
      { kind: "bleed", remaining: 2, amount: 2 },
    ]);
    const resistant = applyCommand(
      setup(bleed, 0, {
        ...soldier,
        immunities: [],
        resistances: [{ key: "bleed_resist", naming: "confirmed" }],
      }),
      command(bleed),
    );
    expect(resistant.state.battle!.entities[4]!.statusStacks).toEqual([
      { kind: "bleed", remaining: 1, amount: 2 },
    ]);
  });

  it("多目标共享一次骰，各自施加状态；自身 Buff 不重复施加或改变本次阈值", () => {
    // 两目标是路由夹具，真实 Stunning Blow 卡池仍只有一个目标。
    const stun = card("p007");
    const two = {
      ...stun,
      stats_line: [
        ...stun.stats_line!,
        { type: "icon" as const, icon: { key: "target_monster", naming: "confirmed" } },
      ],
    };
    const result = applyCommand(setup(two, 0, soldier, 2), {
      type: "playHeroSkillTargets",
      actorId: "h0",
      targetIds: ["m0", "m1"],
      skillId: two.id,
    });
    expect(result.events[0]?.type).toBe("heroSkillTargetsResolved");
    expect(result.state.battle!.rngCursor).toBe(1);
    for (const entity of result.state.battle!.entities.slice(4))
      expect(entity.statusStacks).toEqual([{ kind: "stun", remaining: 1 }]);
    const tracking = resolveHeroSkill(
      card("p076"),
      {
        actor: { id: "h0", wounds: 0 },
        target: { id: "m0", side: "monster", wounds: 0, dodge: 0 },
      },
      10,
    );
    expect(tracking).toMatchObject({
      outcome: "hit",
      actorStatusEffects: [{ kind: "buff", duration: 3 }],
      skipped: [],
    });
    expect(tracking.outcome).toBe("hit");
    // 逐页复核的 1–2 区间现已接入；距离 1 可结算，Nt 不因此默认。
    expect(
      resolveHeroSkill(
        card("p076"),
        {
          actor: { id: "h0", wounds: 0 },
          target: { id: "m0", side: "monster", wounds: 0, dodge: 0 },
          areaDistance: 1,
        },
        1,
      ).status,
    ).toBe("resolved");
  });

  it("缺或漂移 Nt 注解不补默认值，混合同行未完整支持时整次拒绝", () => {
    const stun = card("p007");
    const invalid = {
      ...stun,
      verified_status_effects: [{ ...stun.verified_status_effects![0]!, duration: 2 }],
    };
    expect(
      resolveHeroSkill(
        invalid,
        {
          actor: { id: "h0", wounds: 0 },
          target: { id: "m0", side: "monster", wounds: 0, dodge: 0 },
        },
        1,
      ).status,
    ).toBe("refused");
    const unknown = {
      ...stun,
      effect_lines: stun.effect_lines.map((line) => [
        ...line,
        { type: "text" as const, text: " unsupported" },
      ]),
    };
    const mixed = setup(unknown);
    const refusal = applyCommand(mixed, command(unknown));
    expect(refusal.state).toBe(mixed);
    expect(refusal.events[0]?.type).toBe("commandRefused");
  });

  it("Bulwark 自身 Protection / Mark / Light 全行生效，不掷骰也不能作用于别人", () => {
    const skill = card("p010");
    const original = setup(skill);
    const state = { ...original, battle: { ...original.battle!, light: 2 } };
    const cast = { ...command(skill), targetId: "h0" };
    const result = applyCommand(state, cast);
    expect(result.events[0]?.type).toBe("heroSkillResolved");
    expect(result.state.battle!.light).toBe(4);
    expect(result.state.battle!.entities[0]).toMatchObject({
      statusStacks: [
        { kind: "protection", remaining: 2 },
        { kind: "mark", remaining: 3 },
      ],
      protection: true,
      markStacks: 1,
    });
    expect(result.state.battle!.rngCursor).toBe(0);
    const refusal = applyCommand(state, { ...cast, targetId: "h1" });
    expect(refusal.state).toBe(state);
    const capped = applyCommand(original, cast);
    expect(capped.state.battle!.light).toBe(5);
  });

  it("Adrenaline Rush 一次清掉所有 Bleed / Blight 并施加 Buff，未知同行原子拒绝", () => {
    const skill = card("p037");
    const initial = setup(skill);
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "h0"
            ? {
                ...entity,
                bleed: ["a", "b"],
                blight: ["c"],
                statusStacks: [
                  { kind: "bleed" as const, remaining: 1, amount: 1 },
                  { kind: "bleed" as const, remaining: 2, amount: 2 },
                  { kind: "blight" as const, remaining: 3, amount: 1 },
                ],
              }
            : entity,
        ),
      },
    };
    const result = applyCommand(state, { ...command(skill), targetId: "h0" });
    expect(result.events[0]?.type).toBe("heroSkillResolved");
    expect(result.state.battle!.entities[0]).toMatchObject({
      bleed: [],
      blight: [],
      buffStacks: 1,
      statusStacks: [{ kind: "buff", remaining: 3 }],
    });
    expect(result.state.battle!.rngCursor).toBe(0);
    expect(state.battle.entities[0]!.statusStacks).toHaveLength(3);
  });

  it("Duelist’s Advance 的 Riposte / Pull 同次生效，Shuffle 续接不重复放堆", () => {
    const skill = card("p079");
    const initial = setup(skill);
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        areas: [
          { id: "a", capacity: 4, elevation: "normal" as const, adjacent: ["b"] },
          { id: "b", capacity: 4, elevation: "normal" as const, adjacent: ["a"] },
        ],
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "m0"
            ? { ...entity, areaId: "b" }
            : entity.id === "h0"
              ? { ...entity, stance: "defensive" as const }
              : entity.id === "h1"
                ? { ...entity, stance: "aggressive" as const }
                : entity,
        ),
      },
    };
    const result = applyCommand(state, command(skill));
    expect(result.events[0]?.type).toBe("heroSkillResolved");
    expect(result.state.battle!.entities[0]).toMatchObject({
      riposte: true,
      statusStacks: [{ kind: "riposte", remaining: 2 }],
    });
    expect(result.state.battle!.shuffleIntents).toHaveLength(1);
    const moved = applyCommand(result.state, { type: "resolveShuffles" });
    expect(moved.state.battle!.entities[0]).toMatchObject({
      areaId: "b",
      stance: "aggressive",
      statusStacks: [{ kind: "riposte", remaining: 2 }],
    });
    expect(moved.state.battle!.rngCursor).toBe(1);
  });

  it("Dazzling Light 的 Stun / Light 只在命中生效，本次阈值使用掷骰时的光照", () => {
    const skill = card("p091");
    const actor = { id: "h0", wounds: 0, stance: "defensive" as const };
    const target = { id: "m0", side: "monster" as const, wounds: 0, dodge: 0 };
    expect(resolveHeroSkill(skill, { actor, target, areaDistance: 1, light: 4 }, 2)).toMatchObject({
      outcome: "crit",
      targetLightDelta: 1,
      targetStatusEffects: [{ kind: "stun", duration: 1 }],
      skipped: [],
    });
    expect(resolveHeroSkill(skill, { actor, target, areaDistance: 1, light: 4 }, 10)).toMatchObject(
      { outcome: "miss", targetLightDelta: 0, targetStatusEffects: [] },
    );
  });
});
