import { expect, it, describe } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import {
  applyMammothCystBulgingGaze,
  applyMammothCystDigestion,
  applyMammothCystRevivify,
  MAMMOTH_BULGING_GAZE_SKILL_SLOT,
  MAMMOTH_DIGESTION_SKILL_SLOT,
  MAMMOTH_REVIVIFY_SKILL_SLOT,
} from "./darkest-mammoth-cyst-skills-acc";
import { MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";
import { readDarkestBossEncounter } from "./darkest-content";
import { ensureDarkestMidBossScriptsRegistered } from "./darkest-mid-boss-scripts";
import { readMonsterAttackView, resolveMonsterSkill } from "../monster-skill";

const HERO_SUP = "darkest-mid-boss-hero-support";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(result.events.some((e) => e.type === "commandRefused"), JSON.stringify(result.events)).toBe(
    false,
  );
  return result;
}

function deployed() {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, "quest:p018", "radiant", coreParty, coreQuestSources);
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

function mammoth(state: GameState) {
  return state.battle!.entities.find(
    (entity) => entity.monsterCardId === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
  )!;
}

function onMammothTurn(state: GameState): GameState {
  const actor = mammoth(state);
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

describe("Mammoth Cyst Acc 最小结算", () => {
  it("encounter combatReady 仍为 false", () => {
    expect(readDarkestBossEncounter("quest:p018")!.combatReady).toBe(false);
  });

  it("Bulging Gaze · Crowded · 命中 debuff 1t + 压力 +1", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === MAMMOTH_BULGING_GAZE_SKILL_SLOT)?.verified_monster_effects
        ?.effects,
    ).toEqual([
      { type: "status", scope: "target", kind: "debuff", duration: 1 },
      { type: "stress", scope: "target", amount: 1 },
    ]);

    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let game = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(game);
    const stressBefore = Object.fromEntries(
      heroes.map((hero) => [hero.id, hero.stress ?? 0]),
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        light: 5,
        entities: game.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0 } : entity,
        ),
      },
    };
    const result = applyMammothCystBulgingGaze(game, actor.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type === "monsterSkillTargetsResolved") {
      expect(skillEvent.resolutions.every((resolution) => resolution.outcome === "hit")).toBe(true);
      expect(
        skillEvent.resolutions.every((resolution) =>
          (resolution.targetStatusEffects ?? []).some(
            (effect) => effect.kind === "debuff" && effect.duration === 1,
          ),
        ),
      ).toBe(true);
      expect(skillEvent.resolutions.every((resolution) => resolution.targetStress === 1)).toBe(true);
    }
    for (const hero of heroes.slice(0, 2)) {
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.statusStacks).toEqual([
        { kind: "debuff", remaining: 1 },
      ]);
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
        stressBefore[hero.id]! + 1,
      );
    }
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("Bulging Gaze · 落空无 debuff/压力", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 10) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let game = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(game);
    const stressBefore = Object.fromEntries(
      heroes.map((hero) => [hero.id, hero.stress ?? 0]),
    );
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        entities: game.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 30 } : entity,
        ),
      },
    };
    const result = applyMammothCystBulgingGaze(game, actor.id);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type === "monsterSkillTargetsResolved") {
      expect(skillEvent.resolutions.every((resolution) => resolution.outcome === "miss")).toBe(true);
      expect(
        skillEvent.resolutions.every(
          (resolution) => (resolution.targetStatusEffects ?? []).length === 0,
        ),
      ).toBe(true);
      expect(skillEvent.resolutions.every((resolution) => resolution.targetStress === 0)).toBe(true);
    }
    for (const hero of heroes) {
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.statusStacks ?? []).toEqual(
        [],
      );
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.stress).toBe(
        stressBefore[hero.id],
      );
    }
  });

  it("Digestion · Crowded · 命中 3 枯萎 2t", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === MAMMOTH_DIGESTION_SKILL_SLOT)?.verified_monster_effects
        ?.effects,
    ).toEqual([
      { type: "status", scope: "target", kind: "blight", amount: 3, duration: 2 },
    ]);

    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let game = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(game);
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        light: 5,
        entities: game.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0 } : entity,
        ),
      },
    };
    const result = applyMammothCystDigestion(game, actor.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type === "monsterSkillTargetsResolved") {
      expect(skillEvent.resolutions.every((resolution) => resolution.outcome === "hit")).toBe(true);
      expect(
        skillEvent.resolutions.every((resolution) =>
          (resolution.targetStatusEffects ?? []).some(
            (effect) => effect.kind === "blight" && effect.amount === 3 && effect.duration === 2,
          ),
        ),
      ).toBe(true);
    }
    for (const hero of heroes.slice(0, 2)) {
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.statusStacks).toEqual([
        { kind: "blight", amount: 3, remaining: 2 },
      ]);
    }
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("Digestion · 落空无枯萎", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 10) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let game = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(game);
    game = {
      ...game,
      battle: {
        ...game.battle!,
        rngCursor: cursor,
        entities: game.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 30 } : entity,
        ),
      },
    };
    const result = applyMammothCystDigestion(game, actor.id);
    const skillEvent = result.events.find((event) => event.type === "monsterSkillTargetsResolved");
    expect(skillEvent?.type).toBe("monsterSkillTargetsResolved");
    if (skillEvent?.type === "monsterSkillTargetsResolved") {
      expect(skillEvent.resolutions.every((resolution) => resolution.outcome === "miss")).toBe(true);
      expect(
        skillEvent.resolutions.every(
          (resolution) => (resolution.targetStatusEffects ?? []).length === 0,
        ),
      ).toBe(true);
    }
    for (const hero of heroes) {
      expect(result.state.battle!.entities.find((entity) => entity.id === hero.id)!.statusStacks ?? []).toEqual(
        [],
      );
    }
  });

  it("Revivify · Self · buff 2t + 治疗 15", () => {
    const base = fighting();
    const card = base.dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    )!;
    expect(
      card.skills.find((skill) => skill.slot === MAMMOTH_REVIVIFY_SKILL_SLOT)?.verified_monster_effects
        ?.effects,
    ).toEqual([
      { type: "status", scope: "self", kind: "buff", duration: 2 },
      { type: "heal", scope: "self", amount: 15 },
    ]);

    let game = onMammothTurn(base);
    const actor = mammoth(game);
    game = {
      ...game,
      battle: {
        ...game.battle!,
        entities: game.battle!.entities.map((entity) =>
          entity.id === actor.id ? { ...entity, wounds: 40 } : entity,
        ),
      },
    };
    const result = applyMammothCystRevivify(game, actor.id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    const resolved = result.events.find((event) => event.type === "monsterSkillResolved");
    expect(resolved?.type).toBe("monsterSkillResolved");
    const updated = result.state.battle!.entities.find((entity) => entity.id === actor.id)!;
    expect(updated.wounds).toBe(25);
    expect(updated.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("Revivify · 非 Mammoth 回合 / 错误实体拒绝", () => {
    const game = onMammothTurn(fighting());
    const hero = game.battle!.entities.find((entity) => entity.side === "hero")!;
    expect(
      applyMammothCystRevivify(game, hero.id).events.some((event) => event.type === "commandRefused"),
    ).toBe(true);
    const heroTurn: GameState = {
      ...game,
      battle: {
        ...game.battle!,
        encounter: {
          round: 1,
          deck: ["hero", "monster"],
          actedIds: [],
          turn: { type: "hero", actorId: hero.id, actions: 1, usedSkillIds: [] },
        },
      },
    };
    expect(
      applyMammothCystRevivify(heroTurn, mammoth(heroTurn).id).events.some(
        (event) => event.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("applyCommand · applyMammothCystRevivify", () => {
    let state = onMammothTurn(fighting());
    const actor = mammoth(state);
    state = {
      ...state,
      battle: {
        ...state.battle!,
        entities: state.battle!.entities.map((entity) =>
          entity.id === actor.id ? { ...entity, wounds: 10 } : entity,
        ),
      },
    };
    const result = applyCommand(state, { type: "applyMammothCystRevivify", actorId: actor.id });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.entities.find((entity) => entity.id === actor.id)!.wounds).toBe(0);
  });

  it("Revivify slot 3 无 Acc 伤害：不接 Acc 命令", () => {
    const card = fighting().dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    )!;
    const revivify = card!.skills.find((skill) => skill.slot === 3)!;
    expect(revivify.name).toBe("Revivify");
    expect(revivify.target).toBe("Self");
    expect(revivify.printed_labels.some((label) => label.label === "Acc")).toBe(false);
    const attack = readMonsterAttackView(card!, 3);
    expect(attack.status).toBe("ready");
    expect(
      resolveMonsterSkill(card!, 3, {
        actor: { id: "m", wounds: 0, shuffleResist: true },
        target: {
          id: "h0",
          side: "hero",
          wounds: 0,
          stress: 0,
          dodge: 0,
          markStacks: 0,
        },
        areaDistance: 0,
      }, 4),
    ).toMatchObject({
      status: "refused",
      reason: expect.stringContaining("damage"),
    });
  });

  it("非 Mammoth 遭遇拒绝", () => {
    const game = onMammothTurn(fighting());
    const wrong: GameState = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        questDistribution: { questId: "quest:p016", source: "fixture", counts: [] },
      },
    };
    expect(
      applyMammothCystBulgingGaze(wrong, mammoth(wrong).id).events.some(
        (event) => event.type === "commandRefused",
      ),
    ).toBe(true);
  });

  it("applyCommand · applyMammothCystBulgingGaze", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let state = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(state);
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: cursor,
        light: 5,
        entities: state.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0 } : entity,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "applyMammothCystBulgingGaze",
      actorId: actor.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("applyCommand · applyMammothCystDigestion", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    let cursor = 0;
    while (nextBattleRoll(base.seed, cursor) !== 5) cursor += 1;
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    let state = onMammothTurn(withHeroAreas(base, patch));
    const actor = mammoth(state);
    state = {
      ...state,
      battle: {
        ...state.battle!,
        rngCursor: cursor,
        light: 5,
        entities: state.battle!.entities.map((entity) =>
          entity.side === "hero" ? { ...entity, dodge: 0 } : entity,
        ),
      },
    };
    const result = applyCommand(state, {
      type: "applyMammothCystDigestion",
      actorId: actor.id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) => event.type === "dungeonUpdated" && event.message.includes("含 verified 效果线"),
      ),
    ).toBe(true);
  });

  it("卡面 slot 常量", () => {
    const card = fighting().dungeon!.battleCatalog!.monsters.find(
      (entry) => entry.id === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    )!;
    expect(card.skills.find((skill) => skill.slot === MAMMOTH_BULGING_GAZE_SKILL_SLOT)?.name).toBe(
      "Bulging Gaze",
    );
    expect(card.skills.find((skill) => skill.slot === MAMMOTH_DIGESTION_SKILL_SLOT)?.name).toBe(
      "Digestion",
    );
    expect(card.skills.find((skill) => skill.slot === MAMMOTH_REVIVIFY_SKILL_SLOT)?.name).toBe(
      "Revivify",
    );
  });
});
