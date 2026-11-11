import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { coreQuestSources } from "./test-helpers/core-quest";
import { roomEffectFixture } from "./test-helpers/room-effects";
import { nextBattleRoll } from "./encounter";

const skill = coreQuestSources.catalog.skills.find((s) => s.id === "hero_skill:p091")!;
const stat = coreQuestSources.catalog.heroStats.find((s) => s.name === "VESTAL" && s.level === 1)!;
const q = (name: string) =>
  coreQuestSources.catalog.conditions!.quirks.find((c) => c.name === name)!.id;
const seed = Array.from({ length: 100 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) <= 2)!;
function setup(stress: number, tested = false): GameState {
  const game = roomEffectFixture(
    [
      { id: "E", adjacent: ["C", "G"], capacity: 4, elevation: "normal" },
      { id: "C", adjacent: ["E"], capacity: 4, elevation: "normal" },
      { id: "G", adjacent: ["E"], capacity: 4, elevation: "normal" },
    ],
    {},
    4,
    seed,
  );
  const b = game.battle!;
  return {
    ...game,
    battle: {
      ...b,
      heroStats: coreQuestSources.catalog.heroStats,
      skills: [skill],
      monsters: coreQuestSources.catalog.monsters,
      entities: b.entities.map((e) =>
        e.id === "h0"
          ? {
              ...e,
              hero: stat.name,
              heroStatId: stat.id,
              heroLevel: 1,
              life: stat.life,
              stance: "defensive",
              wounds: 0,
              stress,
              quirkIds: [q("Nocturnal")],
              skillIds: [skill.id],
              ...(tested
                ? { resolveTested: true, resolveCardId: coreQuestSources.resolveCards[0]!.id }
                : {}),
            }
          : e.id === "h1"
            ? { ...e, stance: "aggressive", areaId: "E", stress: 3, quirkIds: [q("Resilient")] }
            : e.id === "h2"
              ? { ...e, stress: 3 }
              : e.id === "m"
                ? { ...e, monsterCardId: "monster_medium:p001" }
                : e,
      ),
    },
  };
}
const actor = (s: GameState) => s.battle!.entities.find((e) => e.id === "h0")!;
it("Hands from the Abyss 降光照先结清 Night Blindness，再执行暴击减压", () => {
  const s = setup(9);
  const abyss = coreQuestSources.catalog.skills.find((c) => c.id === "hero_skill:p205")!;
  const occultist = coreQuestSources.catalog.heroStats.find(
    (c) => c.name === "OCCULTIST" && c.level === 1,
  )!;
  const result = applyCommand(
    {
      ...s,
      battle: {
        ...s.battle!,
        skills: [abyss],
        entities: s.battle!.entities.map((e) =>
          e.id === "h0"
            ? {
                ...e,
                hero: occultist.name,
                heroStatId: occultist.id,
                life: occultist.life,
                skillIds: [abyss.id],
                quirkIds: [q("Night Blindness")],
              }
            : e,
        ),
      },
    },
    { type: "playHeroSkill", actorId: "h0", targetId: "m", skillId: abyss.id },
  );
  expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(result.state.battle!.light).toBe(3);
  expect(actor(result.state)).toMatchObject({ stress: 0, resolveTested: true });
});
for (const multi of [false, true]) {
  const play = (state: GameState) =>
    applyCommand(
      state,
      multi
        ? { type: "playHeroSkillTargets", actorId: "h0", skillId: skill.id, targetIds: ["m"] }
        : { type: "playHeroSkill", actorId: "h0", skillId: skill.id, targetId: "m" },
    );
  it(`${multi ? "集合" : "单目标"}：光照压力先到10触发意志，随后只对存活同区英雄减压`, () => {
    const s = setup(9),
      before = structuredClone(s),
      result = play(s);
    expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
    expect(result.events.some((e) => e.type === "resolveTested")).toBe(true);
    expect(actor(result.state)).toMatchObject({ stress: 0, resolveTested: true, dead: false });
    expect(result.state.battle!.entities.find((e) => e.id === "h1")!.stress).toBe(1);
    expect(result.state.battle!.entities.find((e) => e.id === "h2")!.stress).toBe(3);
    expect(result.state.battle!.light).toBe(5);
    expect(result.events.findIndex((e) => e.type === "resolveTested")).toBeLessThan(
      result.events.findIndex((e) => e.type === "heroCritAreaResolved"),
    );
    expect(s).toEqual(before);
    expect(play(s)).toEqual(result);
  });
  it(`${multi ? "集合" : "单目标"}：已有意志卡时先心脏病，不用减压抵消死亡`, () => {
    const result = play(setup(9, true));
    expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
    expect(actor(result.state)).toMatchObject({ stress: 10, dead: true });
    expect(result.events.some((e) => e.type === "casualtyRemoved" && e.actorId === "h0")).toBe(
      true,
    );
  });
  it(`${multi ? "集合" : "单目标"}：压力0先加再减，光照封顶不触发被动`, () => {
    expect(actor(play(setup(0)).state).stress).toBe(0);
    const s = setup(9, true);
    const result = play({ ...s, battle: { ...s.battle!, light: 5 } });
    expect(actor(result.state)).toMatchObject({ stress: 8, dead: false });
  });
  it(`${multi ? "集合" : "单目标"}：压力追加伤口先掷死门，死亡取消意志检定`, () => {
    const s = setup(9);
    const deathSeed = Array.from({ length: 500 }, (_, i) => i).find(
      (n) => nextBattleRoll(n, 0) <= 2 && nextBattleRoll(n, 1) <= 3,
    )!;
    const result = play({
      ...s,
      seed: deathSeed,
      battle: {
        ...s.battle!,
        entities: s.battle!.entities.map((e) =>
          e.id === "h0" ? { ...e, wounds: e.life!, quirkIds: [q("Nocturnal"), q("Soft")] } : e,
        ),
      },
    });
    expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
    expect(actor(result.state).dead).toBe(true);
    expect(result.events.some((e) => e.type === "resolveTested")).toBe(false);
    expect(result.state.battle!.rngCursor).toBe(2);
  });
}
