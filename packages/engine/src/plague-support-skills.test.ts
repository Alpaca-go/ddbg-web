import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { HeroSkillCardView } from "./hero-skill";
import { nextBattleRoll } from "./encounter";
import { resolveTurnStartStatus } from "./battle-status";
import { createConditionPool } from "./conditions";

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));
const skills = [139, 142, 1].map((p) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.pages[0] === p)!),
);
const stats = ["hero_stat:p013:front", "hero_stat:p001:front"].map((id) =>
  clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === id)!,
  ),
);
const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p001")!,
);
const entity = (g: GameState, id: string) => g.battle!.entities.find((e) => e.id === id)!;
function change(g: GameState, id: string, patch: Partial<BattleEntity>): GameState {
  return {
    ...g,
    battle: {
      ...g.battle!,
      entities: g.battle!.entities.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    },
  };
}
/** 真实获批属性与卡牌，位置/伤口/压力/状态为明示机制夹具，未开放正式候选。 */
function setup(skill = skills[0]!, roll = 5) {
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const initial = createBattleState(seed, {
    heroStats: stats,
    conditions: createConditionPool(data.disease.cards, data.quirk.cards),
    monsters: [monster],
    skills,
    light: 5,
    entities: [
      ...stats.map((s, i): BattleEntity => ({
        ...common,
        id: i === 0 ? "h" : "ally",
        side: "hero",
        hero: s.name,
        heroStatId: s.id,
        heroLevel: 1,
        life: s.life,
        dodge: s.dodge,
        wounds: 5,
        stress: 3,
        areaId: "a",
        stance: i === 0 ? "support" : "aggressive",
        skillIds: i === 0 ? [skill.id] : [skills[2]!.id],
      })),
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 0,
        wounds: 0,
        areaId: "a",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
  const game = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
      },
    },
  } as GameState;
  return {
    game,
    command: {
      type: "playHeroSkill",
      actorId: "h",
      targetId: "ally",
      skillId: skill.id,
    } as Command,
  };
}
function play(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return r;
}
const conditions = [
  { kind: "bleed", amount: 1, remaining: 2 },
  { kind: "bleed", amount: 2, remaining: 1 },
  { kind: "blight", amount: 3, remaining: 2 },
  { kind: "buff", remaining: 2 },
] as const;

it("Battlefield Medicine I十骰面：暴击治2/命中治1，移除所有Bleed/Blight堆，保留其他堆", () => {
  for (let roll = 1; roll <= 10; roll++) {
    const { game, command } = setup(skills[0]!, roll);
    const ready = change(game, "ally", { statusStacks: conditions }),
      before = structuredClone(ready);
    const r = play(ready, command);
    expect(entity(r.state, "ally")).toMatchObject({
      wounds: roll === 1 ? 3 : 4,
      statusStacks: [{ kind: "buff", remaining: 2 }],
    });
    expect(entity(r.state, "h").wounds).toBe(5);
    for (const id of ["h", "ally"]) expect(entity(r.state, id).stress).toBe(roll === 1 ? 2 : 3);
    expect(r.state.battle).toMatchObject({
      rngCursor: 1,
      encounter: { turn: { actions: 1, usedSkillIds: [skills[0]!.id] } },
    });
    expect(ready).toEqual(before);
    expect(applyCommand(JSON.parse(JSON.stringify(ready)), command)).toEqual(r);
    expect(applyCommand(ready, command)).toEqual(r);
  }
});

it("Medicine命中不清使用者状态；自身治疗只一次，解除死门且不掷死门骰", () => {
  const { game, command } = setup();
  const ready = change(
    change(game, "h", { wounds: stats[0]!.life, statusStacks: conditions }),
    "ally",
    { statusStacks: conditions },
  );
  const ally = play(ready, command);
  expect(entity(ally.state, "h").statusStacks).toEqual(conditions);
  const self = play(ready, {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "h",
    skillId: skills[0]!.id,
  });
  expect(entity(self.state, "h")).toMatchObject({
    wounds: stats[0]!.life! - 1,
    dead: false,
    statusStacks: [{ kind: "buff", remaining: 2 }],
  });
  expect(self.state.battle!.rngCursor).toBe(1);
});

it("Medicine真实Fast Healer/Infirm修正治疗量，治疗为0仍清目标全部两种状态", () => {
  for (const name of ["Fast Healer", "Infirm"]) {
    const quirk = data.quirk.cards.find((c) => c.name === name)!;
    const { game, command } = setup();
    const ready = change(game, "ally", { statusStacks: conditions, quirkIds: [quirk.id] });
    const r = play(ready, command);
    expect(entity(r.state, "ally").wounds).toBe(name === "Fast Healer" ? 3 : 5);
    expect(entity(r.state, "ally").statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
  }
});

it("Medicine真实高Dodge夹具落空不治疗不清状态，仍消费一次骰/行动且可重用", () => {
  const { game, command } = setup(skills[0]!, 10),
    ready = change(game, "ally", { dodge: 15, statusStacks: conditions });
  const r = play(ready, command);
  expect(entity(r.state, "ally")).toMatchObject({ wounds: 5, statusStacks: conditions });
  expect(r.state.battle).toMatchObject({
    rngCursor: 1,
    encounter: { turn: { actions: 1, usedSkillIds: [] } },
  });
});

it("Vapours四姿态都可用，无Acc/Crit不掷骰不治疗，给自身或同区友方完整Buff3t", () => {
  for (const stance of ["aggressive", "defensive", "ranged", "support"] as const)
    for (const targetId of ["h", "ally"]) {
      const { game } = setup(skills[1]!);
      const ready = change(game, "h", { stance });
      const command: Command = {
        type: "playHeroSkill",
        actorId: "h",
        targetId,
        skillId: skills[1]!.id,
      };
      const before = structuredClone(ready),
        r = play(ready, command);
      expect(entity(r.state, targetId)).toMatchObject({
        wounds: 5,
        stress: 3,
        statusStacks: [{ kind: "buff", remaining: 3 }],
      });
      expect(r.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
        roll: null,
        resolution: { outcome: null, damageDealt: null, skipped: [] },
      });
      expect(r.state.battle).toMatchObject({
        rngCursor: 0,
        encounter: { turn: { actions: 1, usedSkillIds: [skills[1]!.id] } },
      });
      expect(applyCommand(r.state, command).state).toBe(r.state);
      expect(applyCommand(JSON.parse(JSON.stringify(ready)), command)).toEqual(r);
      expect(applyCommand(ready, command)).toEqual(r);
      expect(ready).toEqual(before);
    }
});

it("Vapours独立堆不覆盖旧Buff；每堆Crit+1，回合开始递减并最终消失", () => {
  const { game, command } = setup(skills[1]!, 1);
  const ready = change(game, "ally", {
    statusStacks: [{ kind: "buff", remaining: 1 }],
    buffStacks: 1,
  });
  const r = play(ready, command);
  let ally = entity(r.state, "ally");
  expect(ally.statusStacks).toEqual([
    { kind: "buff", remaining: 1 },
    { kind: "buff", remaining: 3 },
  ]);
  expect(ally.buffStacks).toBe(2);
  // 明示下个英雄的回合入口，Smite Crit0受到现存Buff堆加成。
  const attackReady = {
    ...r.state,
    battle: {
      ...r.state.battle!,
      encounter: {
        ...r.state.battle!.encounter!,
        turn: { type: "hero", actorId: "ally", actions: 2, usedSkillIds: [] },
      },
    },
  } as GameState;
  const attack = play(attackReady, {
    type: "playHeroSkill",
    actorId: "ally",
    targetId: "m",
    skillId: skills[2]!.id,
  });
  expect(attack.events.find((e) => e.type === "heroSkillResolved")).toMatchObject({
    roll: 1,
    resolution: { outcome: "crit" },
  });
  for (const remaining of [2, 1, 0]) {
    const tick = resolveTurnStartStatus(ally, game.seed, 0);
    if (tick.status !== "resolved") throw new Error(tick.reason);
    ally = tick.entity;
    expect(ally.statusStacks).toEqual(remaining ? [{ kind: "buff", remaining }] : []);
    expect(ally.buffStacks).toBe(remaining ? 1 : 0);
  }
});

it("Vapours缺失或篡改目标行注解、射程/目标图标或状态行均原子拒绝，不从其他图标补目标", () => {
  const { game, command } = setup(skills[1]!);
  for (const field of [
    "missing",
    "source",
    "index",
    "range",
    "target",
    "naming",
    "scope",
  ] as const) {
    const skill = structuredClone(skills[1]!);
    const changed = clean<Record<string, unknown>>(skill);
    if (field === "missing") delete changed.verified_target_header;
    if (field === "source") changed.verified_target_header = { lineIndex: 0, source: "guess" };
    if (field === "index") changed.verified_target_header = { lineIndex: 1, source: "print_front" };
    const lines = structuredClone(skill.effect_lines).map((l) => [...l]);
    if (field === "range") lines[0]![1] = { type: "text", text: " 1 " };
    if (field === "target" || field === "naming") {
      const s = lines[0]![2]!;
      if (s.type === "icon")
        lines[0]![2] = {
          ...s,
          icon: {
            ...s.icon,
            ...(field === "target" ? { key: "target_monster" } : { naming: "unverified" }),
          },
        };
    }
    if (field === "scope")
      changed.verified_status_effects = [{ ...skill.verified_status_effects![0]!, scope: "self" }];
    changed.effect_lines = lines;
    const bad = { ...game, battle: { ...game.battle!, skills: [changed] } } as unknown as GameState;
    expect(applyCommand(bad, command).state, field).toBe(bad);
  }
});

it.each(skills.slice(0, 2))(
  "$id目标/射程/死亡原子拒绝；Medicine姿态/禁疗与Vapours未知防御/状态注解校验",
  (skill) => {
    const { game, command } = setup(skill);
    const invalid = [change(game, "ally", { areaId: "b" }), change(game, "ally", { dead: true })];
    if (skill.id.endsWith("139")) {
      invalid.push(change(game, "h", { stance: "aggressive" }));
      invalid.push({
        ...game,
        battle: {
          ...game.battle!,
          areas: game.battle!.areas.map((a) => ({ ...a, healingForbidden: true })),
        },
      });
    } else {
      invalid.push({
        ...game,
        battle: {
          ...game.battle!,
          heroStats: stats.map((s) => ({
            ...s,
            verified_buff_defence: undefined,
            verified_condition_defence: undefined,
          })),
        },
      } as unknown as GameState);
      for (const annotations of [
        undefined,
        [],
        [{ ...skill.verified_status_effects![0]!, duration: 9 }],
        [...skill.verified_status_effects!, ...skill.verified_status_effects!],
      ])
        invalid.push({
          ...game,
          battle: { ...game.battle!, skills: [{ ...skill, verified_status_effects: annotations }] },
        } as unknown as GameState);
    }
    for (const bad of invalid) expect(applyCommand(bad, command).state).toBe(bad);
    expect(
      applyCommand(game, { type: "playHeroSkill", actorId: "h", targetId: "m", skillId: skill.id })
        .state,
    ).toBe(game);
  },
);
