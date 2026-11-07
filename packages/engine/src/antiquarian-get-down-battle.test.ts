import { expect, it } from "vitest";
import { loadNormalizedCorebox } from "../../data/src/normalize/write";
import { applyCommand, createBattleState } from "./index";
import type { BattleSetup, Command, GameState, HeroSkillCardView } from "./index";
import { needsHeroSkillShufflePushDistance } from "./hero-skill";

const data = loadNormalizedCorebox();
const clean = <T>(v: unknown): T => JSON.parse(JSON.stringify(v));
const skill = clean<HeroSkillCardView>(
  data.hero_skill.cards.find((c) => c.id === "hero_skill:p303")!,
);
const stat = clean<NonNullable<BattleSetup["heroStats"]>[number]>(
  data.hero_stat.cards.find((c) => c.id === "hero_stat:warrens:antiquarian:p001:front")!,
);

function setup() {
  const initial = createBattleState(41, {
    heroStats: [{ ...stat, attributesVerified: true }],
    skills: [skill],
    light: 5,
    entities: [
      {
        id: "h",
        side: "hero",
        hero: "ANTIQUARIAN",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: 0,
        wounds: 0,
        stress: 0,
        guard: false,
        dead: false,
        bleed: [],
        blight: [],
        statusStacks: [],
        areaId: "a",
        stance: "defensive",
        skillIds: [skill.id],
      },
    ],
    areas: [
      { id: "a", elevation: "normal", adjacent: ["b", "c"], capacity: 8 },
      { id: "b", elevation: "normal", adjacent: ["a"], capacity: 8 },
      { id: "c", elevation: "normal", adjacent: ["a"], capacity: 8 },
    ],
  });
  const game: GameState = {
    ...initial,
    battle: {
      ...initial.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
      },
    },
  };
  const command: Command = {
    type: "playHeroSkill",
    actorId: "h",
    skillId: skill.id,
    targetId: "h",
  };
  return { game, command };
}

const choose = (game: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: game.battle!.pending!.choice.id,
  optionId,
});

it("Get Down! III：实战须待选 Push 距离后成功结算（Q-168）", () => {
  expect(needsHeroSkillShufflePushDistance(skill)).toEqual([1, 2]);
  const { game, command } = setup();
  const waiting = applyCommand(game, command);
  const refused = waiting.events.find((e) => e.type === "commandRefused");
  expect(refused, JSON.stringify(waiting.events)).toBeUndefined();
  expect(waiting.pendingChoice?.options.map((o) => o.id)).toEqual(["1", "2"]);
  const afterDistance = applyCommand(waiting.state, choose(waiting.state, "2"));
  expect(afterDistance.state.battle!.pending?.type).not.toBe("shufflePushDistance");
  const finished = applyCommand(afterDistance.state, { type: "resolveShuffles" });
  expect(
    finished.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(finished.events),
  ).toBe(false);
  const hero = finished.state.battle!.entities.find((e) => e.id === "h")!;
  expect(hero.statusStacks?.some((s) => s.kind === "buff")).toBe(true);
  const explicit = applyCommand(game, { ...command, shufflePushDistance: 1 });
  expect(explicit.state.battle!.pending?.type).not.toBe("shufflePushDistance");
  expect(explicit.events.some((e) => e.type === "commandRefused")).toBe(false);
});
