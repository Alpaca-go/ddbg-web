import { expect, it } from "vitest";
import statsFile from "../../data/normalized/corebox/hero_stat.json";
import skillsFile from "../../data/normalized/corebox/hero_skill.json";
import monstersFile from "../../data/normalized/corebox/monster_medium.json";
import { normalizedHeroStatFileSchema } from "../../data/src/normalize/hero-stat";
import {
  normalizedHeroSkillFileSchema,
  normalizedMonsterMediumFileSchema,
} from "../../data/src/normalize/schema";
import {
  approvedExtraRuinsTiles,
  approvedExtraRuinsTileSchema,
} from "../../data/src/normalize/approved-ruins-tiles";
import { roomTileBattleAreas } from "./battle-monster-movement";
import { createBattleState } from "./battle";
import type { BattleEntity, BattleSetup } from "./battle";
import type { HeroSkillCardView } from "./hero-skill";
import type { MonsterCardView } from "./monster-skill";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { ANCESTOR_CONDITIONS, ancestorGlory } from "./battle-ancestor";
import { readHeroPassiveDefence } from "./battle-skill-status";
import { nextBattleRoll } from "./encounter";
import diseaseData from "../../data/normalized/corebox/disease.json";
import quirkData from "../../data/normalized/corebox/quirk.json";
import { diseaseFileSchema } from "../../data/src/disease";
import { normalizedQuirkFileSchema } from "../../data/src/normalize/schema";
import { createConditionPool } from "./conditions";
import type { StatusStack } from "./status";

const tile = approvedExtraRuinsTiles.find((t) => t.number === 7)!;
const stats = normalizedHeroStatFileSchema
  .parse(statsFile)
  .cards.filter(
    (s) => s.level === 1 && ["CRUSADER", "HELLION", "HIGHWAYMAN", "VESTAL"].includes(s.name),
  );
const skills: (HeroSkillCardView & { readonly level: number })[] = JSON.parse(
  JSON.stringify(normalizedHeroSkillFileSchema.parse(skillsFile).cards),
);
const defender: MonsterCardView = JSON.parse(
  JSON.stringify(
    normalizedMonsterMediumFileSchema
      .parse(monstersFile)
      .cards.find((m) => m.name === "Bone Defender"),
  ),
);
const battleStats: NonNullable<BattleSetup["heroStats"]> = JSON.parse(JSON.stringify(stats));
const negative: StatusStack[] = ANCESTOR_CONDITIONS.map((kind) => ({
  kind,
  remaining: 3,
  ...(kind === "bleed" || kind === "blight" ? { amount: 1 } : {}),
}));
const positive: StatusStack[] = ["buff", "guard", "protection", "riposte"].map((kind) => ({
  kind: kind as StatusStack["kind"],
  remaining: 3,
}));
function setup(areaId = "A4", firstHero = "CRUSADER", seed = 1): GameState {
  const heroes: BattleEntity[] = [firstHero, "HELLION", "HIGHWAYMAN", "VESTAL"].map((name, i) => {
    const stat = stats.find((s) => s.name === name)!;
    return {
      id: `h${i}`,
      side: "hero",
      hero: stat.name,
      heroStatId: stat.id,
      heroLevel: 1,
      life: stat.life,
      wounds: 0,
      stress: 0,
      areaId: i === 0 ? areaId : "A3",
      stance: (["aggressive", "defensive", "ranged", "support"] as const)[i]!,
      dodge: stat.dodge!,
      skillIds: skills.filter((s) => s.hero === stat.name && s.level === 1).map((s) => s.id),
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
    };
  });
  const monster: BattleEntity = {
    id: "m",
    side: "monster",
    hero: null,
    monsterCardId: defender.id,
    stanceSlots: 1,
    stance: "ranged",
    areaId: "A4",
    life: defender.life!,
    wounds: 0,
    dodge: 0,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  };
  return createBattleState(seed, {
    heroStats: battleStats,
    entities: [...heroes, monster],
    areas: roomTileBattleAreas(tile),
    skills,
    monsters: [defender],
    light: 5,
  });
}
const hero = (s: GameState) => s.battle!.entities.find((e) => e.id === "h0")!;
function higherCrusader(level: 2 | 3): GameState {
  const seed = Array.from({ length: 100 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 3)!;
  const initial = setup("A4", "CRUSADER", seed),
    b = initial.battle!;
  const stat = normalizedHeroStatFileSchema
    .parse(statsFile)
    .cards.find((card) => card.name === "CRUSADER" && card.level === level)!;
  return {
    ...initial,
    battle: {
      ...b,
      heroStats: JSON.parse(JSON.stringify([...b.heroStats!, stat])),
      conditions: createConditionPool(
        diseaseFileSchema.parse(diseaseData).cards,
        normalizedQuirkFileSchema.parse(quirkData).cards,
      ),
      areas: b.areas.map(({ ancestorGlory: _glory, ...area }) => {
        void _glory;
        return area;
      }),
      entities: b.entities.map((e) =>
        e.id === "h0"
          ? {
              ...e,
              heroStatId: stat.id,
              heroLevel: level,
              life: stat.life,
              dodge: stat.dodge,
              diseaseId: "disease:p007",
              quirkIds: ["quirk:p014"], // Vertigo / Balanced
            }
          : e,
      ),
    },
  };
}
it("Crusader II/III真实Dead Weight：抗性减到0/免疫，不触发Balanced或Vertigo", () => {
  for (const level of [2, 3] as const) {
    const initial = higherCrusader(level),
      before = structuredClone(initial);
    const rolled = applyCommand(initial, {
      type: "playMonsterSkill",
      actorId: "m",
      targetId: "h0",
      skillSlot: 2,
    });
    expect(
      rolled.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(rolled.events),
    ).toBe(false);
    const done = rolled.state.battle!.shuffleIntents.length
      ? applyCommand(rolled.state, { type: "resolveShuffles" })
      : rolled;
    expect(
      done.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(done.events),
    ).toBe(false);
    expect(done.pendingChoice).toBeUndefined();
    expect(hero(done.state)).toMatchObject({
      areaId: "A4",
      stance: "aggressive",
      stress: 0,
      diseaseId: "disease:p007",
      statusStacks: [{ kind: "stun", remaining: 1 }],
    });
    expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
    expect(initial).toEqual(before);
    expect(
      applyCommand(initial, {
        type: "playMonsterSkill",
        actorId: "m",
        targetId: "h0",
        skillSlot: 2,
      }),
    ).toEqual(rolled);
  }
});
it("Crusader III真实Holy Lance自身Pull无视新免疫，仍移动区域和姿态", () => {
  const base = higherCrusader(3),
    b = base.battle!;
  const initial: GameState = {
    ...base,
    battle: {
      ...b,
      entities: b.entities.map((e) =>
        e.id === "h0"
          ? { ...e, areaId: "A2", stance: "ranged", diseaseId: null, quirkIds: [] }
          : e.id === "h2"
            ? { ...e, stance: "aggressive" }
            : e,
      ),
    },
  };
  const rolled = applyCommand(initial, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId: "hero_skill:p016",
  });
  expect(
    rolled.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(rolled.events),
  ).toBe(false);
  const done = applyCommand(rolled.state, { type: "resolveShuffles" });
  expect(
    done.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(done.events),
  ).toBe(false);
  expect(hero(done.state)).toMatchObject({ areaId: "A4", stance: "defensive" });
  expect(done.state.battle!.rngCursor).toBe(rolled.state.battle!.rngCursor);
});
it("Tomb整面锁定及仅A4连续效果；未就绪或候选区域不投影", () => {
  expect(tile.usable).toBe(true);
  expect(tile.specialRegions.every((r) => r.runtimeReady)).toBe(true);
  expect(approvedExtraRuinsTileSchema.safeParse({ ...tile, usable: false }).success).toBe(false);
  expect(
    approvedExtraRuinsTileSchema.safeParse({
      ...tile,
      specialRegions: tile.specialRegions.map((r) => ({ ...r, runtimeReady: false })),
    }).success,
  ).toBe(false);
  expect(
    roomTileBattleAreas(tile)
      .filter((a) => a.ancestorGlory)
      .map((a) => a.id),
  ).toEqual(["A4"]);
  for (const changed of [
    { ...tile, usable: false },
    { ...tile, specialRegions: tile.specialRegions.map((r) => ({ ...r, status: "candidate" })) },
  ])
    expect(roomTileBattleAreas(changed).some((a) => a.ancestorGlory)).toBe(false);
});
it("站立英雄立即移除五种已有状态，保留其他状态、疾病／怪癖与生命；怪物不受益", () => {
  const initial = setup(),
    entities = initial.battle!.entities.map((e) => ({
      ...e,
      statusStacks: [...negative, ...positive],
    }));
  const before = structuredClone(entities);
  const state = createBattleState(1, { ...initial.battle!, entities });
  expect(hero(state).statusStacks).toEqual(positive);
  expect(hero(state).wounds).toBe(0);
  expect(hero(state)).toMatchObject({
    buffStacks: 1,
    guard: true,
    protection: true,
    riposte: true,
    debuffStacks: 0,
    markStacks: 0,
  });
  expect(state.battle!.entities.find((e) => e.id === "m")!.statusStacks).toEqual([
    ...negative,
    ...positive,
  ]);
  expect(state.battle!.entities.find((e) => e.id === "h1")!.statusStacks).toEqual([
    ...negative,
    ...positive,
  ]);
  expect(entities).toEqual(before);
});
it("目标负面状态及Shuffle在A4免疫，怪物真实Dead Weight不移英雄、不触发位移被动", () => {
  const state = setup(),
    before = structuredClone(state);
  expect(readHeroPassiveDefence(state.battle!, hero(state))!.immunities).toEqual(
    ANCESTOR_CONDITIONS,
  );
  const rolled = applyCommand(state, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "h0",
    skillSlot: 2,
  });
  expect(
    rolled.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(rolled.events),
  ).toEqual([]);
  const done = applyCommand(rolled.state, { type: "resolveShuffles" });
  expect(
    done.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(done.events),
  ).toEqual([]);
  expect(hero(done.state)).toMatchObject({ areaId: "A4", stance: "aggressive", statusStacks: [] });
  expect(done.events.some((e) => e.type === "shuffleResolved")).toBe(false);
  expect(done.events.some((e) => e.type === "passiveTriggered" && e.trigger === "shuffled")).toBe(
    false,
  );
  expect(state).toEqual(before);
});
it("实际移动入A4立即清理，离开后不保留免疫，移动与光环都不耗骰", () => {
  const base = applyCommand(setup("A2"), { type: "startBattle" }).state;
  const state: GameState = {
    ...base,
    battle: {
      ...base.battle!,
      entities: base.battle!.entities.map((e) =>
        e.id === "h0" ? { ...e, statusStacks: negative } : e,
      ),
      encounter: {
        ...base.battle!.encounter!,
        turn: { type: "hero", actorId: "h0", actions: 2, usedSkillIds: [], mustMove: false },
      },
    },
  };
  const entered = applyCommand(state, { type: "moveHero", actorId: "h0", path: ["A4"] });
  expect(
    entered.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(entered.events),
  ).toBe(false);
  expect(hero(entered.state).statusStacks).toEqual([]);
  expect(entered.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  const left = applyCommand(entered.state, { type: "moveHero", actorId: "h0", path: ["A2"] });
  expect(
    left.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(left.events),
  ).toBe(false);
  expect(ancestorGlory(left.state.battle!.areas, hero(left.state))).toBe(false);
  expect(readHeroPassiveDefence(left.state.battle!, hero(left.state))!.immunities).toEqual([]);
});
it("R20自身Bulwark标记忽略免疫后由站立效果移除，Protection保持", () => {
  const state = setup();
  const result = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "h0",
    skillId: "hero_skill:p010",
  });
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(hero(result.state).statusStacks).toEqual([{ kind: "protection", remaining: 2 }]);
  expect(hero(result.state).markStacks).toBe(0);
});
it("R20自身Point Blank Shuffle不被光环免疫，落空也能离区，无永久免疫", () => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 10)!;
  const state = setup("A4", "HIGHWAYMAN", seed);
  let result = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h0",
    targetId: "m",
    skillId: "hero_skill:p070",
  });
  result = applyCommand(result.state, { type: "resolveShuffles" });
  if (result.pendingChoice)
    result = applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: "A2",
    });
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(hero(result.state).areaId).toBe("A2");
  expect(readHeroPassiveDefence(result.state.battle!, hero(result.state))!.immunities).toEqual([]);
  expect(result.state.battle!.rngCursor).toBe(1);
});

it("实际目标Shuffle落入A4立即移除此前状态，不等结束回合", () => {
  const seed = Array.from({ length: 100 }, (_, i) => i).find((s) => nextBattleRoll(s, 0) === 1)!;
  const initial = setup("A2", "CRUSADER", seed);
  const state = createBattleState(seed, {
    ...initial.battle!,
    entities: initial.battle!.entities.map((e) =>
      e.id === "h0" ? { ...e, statusStacks: negative } : e.id === "m" ? { ...e, areaId: "A2" } : e,
    ),
  });
  const rolled = applyCommand(state, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "h0",
    skillSlot: 2,
  });
  let result = applyCommand(rolled.state, { type: "resolveShuffles" });
  if (result.pendingChoice)
    result = applyCommand(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: "A4",
    });
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  expect(hero(result.state).areaId).toBe("A4");
  expect(hero(result.state).statusStacks).toEqual([]);
  expect(ancestorGlory(result.state.battle!.areas, hero(result.state))).toBe(true);
  expect(result.state.battle!.rngCursor).toBe(1);
});
