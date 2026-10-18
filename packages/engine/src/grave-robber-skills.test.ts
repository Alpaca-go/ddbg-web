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
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p017:front")!,
);
const monster = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p021")!,
);
const entity = (game: GameState, id: string) => game.battle!.entities.find((e) => e.id === id)!;

function setup(
  card: HeroSkillCardView,
  roll = 5,
  patch: {
    actor?: Partial<BattleEntity>;
    target?: Partial<BattleEntity>;
    areaDistance?: 0 | 1 | 2;
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
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [monster],
    skills: [card],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "GRAVE ROBBER",
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
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 2,
        areaId: distance === 0 ? "a" : distance === 1 ? "b" : "c",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
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

it("Pick to the Face I：公开命令无视 Protection；落空不改伤口；存档命令形状不变", () => {
  const card = skill(169);
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(card, roll, {
      areaDistance: 0,
      target: { protection: true, dodge: 0 },
    });
    const before = structuredClone(game);
    const r = play(game, command);
    const target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 7 : 4);
    expect(JSON.stringify(command)).toBe(
      JSON.stringify({ type: "playHeroSkill", actorId: "h", targetId: "m", skillId: card.id }),
    );
    expect(before.battle!.entities.find((e) => e.id === "m")!.wounds).toBe(0);
  }
});

it("Lunge I：自身 Pull 2 不看命中；对真实 Blight 堆 +2；缺状态堆拒绝", () => {
  const card = skill(172);
  for (const roll of [1, 5, 10]) {
    const r = resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "support", wounds: 0, stress: 3 },
        target: {
          id: "m",
          side: "monster",
          wounds: 0,
          dodge: 2,
          life: monster.life!,
          statusStacks: [{ kind: "blight", amount: 2, remaining: 2 }],
        },
        areaDistance: 2,
        light: 5,
      },
      roll,
    ).resolution;
    expect(r).toMatchObject({
      status: "resolved",
      skipped: [],
      actorShuffle: { direction: "pull", distance: 2 },
      damageDealt: roll > 8 ? null : roll === 1 ? 13 : 9,
    });
  }
  expect(
    resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "support", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
        areaDistance: 2,
      },
      5,
    ).resolution.status,
  ).toBe("refused");
  const { game, command } = setup(skill(172), 5, {
    areaDistance: 2,
    target: { statusStacks: [{ kind: "blight", amount: 1, remaining: 1 }], dodge: 0 },
  });
  const pending = play(game, command);
  expect(pending.events[0]).toMatchObject({
    type: "heroSkillResolved",
    resolution: { damageDealt: 9, actorShuffle: { direction: "pull", distance: 2 } },
    phase: "ownPending",
  });
  expect(entity(pending.state, "m").wounds).toBe(0);
  const done = play(pending.state, { type: "resolveShuffles" });
  expect(entity(done.state, "m").wounds).toBe(9);
  expect(entity(done.state, "h").areaId).not.toBe("a");
});

it("Flashing Daggers I：双目标共享骰、逐名伤害；无额外效果行", () => {
  const card = skill(175);
  expect(card.effect_lines).toEqual([]);
  expect(card.verified_status_effects).toBeUndefined();
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 5)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [monster],
    skills: [card],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "GRAVE ROBBER",
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
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 0,
        areaId: "b",
        stance: id === "m1" ? "aggressive" : "defensive",
        stanceSlots: 1,
        skillIds: [],
      })),
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
  const command: Command = {
    type: "playHeroSkillTargets",
    actorId: "h",
    skillId: card.id,
    targetIds: ["m1", "m2"],
  };
  const r = play(game, command);
  expect(entity(r.state, "m1").wounds).toBe(3);
  expect(entity(r.state, "m2").wounds).toBe(3);
  expect(r.state.battle!.rngCursor).toBe(1);
});

it("Shadow Fade I：不掷骰施加 Buff 2t 与 Push 2；JSON 往返一致", () => {
  const card = skill(178);
  const { game, command } = setup(card, 5, {
    actor: { stance: "defensive" },
    target: { areaId: "a" },
    areaDistance: 0,
  });
  const cast = { ...command, targetId: "h" };
  const r = play(game, cast);
  expect(entity(r.state, "h")).toMatchObject({
    statusStacks: [{ kind: "buff", remaining: 2 }],
    buffStacks: 1,
  });
  expect(r.state.battle!.shuffleIntents).toHaveLength(1);
  expect(r.state.battle!.rngCursor).toBe(0);
  const roundTrip = JSON.parse(JSON.stringify(r.state)) as GameState;
  expect(roundTrip.battle!.entities.find((e) => e.id === "h")!.statusStacks).toEqual([
    { kind: "buff", remaining: 2 },
  ]);
});

it("Throw Dagger I：1–2 射程；Blight / Mark 双条件各加一次；缺堆拒绝", () => {
  const card = skill(181);
  expect(readPrintedRange(card)).toEqual({ kind: "interval", min: 1, max: 2 });
  for (const [blight, markStacks, bonus] of [
    [false, 0, 0],
    [true, 0, 1],
    [false, 1, 2],
    [true, 1, 3],
  ] as const) {
    const r = resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "support", wounds: 0, stress: 3 },
        target: {
          id: "m",
          side: "monster",
          wounds: 0,
          dodge: 0,
          life: 20,
          markStacks,
          statusStacks: blight ? [{ kind: "blight", amount: 1, remaining: 1 }] : [],
        },
        areaDistance: 1,
        light: 5,
      },
      5,
    ).resolution;
    expect(r).toMatchObject({ status: "resolved", skipped: [], damageDealt: 4 + bonus });
  }
  expect(
    resolveHeroSkillEffects(
      card,
      {
        actor: { id: "h", stance: "support", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 0 },
        areaDistance: 1,
      },
      5,
    ).resolution.status,
  ).toBe("refused");
});

it("Poison Dart I：命中施加 Blight 2·3t；落空不加；回合开始独立消费", () => {
  const card = skill(184);
  // Acc10 − Dodge2 → 命中 ≤8；Crit1。
  for (const roll of [1, 5, 10]) {
    const { game, command } = setup(card, roll, { areaDistance: 1 });
    const r = play(game, command);
    const target = entity(r.state, "m");
    expect(target.wounds).toBe(roll === 10 ? 0 : roll === 1 ? 4 : 2);
    expect(target.statusStacks).toEqual(
      roll === 10 ? [] : [{ kind: "blight", amount: 2, remaining: 3 }],
    );
  }
  const { game, command } = setup(card, 5, { areaDistance: 1 });
  const hit = play(game, command);
  const target = entity(hit.state, "m");
  const afterTick = resolveTurnStartStatus(target, hit.state.seed, hit.state.battle!.rngCursor);
  expect(afterTick).toMatchObject({
    status: "resolved",
    entity: { statusStacks: [{ kind: "blight", amount: 2, remaining: 2 }] },
  });
});

it("Toxin Trickery I：不掷骰清 Bleed/Blight 并放 Buff 2t；无 skipped", () => {
  const card = skill(187);
  const { game, command } = setup(card, 10, {
    actor: {
      stance: "aggressive",
      bleed: ["a"],
      blight: ["b"],
      statusStacks: [
        { kind: "bleed", amount: 1, remaining: 2 },
        { kind: "blight", amount: 2, remaining: 1 },
      ],
    },
    target: { areaId: "a" },
    areaDistance: 0,
  });
  const cast = { ...command, targetId: "h" };
  const r = play(game, cast);
  expect(entity(r.state, "h")).toMatchObject({
    bleed: [],
    blight: [],
    statusStacks: [{ kind: "buff", remaining: 2 }],
    buffStacks: 1,
  });
  expect(r.state.battle!.rngCursor).toBe(0);
  const pure = resolveHeroSkillEffects(
    card,
    {
      actor: { id: "h", stance: "aggressive", wounds: 0, stress: 3 },
      target: { id: "h", side: "hero", wounds: 0, dodge: 20, stress: 3 },
    },
    1,
  ).resolution;
  expect(pure).toMatchObject({
    status: "resolved",
    skipped: [],
    actorStatusEffects: [{ kind: "buff", duration: 2 }],
    actorBleedCleared: true,
    actorBlightCleared: true,
  });
});

it("Pilfer：Draw 图标仍 unverified（Q-98）；不新增命令名；GR 因 Pilfer 缺口保留未接线名单", () => {
  const face = data.hero_stat.cards.find((c) => c.id === "hero_stat:p017:front")!;
  expect(face.lines.some((line) => line.includes("Hamlet Skill: Pilfer"))).toBe(true);
  expect(
    face.icons.some((icon) => icon.iconId === "79084a2922" && icon.naming === "unverified"),
  ).toBe(true);
  expect(FORMAL_HEROES_WITH_UNWIRED_COMBAT_SKILLS).toEqual(["GRAVE ROBBER", "OCCULTIST"]);
  expect(
    savedCommandSchema.safeParse({
      type: "useHamletSkill",
      actorId: "hero-0",
      skill: "pilfer",
    }).success,
  ).toBe(false);
});
