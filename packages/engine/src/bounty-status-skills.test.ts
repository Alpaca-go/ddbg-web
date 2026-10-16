import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { resolveHeroSkillEffects, readPrintedRange } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import type { MonsterCardView } from "./monster-skill";
import { nextBattleRoll } from "./encounter";
import { tickStatusStacks } from "./status";

// 与既有场景一样，经JSON边界移除Zod可选字段的undefined，不改真实数据。
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const data = loadNormalizedCorebox();
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number; life: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p005:front")!,
);
const mark = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p046")!,
);
const caltrops = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p061")!,
);
const monster = clean<MonsterCardView & { life: number }>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p021")!,
);

it.each([mark, caltrops])("$name I十骰面完整结算：自身不看命中，目标只在命中后施加", (card) => {
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "ranged", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 2, life: monster.life! },
        areaDistance: 2,
        light: 5,
      },
      roll,
    ).resolution;
    const hit = roll <= (card === mark ? 8 : 7);
    expect(r).toMatchObject({ status: "resolved", skipped: [] });
    expect(r.actorStatusEffects).toEqual(card === mark ? [{ kind: "buff", duration: 2 }] : []);
    expect(r.targetStatusEffects).toEqual(
      !hit
        ? []
        : card === mark
          ? [
              { kind: "mark", duration: 3 },
              { kind: "debuff", duration: 2 },
            ]
          : [
              { kind: "bleed", amount: 2, duration: 3 },
              { kind: "debuff", duration: 1 },
            ],
    );
    if (card === caltrops) expect(r.damageDealt).toBe(!hit ? null : roll === 1 ? 2 : 1);
    else expect(r.wounds).toBe(0);
  }
  expect(readPrintedRange(card)).toEqual(
    card === mark ? { kind: "interval", min: 0, max: 2 } : { kind: "exact", distance: 2 },
  );
});

/** 两实体机制夹具；从已批准属性和真实怪物构造，不代表正式英雄选择或死亡补人。 */
function setup(card = mark, roll = 5) {
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const entities: BattleEntity[] = [
    {
      id: "h",
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      areaId: "a",
      stance: "ranged",
      wounds: 0,
      stress: 3,
      dodge: stat.dodge,
      skillIds: [card.id],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      statusStacks: [],
    },
    {
      id: "m",
      side: "monster",
      hero: null,
      monsterCardId: monster.id,
      life: monster.life!,
      areaId: "c",
      stance: "aggressive",
      stanceSlots: 1,
      wounds: 0,
      dodge: 2,
      skillIds: [],
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      statusStacks: [],
    },
  ];
  const game = createBattleState(seed, {
    heroStats: [stat],
    entities,
    skills: [card],
    monsters: [monster],
    light: 5,
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"] },
      { id: "b", elevation: "normal", adjacent: ["a", "c"] },
      { id: "c", elevation: "normal", adjacent: ["b"] },
    ],
  });
  return {
    game,
    command: { type: "playHeroSkill", actorId: "h", skillId: card.id, targetId: "m" } as Command,
  };
}
const entity = (g: GameState, id: string) => g.battle!.entities.find((e) => e.id === id)!;
function ok(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}

it("Mark公开命令自身Buff/目标Mark+Debuff均进入真实独立堆；落空只有自身，种子回放与JSON往返一致", () => {
  for (const roll of [5, 10]) {
    const { game, command } = setup(mark, roll),
      before = structuredClone(game),
      r = ok(game, command);
    expect(entity(r.state, "h").statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
    expect(entity(r.state, "m").statusStacks).toEqual(
      roll === 10
        ? []
        : [
            { kind: "mark", remaining: 3 },
            { kind: "debuff", remaining: 1 },
          ],
    );
    expect(r.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(JSON.parse(JSON.stringify(game)), command)).toEqual(r);
    expect(game).toEqual(before);
    expect(entity(r.state, "m").wounds).toBe(0);
  }
});
it("Caltrops公开命令基础/暴击伤害和Bleed计时分开；Debuff不误作Buff，下次回合独立消费", () => {
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(caltrops, roll),
      r = ok(game, command),
      target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 2 : 1);
    expect(target.statusStacks).toEqual(
      roll === 10 ? [] : [{ kind: "bleed", remaining: 3, amount: 2 }],
    );
    expect(entity(r.state, "h").statusStacks).toEqual([]);
    expect(r.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(game, command)).toEqual(r);
    if (roll !== 10)
      expect(tickStatusStacks(target.statusStacks!)).toMatchObject({
        woundAmounts: [2],
        stacks: [{ kind: "bleed", remaining: 2, amount: 2 }],
      });
  }
});
it("射程/缺目标防御/不完整状态行非法时整次原子拒绝，不先施加Buff或消费RNG", () => {
  const { game, command } = setup(mark);
  for (const patch of [
    {
      entities: game.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "d" } : e)),
      areas: [
        ...game.battle!.areas.map((a) => (a.id === "c" ? { ...a, adjacent: ["b", "d"] } : a)),
        { id: "d", elevation: "normal" as const, adjacent: ["c"] },
      ],
    },
    { monsters: [{ ...monster, resistances: undefined }] },
    {
      skills: [
        {
          ...mark,
          verified_status_effects: mark.verified_status_effects!.filter((e) => e.kind !== "debuff"),
        },
      ],
    },
  ]) {
    const bad = { ...game, battle: { ...game.battle!, ...patch } } as GameState;
    expect(applyCommand(bad, command).state).toBe(bad);
  }
});
