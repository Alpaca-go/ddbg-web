import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { distance } from "../battle";
import { selectMonsterTarget } from "../monster-target";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import {
  FINAL_BATTLE_MONSTER_STANCE_AREAS,
} from "./final-battle-deploy";
import {
  ANCESTOR_2_MONSTER_CARD_ID,
} from "./ancestor2-swift-teleportation";
import { isAbsoluteNothingnessEntity } from "./ancestor2-absolute-nothingness";
import {
  applyAncestor2EmbraceFutility,
  applyAncestor2RefashionThem,
  applyAncestor2UnmakeThemAll,
  EMBRACE_FUTILITY_SKILL_SLOT,
  REFASHION_THEM_SKILL_SLOT,
  UNMAKE_THEM_ALL_SKILL_SLOT,
} from "./ancestor2-skills-acc";

const HERO_SUPPORT = "final-hero-support";
const HERO_RANGED = "final-hero-ranged";

const HERO_SUPPORT = "final-hero-support";
const HERO_RANGED = "final-hero-ranged";

function withoutAbsoluteNothingness(game: GameState): GameState {
  return {
    ...game,
    battle: {
      ...game.battle!,
      entities: game.battle!.entities.filter((entity) => !isAbsoluteNothingnessEntity(entity)),
    },
  };
}

function prepared(questId: "quest:p016" | "quest:p017" | "quest:p018" = "quest:p017") {
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

function ancestor2Deployed(): GameState {
  const game = prepared("quest:p017");
  expect(readFinalFormSequence(game)!.current!.id).toBe("ancestor2");
  return game;
}

function ancestor2Fighting(): GameState {
  const deployed = withoutAbsoluteNothingness(ancestor2Deployed());
  return applyCommand(deployed, { type: "startBattle" }).state;
}

function ancestor(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === ANCESTOR_2_MONSTER_CARD_ID,
  )!;
}

function onAncestorTurn(state: GameState): GameState {
  const actor = ancestor(state);
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
  const actor = ancestor(state);
  const card = battle.monsters!.find((entry) => entry.id === actor.monsterCardId)!;
  return battle.entities
    .filter((entry) => entry.side === "hero" && !entry.dead)
    .map((hero) => ({
      id: hero.id,
      areaId: hero.areaId,
      areaDistance: distance(battle.areas, actor.areaId, hero.areaId),
    }));
}

it("ancestor2 形态 combatReady 仍为 false", () => {
  expect(readFinalFormSequence(ancestor2Deployed())!.current!.combatReady).toBe(false);
});

it("Refashion Them · Crowded 选最拥挤区英雄", () => {
  const fighting = ancestor2Fighting();
  const heroes = fighting.battle!.entities.filter((entity) => entity.side === "hero");
  const crowdedArea = HERO_SUPPORT;
  const patch = Object.fromEntries(
    heroes.map((hero, index) => [hero.id, index < 2 ? crowdedArea : HERO_RANGED]),
  );
  const game = onAncestorTurn(withHeroAreas(fighting, patch));
  const card = game.battle!.monsters!.find((entry) => entry.id === ANCESTOR_2_MONSTER_CARD_ID)!;
  const rows = heroTargetRows(game);
  const picked = selectMonsterTarget(
    {
      verification: card.verification,
      skills: card.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
    },
    REFASHION_THEM_SKILL_SLOT,
    rows.map((row) => {
      const hero = game.battle!.entities.find((entity) => entity.id === row.id)!;
      return {
        id: row.id,
        areaId: row.areaId,
        stance: hero.stance!,
        areaDistance: row.areaDistance!,
        wounds: hero.wounds,
        stress: hero.stress!,
        markStacks: hero.markStacks ?? 0,
        guard: hero.guard,
        dead: hero.dead,
      };
    }),
  );
  expect(picked.status).toBe("selected");
  expect(
    game.battle!.entities.filter(
      (entity) => entity.side === "hero" && entity.areaId === crowdedArea,
    ).length,
  ).toBe(2);

  const result = applyAncestor2RefashionThem(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(
    result.events.some(
      (event) => event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
    ),
  ).toBe(true);
});

it("Unmake Them All · Furthest 选最远英雄", () => {
  const fighting = ancestor2Fighting();
  const heroes = fighting.battle!.entities.filter((entity) => entity.side === "hero");
  const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_RANGED]));
  let game = onAncestorTurn(withHeroAreas(fighting, patch));
  const near = heroes[0]!;
  game = withHeroAreas(game, { [near.id]: HERO_SUPPORT });
  const distances = heroTargetRows(game).map((row) => row.areaDistance ?? -1);
  const furthestDistance = Math.max(...distances);
  const expected = heroTargetRows(game).filter((row) => row.areaDistance === furthestDistance)[0]!;

  const result = applyAncestor2UnmakeThemAll(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
  expect(skillEvent?.type).toBe("monsterSkillResolved");
  if (skillEvent?.type === "monsterSkillResolved") {
    expect(skillEvent.resolution.targetId).toBe(expected.id);
  }
});

it("Embrace Futility · Closest 0 须同区", () => {
  const fighting = ancestor2Fighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  const game = onAncestorTurn(
    withHeroAreas(fighting, { [hero.id]: ancestor(fighting).areaId }),
  );
  const placed = game.battle!.entities.find((entity) => entity.id === hero.id)!;
  expect(distance(game.battle!.areas, ancestor(game).areaId, placed.areaId)).toBe(0);

  const result = applyAncestor2EmbraceFutility(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
  expect(skillEvent?.type).toBe("monsterSkillResolved");
  if (skillEvent?.type === "monsterSkillResolved") {
    expect(skillEvent.resolution.targetId).toBe(hero.id);
  }
});

it("Acc 失手：高 Dodge + 低骰可复现", () => {
  const fighting = ancestor2Fighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  let cursor = 0;
  while (nextBattleRoll(fighting.seed, cursor) !== 1) cursor += 1;
  let game = onAncestorTurn(
    withHeroAreas(fighting, {
      [hero.id]: ancestor(fighting).areaId,
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
  const a = applyAncestor2EmbraceFutility(game, ancestor(game).id);
  const b = applyAncestor2EmbraceFutility(game, ancestor(game).id);
  expect(a.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(b.events.some((event) => event.type === "commandRefused")).toBe(false);
  const eventA = a.events.find((event) => event.type === "monsterSkillResolved");
  const eventB = b.events.find((event) => event.type === "monsterSkillResolved");
  expect(eventA?.type).toBe("monsterSkillResolved");
  expect(eventB?.type).toBe("monsterSkillResolved");
  if (eventA?.type === "monsterSkillResolved" && eventB?.type === "monsterSkillResolved") {
    expect(eventA.resolution.outcome).toBe("miss");
    expect(eventB.resolution.outcome).toBe(eventA.resolution.outcome);
    expect(eventA.roll).toBe(1);
  }
  const after = a.state.battle!.entities.find((entity) => entity.id === hero.id)!;
  expect(after.wounds).toBe(woundsBefore);
});

it("非 ancestor2 形态或非 Ancestor 回合拒绝", () => {
  const onTurn = onAncestorTurn(ancestor2Fighting());
  const wrongForm: GameState = {
    ...onTurn,
    dungeon: {
      ...onTurn.dungeon!,
      finalFormSequence: {
        completedForms: ["ancestor2"],
        status: "fighting",
      },
    },
  };
  expect(
    applyAncestor2RefashionThem(wrongForm, ancestor(wrongForm).id).events.some(
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
    applyAncestor2UnmakeThemAll(heroTurn, ancestor(heroTurn).id).events.some(
      (event) => event.type === "commandRefused",
    ),
  ).toBe(true);
});

it("显式命令经 applyCommand 接线", () => {
  const hero = ancestor2Fighting().battle!.entities.find((entity) => entity.side === "hero")!;
  const state = onAncestorTurn(
    withHeroAreas(ancestor2Fighting(), { [hero.id]: ancestor(ancestor2Fighting()).areaId }),
  );
  const result = applyCommand(state, {
    type: "applyAncestor2EmbraceFutility",
    actorId: ancestor(state).id,
  });
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
});

it("回归：finishTurn 仍触发 Swift Teleportation 落骰", () => {
  const fighting = ancestor2Fighting();
  const hero = fighting.battle!.entities.find((entity) => entity.side === "hero")!;
  let cursor = 0;
  while (nextBattleRoll(fighting.seed, cursor) === 10) cursor += 1;
  const expectedDie = nextBattleRoll(fighting.seed, cursor + 1);
  let game = onAncestorTurn(
    withHeroAreas(fighting, { [hero.id]: ancestor(fighting).areaId }),
  );
  game = { ...game, battle: { ...game.battle!, rngCursor: cursor } };
  const before = ancestor(game);
  const result = applyAncestor2EmbraceFutility(game, ancestor(game).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  expect(result.state.battle!.rngCursor).toBeGreaterThanOrEqual(cursor + 2);
  if (expectedDie >= 1 && expectedDie <= 3) {
    expect(ancestor(result.state)).toMatchObject({
      stance: "defensive",
      areaId: FINAL_BATTLE_MONSTER_STANCE_AREAS.defensive,
    });
  } else if (expectedDie === 10) {
    expect(ancestor(result.state).areaId).toBe(before.areaId);
  }
});

it("卡面 slot 常量与 monster_large:p018 一致", () => {
  const card = ancestor2Deployed().dungeon!.battleCatalog!.monsters.find(
    (entry) => entry.id === ANCESTOR_2_MONSTER_CARD_ID,
  )!;
  expect(card.skills.find((skill) => skill.slot === REFASHION_THEM_SKILL_SLOT)?.name).toBe(
    "Refashion Them",
  );
  expect(card.skills.find((skill) => skill.slot === UNMAKE_THEM_ALL_SKILL_SLOT)?.name).toBe(
    "Unmake Them All",
  );
  expect(card.skills.find((skill) => skill.slot === EMBRACE_FUTILITY_SKILL_SLOT)?.name).toBe(
    "Embrace Futility",
  );
});
