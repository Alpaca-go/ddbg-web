import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState, resolveHeroSkill } from "./index";
import type { BattleSetup, Command, GameState, HeroSkillCardView } from "./index";
import { nextBattleRoll } from "./encounter";

const data = loadNormalizedCorebox();
const clean = <T>(value: unknown): T => JSON.parse(JSON.stringify(value));
const skill = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p043")!,
);
const mark = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p046")!,
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number] & { dodge: number }>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:p005:front")!,
);
const target = (game: GameState) => game.battle!.entities.find((e) => e.id === "m")!;
function setup(marked = false, enemyId = "monster_medium:p021") {
  const enemy = clean<NonNullable<BattleSetup["monsters"]>[number]>(
    data.monster_medium.cards.find((c) => c.id === enemyId)!,
  );
  const seed = Array.from({ length: 10000 }, (_, i) => i).find(
    (s) => nextBattleRoll(s, 0) === 5 && nextBattleRoll(s, 1) === 5,
  )!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [] };
  const initial = createBattleState(seed, {
    heroStats: [stat],
    skills: [skill, mark],
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
        stance: "defensive",
        skillIds: [skill.id, mark.id],
        statusStacks: [],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: enemy.id,
        life: enemy.life,
        dodge: 2,
        areaId: "a",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
        monsterTypeTags: ["Human"],
        statusStacks: marked ? [{ kind: "mark", remaining: 3 }] : [],
      },
    ],
    areas: [{ id: "a", elevation: "normal", adjacent: [], capacity: 8 }],
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
    targetId: "m",
    skillId: skill.id,
  };
  return { game, command };
}
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}

it("十骰面、类型与0/1/3堆Mark：两条件各一次，合计后才算Protection和Riposte", () => {
  for (const tags of [["Human"], ["Unholy"], ["Human", "Unholy"], ["Human", "Human"], ["Humans"]])
    for (const markStacks of [0, 1, 3])
      for (const protection of [false, true])
        for (let roll = 1; roll <= 10; roll++) {
          const r = resolveHeroSkill(
            skill,
            {
              actor: { id: "h", stance: "defensive", wounds: 0, stress: 3 },
              target: {
                id: "m",
                side: "monster",
                wounds: 0,
                dodge: 2,
                monsterTypeTags: tags,
                markStacks,
                protection,
                riposte: true,
              },
              areaDistance: 0,
              light: 5,
            },
            roll,
          );
          const hit = roll <= 7 + markStacks,
            base = (roll === 1 ? 10 : 6) + (tags.includes("Human") ? 1 : 0) + (markStacks ? 2 : 0);
          expect(r).toMatchObject({
            status: "resolved",
            skipped: [],
            outcome: roll === 1 ? "crit" : hit ? "hit" : "miss",
            damageDealt: hit ? (protection ? Math.ceil(base / 2) : base) : null,
            riposteDamage: hit ? Math.ceil(base / 2) : null,
            printedAmount: hit ? (roll === 1 ? 10 : 6) : null,
          });
        }
});

it("公开命令以真实怪物卡标签为准；实体伪造Human不生效，一行动一骰及JSON回放", () => {
  for (const id of ["monster_medium:p001", "monster_medium:p021"])
    for (const marked of [false, true]) {
      const { game, command } = setup(marked, id),
        before = structuredClone(game);
      const done = ok(game, command),
        damage = 6 + (id.endsWith("021") ? 1 : 0) + (marked ? 2 : 0);
      expect(target(done.state).wounds).toBe(damage);
      expect(done.state.battle!.rngCursor).toBe(1);
      if (!target(done.state).dead)
        expect(done.state.battle!.encounter!.turn).toMatchObject({
          type: "hero",
          actions: 1,
          usedSkillIds: [skill.id],
        });
      expect(applyCommand(clean<GameState>(game), command)).toEqual(done);
      expect(game).toEqual(before);
    }
});

it("Mark for Death→Collect Bounty真实Human+Mark合计9伤害并收尾胜利，不重复耗骰", () => {
  const { game, command } = setup();
  const marked = ok(game, { ...command, type: "playHeroSkill", skillId: mark.id });
  expect(target(marked.state)).toMatchObject({ wounds: 0, markStacks: 1 });
  const done = ok(marked.state, command);
  expect(target(done.state)).toMatchObject({ wounds: 9, dead: true });
  expect(done.events.filter((e) => e.type === "battleFinished")).toHaveLength(1);
  expect(done.state.battle!.rngCursor).toBe(2);
  expect(applyCommand(clean<GameState>(marked.state), command)).toEqual(done);
});

it("缺真实种族、重复/冲突/畸变注解均原子拒绝；无注解保留旧效果边界", () => {
  const { game, command } = setup();
  const base = skill.verified_damage_bonuses!;
  const combat = {
    target: {
      id: "m",
      side: "monster" as const,
      wounds: 0,
      dodge: 0,
      monsterTypeTags: ["Human"],
      markStacks: 1,
    },
  };
  const { verified_damage_bonuses: _bonuses, ...legacy } = skill;
  void _bonuses;
  expect(resolveHeroSkill(legacy, combat, 5)).toMatchObject({
    status: "resolved",
    damageDealt: 6,
    skipped: [{ code: "effect_lines" }],
  });
  for (const bonuses of [
    [],
    [base[0]],
    [base[0], base[0]],
    [null, base[1]],
    [undefined, base[1]],
    base.map((b) => ({ ...b, amount: 9 })),
  ]) {
    const bad = clean<GameState>({
      ...game,
      battle: { ...game.battle!, skills: [{ ...skill, verified_damage_bonuses: bonuses }] },
    });
    expect(applyCommand(bad, command).state).toBe(bad);
  }
  const both = {
    ...game,
    battle: { ...game.battle!, skills: [{ ...skill, verified_damage_bonus: base[0]! }] },
  };
  expect(applyCommand(both, command).state).toBe(both);
  const missing = clean<GameState>({
    ...game,
    battle: {
      ...game.battle!,
      monsters: [{ ...game.battle!.monsters![0], type_position_tags: undefined }],
    },
  });
  expect(applyCommand(missing, command).state).toBe(missing);
});
