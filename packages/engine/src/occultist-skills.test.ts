import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { resolveHeroSkillEffects, readPrintedRange } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { resolveTurnStartStatus } from "./battle-status";
import { FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS } from "./formal-heroes";
import { savedCommandSchema } from "../../data/src/quest-save";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skill = (page: number) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.pages[0] === page)!);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p019:front")!,
);
const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p021")!,
);
const eldritch = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p072")!,
);
const entity = (game: GameState, id: string) => game.battle!.entities.find((e) => e.id === id)!;

function setup(
  card: HeroSkillCardView,
  roll = 5,
  patch: {
    actor?: Partial<BattleEntity>;
    target?: Partial<BattleEntity>;
    areaDistance?: 0 | 1 | 2;
    monsterCard?: NonNullable<BattleSetup["monsters"]>[number];
    light?: number;
  } = {},
) {
  const distance =
    patch.areaDistance ??
    (readPrintedRange(card).kind === "exact"
      ? (readPrintedRange(card) as { distance: number }).distance
      : 1);
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const lit = card.top_row_icons?.find((icon) => /^stance_.*_lit$/.test(icon.key ?? ""));
  const stance = (lit?.key?.replace(/^stance_|_lit$/g, "") ?? "ranged") as NonNullable<
    BattleEntity["stance"]
  >;
  const foe = patch.monsterCard ?? monster;
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [foe],
    skills: [card],
    light: patch.light ?? 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "OCCULTIST",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance,
        skillIds: [card.id],
        ...patch.actor,
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: foe.id,
        life: foe.life!,
        dodge: 2,
        areaId: distance === 0 ? "a" : distance === 1 ? "b" : "c",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
        monsterTypeTags: foe.type_position_tags?.filter((t) => typeof t === "string") ?? [],
        ...patch.target,
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
    ],
  });
  return {
    game,
    command: { type: "playHeroSkill", actorId: "h", targetId: "m", skillId: card.id } as Command,
  };
}

function play(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}

it("Sacrificial Stab I：vs Eldritch +1；缺类型拒绝；存档命令形状不变", () => {
  const card = skill(190);
  expect(card.verified_damage_bonus).toMatchObject({ condition: "eldritch", amount: 1 });
  for (const [tags, bonus] of [
    [["Eldritch"], 1],
    [["Beast"], 0],
    [["Eldritch", "Beast"], 1],
  ] as const) {
    const r = resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "aggressive", wounds: 0, stress: 3 },
        target: {
          id: "m",
          side: "monster",
          wounds: 0,
          dodge: 0,
          life: 20,
          monsterTypeTags: [...tags],
        },
        areaDistance: 0,
        light: 5,
      },
      5,
    ).resolution;
    expect(r).toMatchObject({ status: "resolved", skipped: [], damageDealt: 5 + bonus });
  }
  expect(
    resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "aggressive", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
        areaDistance: 0,
      },
      5,
    ).resolution.status,
  ).toBe("refused");
  const { game, command } = setup(card, 5, {
    areaDistance: 0,
    monsterCard: eldritch,
    target: { dodge: 0 },
  });
  const before = structuredClone(game);
  play(game, command);
  expect(JSON.stringify(command)).toBe(
    JSON.stringify({ type: "playHeroSkill", actorId: "h", targetId: "m", skillId: card.id }),
  );
  expect(before.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
});

it("Abyssal Artillery I：双目标共享骰、逐名伤害；Eldritch 各 +1", () => {
  const card = skill(193);
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 5)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [eldritch],
    skills: [card],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "OCCULTIST",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance: "support",
        skillIds: [card.id],
      },
      ...(["m1", "m2"] as const).map((id): BattleEntity => ({
        ...common,
        id,
        side: "monster",
        hero: null,
        monsterCardId: eldritch.id,
        life: eldritch.life!,
        dodge: 0,
        areaId: "c",
        stance: id === "m1" ? "aggressive" : "defensive",
        stanceSlots: 1,
        skillIds: [],
        monsterTypeTags: ["Eldritch", "Beast"],
      })),
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
    ],
  });
  const command: Command = {
    type: "playHeroSkillTargets",
    actorId: "h",
    skillId: card.id,
    targetIds: ["m1", "m2"],
  };
  const r = play(game, command);
  // Acc9 − Dodge0 → 命中；Crit0；伤害 4 + Eldritch 1 = 5
  expect(entity(r.state, "m1").wounds).toBe(5);
  expect(entity(r.state, "m2").wounds).toBe(5);
  expect(r.state.battle!.rngCursor).toBe(1);
});

it("Weakening Curse I：1–2 射程；命中 Debuff 2t（Acolyte 抗性减 1）；落空不加", () => {
  const card = skill(196);
  expect(readPrintedRange(card)).toEqual({ kind: "interval", min: 1, max: 2 });
  // Acc10 − Dodge2 → 命中 ≤8；Crit1。Cultist Acolyte 有 Debuff 抗性 → 时长 2→1。
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(card, roll, { areaDistance: 1 });
    const r = play(game, command);
    const target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 3 : 2);
    expect(target.statusStacks).toEqual(roll === 10 ? [] : [{ kind: "debuff", remaining: 1 }]);
  }
});

it("Wyrd Reconstruction I：0–1 射程；命中治疗并施加 Bleed 1·2t", () => {
  const card = skill(199);
  expect(readPrintedRange(card)).toEqual({ kind: "interval", min: 0, max: 1 });
  const ally = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
    data.hero_stat.cards.find((c) => c.id === "hero_stat:p001:front")!,
  );
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 5)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat, ally],
    monsters: [],
    skills: [card],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "OCCULTIST",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance: "support",
        skillIds: [card.id],
      },
      {
        ...common,
        id: "p",
        side: "hero",
        hero: "CRUSADER",
        heroStatId: ally.id,
        heroLevel: 1,
        life: ally.life,
        dodge: 0,
        stress: 2,
        wounds: 6,
        areaId: "a",
        stance: "aggressive",
        skillIds: [],
      },
    ],
    areas: [{ id: "a", elevation: "normal", adjacent: [], capacity: 8 }],
  });
  const r = play(game, {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "p",
    skillId: card.id,
  });
  // Acc9 − Dodge0；Crit3；掷5命中治疗4 → 伤口 2；Bleed 1·2t
  expect(entity(r.state, "p")).toMatchObject({
    wounds: 2,
    statusStacks: [{ kind: "bleed", amount: 1, remaining: 2 }],
  });
});

it("Vulnerability Hex I：1–2 射程；命中 Mark 2t", () => {
  const card = skill(202);
  // Acc10 − Dodge2 → 命中 ≤8；Crit1。
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(card, roll, { areaDistance: 1 });
    const r = play(game, command);
    const target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 2 : 1);
    expect(target.statusStacks).toEqual(roll === 10 ? [] : [{ kind: "mark", remaining: 2 }]);
    expect(target.markStacks).toBe(roll === 10 ? 0 : 1);
  }
});

it("Hands from the Abyss I：命中 Stun 2t 与光照 −1；落空不改", () => {
  const card = skill(205);
  // Acc9 − Dodge2 → 命中 ≤7；Crit1。
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(card, roll, { areaDistance: 1, light: 5 });
    const r = play(game, command);
    const target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 4 : 3);
    expect(target.statusStacks).toEqual(roll === 10 ? [] : [{ kind: "stun", remaining: 2 }]);
    expect(r.state.battle!.light).toBe(roll === 10 ? 5 : 4);
  }
  const { game, command } = setup(card, 5, { areaDistance: 1, light: 5 });
  const hit = play(game, command);
  const afterTick = resolveTurnStartStatus(
    entity(hit.state, "m"),
    hit.state.seed,
    hit.state.battle!.rngCursor,
  );
  expect(afterTick).toMatchObject({
    status: "resolved",
    entity: { statusStacks: [{ kind: "stun", remaining: 1 }] },
  });
});

it("Daemon’s Pull I：命中 Pull 2；落空不移；公开命令续接", () => {
  const card = skill(208);
  for (const roll of [1, 5, 10]) {
    const r = resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "support", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 0, monsterTypeTags: ["Beast"] },
        areaDistance: 2,
        light: 5,
      },
      roll,
    ).resolution;
    expect(r).toMatchObject({
      status: "resolved",
      skipped: [],
      targetShuffle: roll === 10 ? null : { direction: "pull", distance: 2 },
      damageDealt: roll === 10 ? null : roll === 1 ? 4 : 3,
    });
  }
  const { game, command } = setup(card, 5, { areaDistance: 2, target: { dodge: 0 } });
  const pending = play(game, command);
  expect(pending.state.battle!.shuffleIntents).toHaveLength(1);
  const done = play(pending.state, { type: "resolveShuffles" });
  expect(entity(done.state, "m").areaId).not.toBe("c");
});

it("Occ 退出未接线名单；Dark Ritual 命令 schema 接受；III 印刷治疗 5（R-097）", () => {
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual([]);
  expect(
    savedCommandSchema.safeParse({
      type: "useHamletSkill",
      actorId: "hero-0",
      skill: "darkRitual",
      targetId: "hero-1",
    }).success,
  ).toBe(true);
  const iii = data.hero_stat.cards.find((c) => c.id === "hero_stat:p020:front")!;
  expect(iii.lines.join(" ")).toMatch(/Dark Ritual/);
  expect(iii.lines.join(" ")).toMatch(/20ffe98e2d\} 5/);
  expect(iii.lines.some((l) => l.includes("4f7549c1b8") && l.includes("3t"))).toBe(true);
});
