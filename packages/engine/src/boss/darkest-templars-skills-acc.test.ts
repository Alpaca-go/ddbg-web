import { expect, it, describe } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { selectMonsterTarget } from "../monster-target";
import {
  applyTemplarImpalerBodySlam,
  applyTemplarImpalerRevelation,
  applyTemplarImpalerTorment,
  applyTemplarWarlordRevelation,
  applyTemplarWarlordStingerShot,
  TEMPLAR_BODY_SLAM_SKILL_SLOT,
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_REVELATION_SKILL_SLOT,
  TEMPLAR_STINGER_SHOT_SKILL_SLOT,
  TEMPLAR_TORMENT_SKILL_SLOT,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./darkest-templars-skills-acc";
import { readDarkestBossEncounter } from "./darkest-content";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";

const HERO_AGG = "darkest-mid-boss-hero-aggressive";
const HERO_RNG = "darkest-mid-boss-hero-ranged";
const HERO_SUP = "darkest-mid-boss-hero-support";
const MON_AGG = "darkest-mid-boss-aggressive";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result;
}

function deployed() {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p017", "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const battlePrep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(battlePrep.state, { type: "prepareDungeonMonsters" }).state;
}

function fighting(): GameState {
  const base = ok(deployed(), { type: "deployDarkestMidBoss" }).state;
  return ok(base, { type: "startBattle" }).state;
}

function monsterByCard(state: GameState, cardId: string) {
  return state.battle!.entities.find((entity) => entity.monsterCardId === cardId)!;
}

function onMonsterTurn(state: GameState, cardId: string): GameState {
  const actor = monsterByCard(state, cardId);
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

function withHeroAreas(state: GameState, patch: Readonly<Record<string, string>>): GameState {
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

describe("Templars Acc 最小结算", () => {
  it("encounter combatReady 仍为 false", () => {
    expect(readDarkestBossEncounter("quest:p017")!.combatReady).toBe(false);
  });

  it("Impaler Torment · Crowded（range 2 内）", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const patch = Object.fromEntries(
      heroes.map((hero, index) => [hero.id, index < 2 ? HERO_RNG : HERO_SUP]),
    );
    const game = onMonsterTurn(withHeroAreas(base, patch), TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const result = applyTemplarImpalerTorment(game, monsterByCard(game, TEMPLAR_IMPALER_MONSTER_CARD_ID).id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
      ),
    ).toBe(true);
  });

  it("Impaler Body Slam · Closest 1", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
    );
    const result = applyTemplarImpalerBodySlam(
      game,
      monsterByCard(game, TEMPLAR_IMPALER_MONSTER_CARD_ID).id,
    );
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.targetId).toBe(hero.id);
    }
  });

  it("Warlord Stinger Shot · Furthest 2 内", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const warlord = monsterByCard(base, TEMPLAR_WARLORD_MONSTER_CARD_ID);
    const patch = Object.fromEntries(heroes.map((hero, index) => [hero.id, index === 0 ? MON_AGG : "darkest-mid-boss-defensive"]));
    const game = onMonsterTurn(withHeroAreas(base, patch), TEMPLAR_WARLORD_MONSTER_CARD_ID);
    const furthestHero = heroes.find((hero) => patch[hero.id] === MON_AGG)!;

    const result = applyTemplarWarlordStingerShot(game, warlord.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.targetId).toBe(furthestHero.id);
    }
  });

  it("Warlord Revelation · Closest 1 · 命中 +2 压力", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const warlord = monsterByCard(base, TEMPLAR_WARLORD_MONSTER_CARD_ID);
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === TEMPLAR_WARLORD_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === TEMPLAR_REVELATION_SKILL_SLOT)?.verified_monster_effects
        ?.effects,
    ).toEqual([{ type: "stress", scope: "target", amount: 2 }]);

    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const stressBefore = hero.stress ?? 0;
    let game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_WARLORD_MONSTER_CARD_ID,
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        light: 5,
        entities: game.battle!.entities.map((entity) => {
          if (entity.id === hero.id) return { ...entity, dodge: 0, stress: stressBefore };
          if (entity.id === warlord.id)
            return { ...entity, areaId: "darkest-mid-boss-aggressive" };
          return entity;
        }),
      },
    };
    const result = applyTemplarWarlordRevelation(game, warlord.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("hit");
      expect(skillEvent.resolution.targetStress).toBe(2);
    }
    expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
      stressBefore + 2,
    );
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("Warlord Revelation · 落空无压力效果", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const warlord = monsterByCard(base, TEMPLAR_WARLORD_MONSTER_CARD_ID);
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 10) cursor += 1;
    const stressBefore = hero.stress ?? 0;
    let game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_WARLORD_MONSTER_CARD_ID,
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        entities: game.battle!.entities.map((entity) => {
          if (entity.id === hero.id) return { ...entity, dodge: 30, stress: stressBefore };
          if (entity.id === warlord.id)
            return { ...entity, areaId: "darkest-mid-boss-aggressive" };
          return entity;
        }),
      },
    };
    const result = applyTemplarWarlordRevelation(
      game,
      monsterByCard(game, TEMPLAR_WARLORD_MONSTER_CARD_ID).id,
    );
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("miss");
      expect(skillEvent.resolution.targetStress).toBe(0);
    }
    expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
      stressBefore,
    );
  });

  it("Impaler Revelation · Closest 1 · 命中 +2 压力", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === TEMPLAR_IMPALER_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === TEMPLAR_REVELATION_SKILL_SLOT)?.verified_monster_effects
        ?.effects,
    ).toEqual([{ type: "stress", scope: "target", amount: 2 }]);

    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const stressBefore = hero.stress ?? 0;
    let game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        light: 5,
        entities: game.battle!.entities.map((entity) => {
          if (entity.id === hero.id) return { ...entity, dodge: 0, stress: stressBefore };
          if (entity.id === impaler.id)
            return { ...entity, areaId: "darkest-mid-boss-aggressive" };
          return entity;
        }),
      },
    };
    const result = applyTemplarImpalerRevelation(game, impaler.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("hit");
      expect(skillEvent.resolution.targetStress).toBe(2);
    }
    expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
      stressBefore + 2,
    );
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("Impaler Revelation · 落空无压力效果", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 10) cursor += 1;
    const stressBefore = hero.stress ?? 0;
    let game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        entities: game.battle!.entities.map((entity) => {
          if (entity.id === hero.id) return { ...entity, dodge: 30, stress: stressBefore };
          if (entity.id === impaler.id)
            return { ...entity, areaId: "darkest-mid-boss-aggressive" };
          return entity;
        }),
      },
    };
    const result = applyTemplarImpalerRevelation(
      game,
      monsterByCard(game, TEMPLAR_IMPALER_MONSTER_CARD_ID).id,
    );
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("miss");
      expect(skillEvent.resolution.targetStress).toBe(0);
    }
    expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
      stressBefore,
    );
  });

  it("Acc 失手可复现", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 10) cursor += 1;
    let game = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
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
    const result = applyTemplarImpalerBodySlam(
      game,
      monsterByCard(game, TEMPLAR_IMPALER_MONSTER_CARD_ID).id,
    );
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(skillEvent?.type).toBe("monsterSkillResolved");
    if (skillEvent?.type === "monsterSkillResolved") {
      expect(skillEvent.resolution.outcome).toBe("miss");
    }
    expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.wounds).toBe(
      woundsBefore,
    );
  });

  it("applyCommand · applyTemplarWarlordRevelation", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const warlord = monsterByCard(base, TEMPLAR_WARLORD_MONSTER_CARD_ID);
    let state = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_WARLORD_MONSTER_CARD_ID,
    );
    state = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((entity) =>
          entity.id === warlord.id ? { ...entity, areaId: "darkest-mid-boss-aggressive" } : entity,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "applyTemplarWarlordRevelation",
      actorId: warlord.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  });

  it("applyCommand · applyTemplarImpalerRevelation", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    let state = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
    );
    state = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((entity) =>
          entity.id === impaler.id ? { ...entity, areaId: "darkest-mid-boss-aggressive" } : entity,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "applyTemplarImpalerRevelation",
      actorId: impaler.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  });

  it("非 Templars 遭遇或错误实体拒绝", () => {
    const game = onMonsterTurn(fighting(), TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const wrongQuest: GameState = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        questDistribution: { questId: "quest:p016", source: "fixture", counts: [] },
      },
    };
    expect(
      applyTemplarImpalerTorment(
        wrongQuest,
        monsterByCard(wrongQuest, TEMPLAR_IMPALER_MONSTER_CARD_ID).id,
      ).events.some((event) => event.type === "commandRefused"),
    ).toBe(true);
    expect(
      applyTemplarWarlordStingerShot(
        game,
        monsterByCard(game, TEMPLAR_IMPALER_MONSTER_CARD_ID).id,
      ).events.some((event) => event.type === "commandRefused"),
    ).toBe(true);
  });

  it("applyCommand 白名单", () => {
    const base = fighting();
    const hero = base.battle!.entities.find((entity) => entity.side === "hero")!;
    const impaler = monsterByCard(base, TEMPLAR_IMPALER_MONSTER_CARD_ID);
    const state = onMonsterTurn(
      withHeroAreas(base, { [hero.id]: HERO_SUP }),
      TEMPLAR_IMPALER_MONSTER_CARD_ID,
    );
    const result = applyCommand(state, {
      type: "applyTemplarImpalerBodySlam",
      actorId: impaler.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
  });

  it("卡面 slot 常量", () => {
    const card = fighting().dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === TEMPLAR_IMPALER_MONSTER_CARD_ID,
    )!;
    expect(card.skills.find((skill) => skill.slot === TEMPLAR_TORMENT_SKILL_SLOT)?.name).toBe(
      "Torment",
    );
    expect(card.skills.find((skill) => skill.slot === TEMPLAR_BODY_SLAM_SKILL_SLOT)?.name).toBe(
      "Body Slam",
    );
    const warlord = fighting().dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === TEMPLAR_WARLORD_MONSTER_CARD_ID,
    )!;
    expect(
      warlord!.skills.find((skill) => skill.slot === TEMPLAR_STINGER_SHOT_SKILL_SLOT)?.name,
    ).toBe("Stinger Shot");
    const cardView = card;
    const heroes = [{ id: "h0", areaId: HERO_RNG, stance: "aggressive" as const, areaDistance: 2, wounds: 0, stress: 0, markStacks: 0, guard: false, dead: false }];
    expect(
      selectMonsterTarget(
        {
          verification: cardView.verification,
          skills: cardView.skills.map((skill) => ({ slot: skill.slot, target: skill.target ?? null })),
        },
        TEMPLAR_TORMENT_SKILL_SLOT,
        heroes,
      ).status,
    ).toBe("selected");
  });
});
