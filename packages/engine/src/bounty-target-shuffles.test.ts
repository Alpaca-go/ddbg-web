import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { createBattleState } from "./battle";
import type { BattleSetup } from "./battle";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nextBattleRoll } from "./encounter";
import { resolveHeroSkillEffects } from "./hero-skill";
import type { HeroSkillCardView } from "./hero-skill";
import { resolveTurnStartStatus } from "./battle-status";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skills = [49, 52].map((page) =>
  clean<HeroSkillCardView>(data.hero_skill.cards.find((c) => c.pages[0] === page)!),
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p005:front")!,
);
const soldier = clean<NonNullable<BattleSetup["monsters"]>[number]>(
  data.monster_medium.cards.find((c) => c.id === "monster_medium:p001")!,
);
const entity = (g: GameState, id = "m") => g.battle!.entities.find((e) => e.id === id)!;
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}
function setup(skill: HeroSkillCardView, roll = 5, fork = false) {
  const seed = Array.from({ length: 300 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === roll)!;
  const uppercut = skill.id === "hero_skill:p052";
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const game = createBattleState(seed, {
    heroStats: [stat],
    monsters: [soldier],
    skills: [skill],
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
        stance: "defensive",
        skillIds: [skill.id],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: soldier.id,
        life: soldier.life!,
        dodge: 2,
        areaId: uppercut ? "a" : "c",
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
  const command: Command = {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "m",
    skillId: skill.id,
  };
  return { game, command };
}

it.each(skills)("$id 十骰面：伤害、完整目标状态及位移只在命中时应用", (skill) => {
  const uppercut = skill.id === "hero_skill:p052";
  for (let roll = 1; roll <= 10; roll++) {
    const r = resolveHeroSkillEffects(
      skill,
      {
        actor: { id: "h", stance: "defensive", wounds: 0, stress: 3 },
        target: { id: "m", side: "monster", wounds: 0, dodge: 2, life: 7 },
        areaDistance: uppercut ? 0 : 2,
        light: 5,
      },
      roll,
    ).resolution;
    const hit = roll <= 7;
    expect(r).toMatchObject({
      status: "resolved",
      skipped: [],
      outcome: hit ? "hit" : "miss",
      damageDealt: hit ? (uppercut ? 3 : 2) : null,
      actorShuffle: null,
      targetShuffle: hit ? { direction: uppercut ? "push" : "pull", distance: 2 } : null,
      targetStatusEffects: hit
        ? [{ kind: uppercut ? "stun" : "mark", duration: uppercut ? 1 : 2 }]
        : [],
    });
  }
});

it.each(skills)("$id 公开命令及位移续接不重复伤害、状态或RNG；JSON回放相同", (skill) => {
  for (const roll of [5, 10]) {
    const { game, command } = setup(skill, roll),
      before = structuredClone(game);
    const played = ok(game, command);
    const hit = roll !== 10,
      uppercut = skill.id === "hero_skill:p052";
    expect(entity(played.state).wounds).toBe(hit ? (uppercut ? 3 : 2) : 0);
    expect(entity(played.state).statusStacks).toEqual(
      hit ? [{ kind: uppercut ? "stun" : "mark", remaining: uppercut ? 1 : 2 }] : [],
    );
    expect(played.state.battle!.shuffleIntents).toHaveLength(hit ? 1 : 0);
    expect(played.state.battle!.rngCursor).toBe(1);
    const done = hit ? ok(played.state, { type: "resolveShuffles" }) : played;
    expect(entity(done.state).areaId).toBe(hit ? (uppercut ? "c" : "a") : uppercut ? "a" : "c");
    expect(entity(done.state).stance).toBe(hit && uppercut ? "ranged" : "aggressive");
    expect(entity(done.state).statusStacks).toEqual(entity(played.state).statusStacks);
    expect(entity(done.state).wounds).toBe(entity(played.state).wounds);
    expect(done.state.battle!.rngCursor).toBe(1);
    expect(applyCommand(clean<GameState>(game), command)).toEqual(played);
    expect(game).toEqual(before);
    if (hit && uppercut)
      expect(resolveTurnStartStatus(entity(done.state), game.seed, 1)).toMatchObject({
        status: "resolved",
        stunned: true,
        entity: { statusStacks: [] },
      });
  }
});

it("Uppercut分岔冻结其他命令，过期选择拒绝，完成后只位移一次", () => {
  const { game, command } = setup(skills[1]!, 5, true);
  const played = ok(game, command);
  const pending = ok(played.state, { type: "resolveShuffles" });
  expect(pending.pendingChoice!.options.map((o) => o.id)).toEqual(["c", "d"]);
  expect(entity(pending.state).areaId).toBe("a");
  expect(applyCommand(pending.state, command).state).toBe(pending.state);
  const choose: Command = {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "d",
  };
  const done = ok(pending.state, choose);
  expect(entity(done.state)).toMatchObject({
    areaId: "d",
    stance: "ranged",
    wounds: 3,
    statusStacks: [{ kind: "stun", remaining: 1 }],
  });
  expect(done.state.battle!.rngCursor).toBe(1);
  expect(applyCommand(clean<GameState>(pending.state), choose)).toEqual(done);
  expect(applyCommand(done.state, choose).state).toBe(done.state);
});

it.each(skills)("$id 未完整核实的同行内容和缺防御在掷骰前原子拒绝", (skill) => {
  const { game, command } = setup(skill);
  const badSkills = [
    {
      ...skill,
      effect_lines: skill.effect_lines.map((l) => [...l, { type: "text" as const, text: "extra" }]),
    },
    {
      ...skill,
      verified_status_effects: skill.verified_status_effects!.map((e) => ({ ...e, duration: 9 })),
    },
    { ...skill, effect_lines: [...skill.effect_lines, skill.effect_lines[0]!] },
  ];
  for (const badSkill of badSkills) {
    const bad = { ...game, battle: { ...game.battle!, skills: [badSkill] } };
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  const missing = clean<GameState>({
    ...game,
    battle: { ...game.battle!, monsters: [{ ...soldier, resistances: undefined }] },
  });
  expect(applyCommand(missing, command).state).toBe(missing);
});

it.each(skills)("$id Shuffle抗性只少移一格，不减目标状态时长", (skill) => {
  const uppercut = skill.id === "hero_skill:p052";
  const r = resolveHeroSkillEffects(
    skill,
    {
      target: { id: "m", side: "monster", wounds: 0, dodge: 0, shuffleResist: true },
    },
    5,
  ).resolution;
  expect(r).toMatchObject({
    status: "resolved",
    targetShuffle: { direction: uppercut ? "push" : "pull", distance: 1 },
    targetStatusEffects: [{ kind: uppercut ? "stun" : "mark", duration: uppercut ? 1 : 2 }],
  });
});
