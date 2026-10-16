import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleSetup, Command, GameState, HeroSkillCardView } from "./index";
import { needsHeroSkillShuffleChoice } from "./hero-skill";
import { nextBattleRoll } from "./encounter";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skill = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p055")!,
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p005:front")!,
);
const monster = (id: string) =>
  clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === id)!,
  );
function setup(roll = 5, fork = false, enemy = monster("monster_medium:p021")) {
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const initial = createBattleState(seed, {
    heroStats: [stat],
    skills: [skill],
    monsters: [enemy],
    light: 5,
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "BOUNTY HUNTER",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge,
        stress: 3,
        areaId: "a",
        stance: "ranged",
        skillIds: [skill.id],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: enemy.id,
        life: enemy.life,
        dodge: 2,
        areaId: "b",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: fork ? ["a", "c", "d"] : ["a", "c"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["b"], capacity: 8 },
      ...(fork ? [{ id: "d", elevation: "normal" as const, adjacent: ["b"], capacity: 8 }] : []),
    ],
  });
  const game: GameState = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const command: Command = {
    type: "playHeroSkill",
    actorId: "h",
    skillId: skill.id,
    targetId: "m",
  };
  return { game, command };
}
const target = (game: GameState) => game.battle!.entities.find((e) => e.id === "m")!;
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}
const choose = (game: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: game.battle!.pending!.choice.id,
  optionId,
});

it("Flashbang两方向十骰面：没有Crit或基础伤害，命中才施加完整Stun/Shuffle", () => {
  expect(needsHeroSkillShuffleChoice(skill)).toBe(true);
  for (const shuffleChoice of ["push", "pull"] as const)
    for (let roll = 1; roll <= 10; roll++) {
      const r = resolveHeroSkill(
        skill,
        {
          actor: { id: "h", stance: "ranged", wounds: 0, stress: 3, buffStacks: 4 },
          target: { id: "m", side: "monster", wounds: 0, dodge: 2, debuffStacks: 4 },
          areaDistance: 1,
          light: 4,
          shuffleChoice,
        },
        roll,
      );
      const hit = roll <= 8;
      expect(r).toMatchObject({
        status: "resolved",
        outcome: hit ? "hit" : "miss",
        effect: null,
        printedAmount: null,
        damageDealt: null,
        wounds: 0,
        actorStress: 3,
        skipped: [],
        targetStatusEffects: hit ? [{ kind: "stun", duration: 1 }] : [],
        targetShuffle: hit ? { direction: shuffleChoice, distance: 1 } : null,
      });
    }
  expect(
    resolveHeroSkill(skill, { target: { id: "m", side: "monster", wounds: 0, dodge: 0 } }, 5)
      .status,
  ).toBe("refused");
});

it.each(["push", "pull"] as const)(
  "%s方向先选不耗骰/行动；命中后区域姿态续接一次并可JSON回放",
  (direction) => {
    const { game, command } = setup(),
      before = structuredClone(game);
    const waiting = ok(game, command);
    expect(waiting.pendingChoice!.options.map((o) => o.id)).toEqual(["push", "pull"]);
    expect(waiting.state.battle!.rngCursor).toBe(0);
    expect(waiting.state.battle!.encounter).toEqual(game.battle!.encounter);
    expect(waiting.state.battle!.entities).toEqual(game.battle!.entities);
    expect(applyCommand(waiting.state, command).state).toBe(waiting.state);
    expect(applyCommand(waiting.state, choose(waiting.state, "invalid")).state).toBe(waiting.state);
    const choice = choose(waiting.state, direction);
    const played = ok(waiting.state, choice);
    expect(target(played.state)).toMatchObject({
      wounds: 0,
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(played.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(clean<GameState>(waiting.state), choice)).toEqual(played);
    const done = ok(played.state, { type: "resolveShuffles" });
    expect(target(done.state)).toMatchObject({
      areaId: direction === "push" ? "c" : "a",
      stance: direction === "push" ? "defensive" : "aggressive",
      wounds: 0,
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(done.state.battle!.encounter!.turn).toMatchObject({
      type: "hero",
      actions: 1,
      usedSkillIds: [skill.id],
    });
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(done.state, choice).state).toBe(done.state);
    expect(game).toEqual(before);
  },
);

it("方向待选后再到落点待选，旧choice不能复用，状态与RNG保持一次", () => {
  const { game, command } = setup(5, true);
  const direction = ok(game, command);
  const oldChoice = choose(direction.state, "push");
  const played = ok(direction.state, oldChoice);
  const landing = ok(played.state, { type: "resolveShuffles" });
  expect(landing.pendingChoice!.id).not.toBe(direction.pendingChoice!.id);
  expect(landing.pendingChoice!.options.map((o) => o.id)).toEqual(["c", "d"]);
  expect(applyCommand(landing.state, oldChoice).state).toBe(landing.state);
  expect(applyCommand(landing.state, command).state).toBe(landing.state);
  const finalChoice = choose(landing.state, "d");
  const done = ok(landing.state, finalChoice);
  expect(target(done.state)).toMatchObject({
    areaId: "d",
    stance: "defensive",
    wounds: 0,
    statusStacks: [{ kind: "stun", remaining: 1 }],
  });
  expect(done.state.battle!.rngCursor).toBe(1);
  expect(done.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
  expect(applyCommand(clean<GameState>(landing.state), finalChoice)).toEqual(done);
});

it.each(["push", "pull"] as const)(
  "%s落空无状态/位移，显式方向与待选结果一致且只耗一次行动",
  (shuffleChoice) => {
    const { game, command } = setup(10);
    const waiting = ok(game, command);
    const done = ok(waiting.state, choose(waiting.state, shuffleChoice));
    expect(target(done.state)).toMatchObject({
      wounds: 0,
      areaId: "b",
      stance: "aggressive",
      statusStacks: [],
    });
    expect(done.state.battle!.shuffleIntents).toEqual([]);
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(done.state.battle!.encounter!.turn).toMatchObject({
      type: "hero",
      actions: 1,
      usedSkillIds: [],
    });
    const explicit = ok(game, { ...command, type: "playHeroSkill", shuffleChoice });
    expect(explicit.state.battle!.entities).toEqual(done.state.battle!.entities);
    expect(explicit.state.battle!.encounter).toEqual(done.state.battle!.encounter);
  },
);

it("Maggot真实Stun免疫只取消眩晕，仍正常位移且不造伤害", () => {
  const { game, command } = setup(5, false, monster("monster_medium:p031"));
  const played = ok(game, { ...command, type: "playHeroSkill", shuffleChoice: "push" });
  const done = ok(played.state, { type: "resolveShuffles" });
  expect(target(done.state)).toMatchObject({
    areaId: "c",
    wounds: 0,
    dead: false,
    statusStacks: [],
  });
});

it("未核实同行、不同距离、缺防御、非法射程均在方向待选前原子拒绝", () => {
  const { game, command } = setup();
  for (const effect_lines of [
    skill.effect_lines.map((l) => [...l, { type: "text" as const, text: "extra" }]),
    skill.effect_lines.map((l) =>
      l.map((s) => (s.type === "text" ? { ...s, text: s.text.replace("Pull 1", "Pull 2") } : s)),
    ),
  ]) {
    const bad = { ...game, battle: { ...game.battle!, skills: [{ ...skill, effect_lines }] } };
    expect(needsHeroSkillShuffleChoice(bad.battle.skills[0]!)).toBe(false);
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  const noDefence = clean<GameState>({
    ...game,
    battle: {
      ...game.battle!,
      monsters: [{ ...monster("monster_medium:p021"), resistances: undefined }],
    },
  });
  expect(applyCommand(noDefence, command).state).toBe(noDefence);
  const sameArea = {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((e) => (e.id === "m" ? { ...e, areaId: "a" } : e)),
    },
  };
  expect(applyCommand(sameArea, command).state).toBe(sameArea);
});
