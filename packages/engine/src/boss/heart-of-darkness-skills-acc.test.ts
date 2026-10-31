import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { distance } from "../battle";
import { selectMonsterTarget } from "../monster-target";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import {
  HEART_OF_DARKNESS_MONSTER_CARD_ID,
} from "./heart-of-darkness-impending-doom";
import {
  applyHeartOfDarknessDissolution,
  applyHeartOfDarknessKnowThis,
  applyHeartOfDarknessPuncture,
  DISSOLUTION_SKILL_SLOT,
  KNOW_THIS_SKILL_SLOT,
  PUNCTURE_SKILL_SLOT,
} from "./heart-of-darkness-skills-acc";

const HERO_SUPPORT = "final-hero-support";
const HERO_RANGED = "final-hero-ranged";

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p016") {
  const base = finalPreparationFixture(questId);
  const begun = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const state: GameState = {
    ...begun,
    dungeon: {
      ...begun.dungeon!,
      finalBattleProvisions: "ready",
      hamlet: { ...begun.dungeon!.hamlet!, phase: "preparationComplete", remainingDays: 0, day: 4 },
    },
  };
  return applyCommand(applyCommand(state, { type: "prepareFinalBattleForms" }).state, {
    type: "deployFinalBattleForm",
  }).state;
}

function killCurrentBoss(game: GameState): GameState {
  const sequence = readFinalFormSequence(game)!;
  return {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.map((entity) =>
        entity.monsterCardId === sequence.current!.actor.cardId
          ? { ...entity, dead: true }
          : entity,
      ),
      encounter: {
        round: 4,
        deck: [],
        actedIds: [],
        turn: { type: "finished", outcome: "victory" },
      },
    },
  };
}

function advanceFinalForm(game: GameState): GameState {
  const fought = applyCommand(game, { type: "startBattle" }).state;
  const finished = applyCommand(killCurrentBoss(fought), { type: "finishDungeonBattle" }).state;
  return applyCommand(finished, { type: "deployFinalBattleForm" }).state;
}

function heartOfDarknessDeployed(): GameState {
  let game = prepared("quest:p016");
  game = advanceFinalForm(game);
  game = advanceFinalForm(game);
  return game;
}

function heartOfDarknessFighting(): GameState {
  const deployed = heartOfDarknessDeployed();
  expect(readFinalFormSequence(deployed)!.current!.id).toBe("heartOfDarkness");
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function heart(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  )!;
}

function onHeartTurn(state: GameState): GameState {
  const actor = heart(state);
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

function withHeroAreas(
  state: GameState,
  patch: Readonly<Record<string, string>>,
): GameState {
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        entity.side === "hero" && patch[entity.id]
          ? { ...entity, areaId: patch[entity.id]! }
          : entity,
      ),
    },
  };
}

function heroTargetRows(state: GameState) {
  const battle = state.battle!;
  const actor = heart(state);
  return battle.entities
    .filter((entry) => entry.side === "hero" && !entry.dead)
    .map((hero) => ({
      id: hero.id,
      areaId: hero.areaId,
      areaDistance: distance(battle.areas, actor.areaId, hero.areaId),
    }));
}

it("heartOfDarkness 形态 combatReady 仍为 false", () => {
  expect(readFinalFormSequence(heartOfDarknessDeployed())!.current!.combatReady).toBe(false);
});

it("Know This · Crowded 选最拥挤区英雄", () => {
  const fighting = heartOfDarknessFighting();
  const heroes = fighting.battle!.entities.filter((entity) => entity.side === "hero");
  const crowdedArea = HERO_SUPPORT;
  const patch = Object.fromEntries(
    heroes.map((hero, index) => [hero.id, index < 2 ? crowdedArea : HERO_RANGED]),
  );
  const game = onHeartTurn(withHeroAreas(fighting, patch));
  const card = game.battle!.monsters!.find((entry) => entry.id === HEART_OF_DARKNESS_MONSTER_CARD_ID)!;
  const rows = heroTargetRows(game);
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    KNOW_THIS_SKILL_SLOT,
    rows.map((row) => {
      const heroEntity = game.battle!.entities.find((entity) => entity.id === row.id)!;
      return {
        id: row.id,
        areaId: row.areaId,
        stance: heroEntity.stance!,
        areaDistance: row.areaDistance!,
        wounds: heroEntity.wounds,
        stress: heroEntity.stress!,
        markStacks: heroEntity.markStacks ?? 0,
        guard: heroEntity.guard,
        dead: heroEntity.dead,
      };
    }),
  );
  expect(picked.status).toBe("selected");
  expect(
    game.battle!.entities.filter(
      (entity) => entity.side === "hero" && entity.areaId === crowdedArea,
    ).length,
  ).toBe(2);

  const result = applyHeartOfDarknessKnowThis(game, heart(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
    ),
  ).toBe(true);
});

it("Puncture · Closest 须同区", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const game = onHeartTurn(withHeroAreas(fighting, { [hero.id]: heart(fighting).areaId }));
  const placed = game.battle!.entities.find((entity) => entity.id === hero.id)!;
  expect(distance(game.battle!.areas, heart(game).areaId, placed.areaId)).toBe(0);

  const result = applyHeartOfDarknessPuncture(game, heart(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
  expect(skillEvent?.type).toBe("monsterSkillResolved");
  if (skillEvent?.type === "monsterSkillResolved") {
    expect(skillEvent.resolution.targetId).toBe(hero.id);
  }
});

it("Dissolution · Furthest 选最远英雄", () => {
  const fighting = heartOfDarknessFighting();
  const heroes = fighting.battle!.entities.filter((entity) => entity.side === "hero");
  const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_RANGED]));
  let game = onHeartTurn(withHeroAreas(fighting, patch));
  const near = heroes[0]!;
  game = withHeroAreas(game, { [near.id]: HERO_SUPPORT });
  const furthestDistance = Math.max(...heroTargetRows(game).map((row) => row.areaDistance ?? -1));
  const expected = heroTargetRows(game).filter((row) => row.areaDistance === furthestDistance)[0]!;

  const result = applyHeartOfDarknessDissolution(game, heart(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
  expect(skillEvent?.type).toBe("monsterSkillResolved");
  if (skillEvent?.type === "monsterSkillResolved") {
    expect(skillEvent.resolution.targetId).toBe(expected.id);
  }
});

it("Acc 失手：高 Dodge + 低骰可复现", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  let cursor = 0;
  while (nextBattleRoll(fighting.seed, cursor) !== 10) cursor += 1;
  let game = onHeartTurn(
    withHeroAreas(fighting, {
      [hero.id]: heart(fighting).areaId,
    }),
  );
  game = {
    ...game,
    battle: {
      ...game.battle!,
      rngCursor: cursor,
      entities: game.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, dodge: 30 } : entity,
      ),
    },
  };
  const woundsBefore = hero.wounds;
  const a = applyHeartOfDarknessPuncture(game, heart(game).id);
  const b = applyHeartOfDarknessPuncture(game, heart(game).id);
  expect(a.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(b.events.some((event) => event.type === "commandRefused")).toBe(false);
  const eventA = a.events.find((event) => event.type === "monsterSkillResolved");
  const eventB = b.events.find((event) => event.type === "monsterSkillResolved");
  expect(eventA?.type).toBe("monsterSkillResolved");
  expect(eventB?.type).toBe("monsterSkillResolved");
  if (eventA?.type === "monsterSkillResolved" && eventB?.type === "monsterSkillResolved") {
    expect(eventA.resolution.outcome).toBe("miss");
    expect(eventB.resolution.outcome).toBe(eventA.resolution.outcome);
    expect(eventA.roll).toBe(10);
  }
  const after = a.state.battle!.entities.find((entity) => entity.id === hero.id)!;
  expect(after.wounds).toBe(woundsBefore);
});

it("非 heartOfDarkness 形态或非 Heart 回合拒绝", () => {
  const onTurn = onHeartTurn(heartOfDarknessFighting());
  const wrongForm: GameState = {
    ...onTurn,
    dungeon: {
      ...onTurn.dungeon!,
      finalFormSequence: {
        completedForms: ["heartOfDarkness"],
        status: "fighting",
      },
    },
  };
  expect(
    applyHeartOfDarknessKnowThis(wrongForm, heart(wrongForm).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);

  const heroTurn: GameState = {
    ...onTurn,
    battle: {
      ...onTurn.battle!,
      encounter: {
        ...onTurn.battle!.encounter!,
        turn: {
          type: "hero",
          actorId: onTurn.battle!.entities.find((entity) => entity.side === "hero")!.id,
          actions: 2,
          usedSkillIds: [],
        },
      },
    },
  };
  expect(
    applyHeartOfDarknessPuncture(heroTurn, heart(heroTurn).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});

it("显式命令经 applyCommand 接线", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const state = onHeartTurn(withHeroAreas(fighting, { [hero.id]: heart(fighting).areaId }));
  const result = applyCommand(state, {
    type: "applyHeartOfDarknessPuncture",
    actorId: heart(state).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
});

it("回归：finishTurn 仍触发 Impending Doom 落骰", () => {
  const fighting = heartOfDarknessFighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const cursor = fighting.battle!.rngCursor;
  let game = onHeartTurn(withHeroAreas(fighting, { [hero.id]: heart(fighting).areaId }));
  const expectedDie = nextBattleRoll(fighting.seed, cursor + 1);
  game = { ...game, battle: { ...game.battle!, rngCursor: cursor } };
  const result = applyHeartOfDarknessPuncture(game, heart(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  expect(result.state.battle!.impendingDoomDie).toBe(expectedDie);
  expect(result.state.battle!.rngCursor).toBeGreaterThanOrEqual(cursor + 2);
});

it("卡面 slot 常量与 monster_large:p020 一致", () => {
  const card = heartOfDarknessDeployed().dungeon!.battleCatalog!.monsters.find(
    (entry) => entry.id === HEART_OF_DARKNESS_MONSTER_CARD_ID,
  )!;
  expect(card.skills.find((skill) => skill.slot === KNOW_THIS_SKILL_SLOT)?.name).toBe("Know This");
  expect(card.skills.find((skill) => skill.slot === PUNCTURE_SKILL_SLOT)?.name).toBe("Puncture");
  expect(card.skills.find((skill) => skill.slot === DISSOLUTION_SKILL_SLOT)?.name).toBe(
    "Dissolution",
  );
});
