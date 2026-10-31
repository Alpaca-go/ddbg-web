import { expect, it, describe } from "vitest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { applyCommand, type Command, type GameState } from "../command";
import {
  applyMammothCystBulgingGaze,
  applyMammothCystDigestion,
  MAMMOTH_BULGING_GAZE_SKILL_SLOT,
  MAMMOTH_DIGESTION_SKILL_SLOT,
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

  it("Bulging Gaze · Crowded", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    const game = onMammothTurn(withHeroAreas(base, patch));
    const result = applyMammothCystBulgingGaze(game, mammoth(game).id);
    const refused = result.events.filter((e) => e.type === "commandRefused");
    expect(refused, JSON.stringify(refused)).toEqual([]);
    expect(
      result.events.some(
        (event) =>
          event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
      ),
    ).toBe(true);
  });

  it("Digestion · Crowded", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    const game = onMammothTurn(withHeroAreas(base, patch));
    const result = applyMammothCystDigestion(game, mammoth(game).id);
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
      ),
    ).toBe(true);
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

  it("applyCommand 白名单", () => {
    const base = fighting();
    const heroes = base.battle!.entities.filter((entity) => entity.side === "hero");
    const patch = Object.fromEntries(heroes.map((hero) => [hero.id, HERO_SUP]));
    const state = onMammothTurn(withHeroAreas(base, patch));
    const result = applyCommand(state, {
      type: "applyMammothCystDigestion",
      actorId: mammoth(state).id,
    });
    expect(result.events.some((event) => event.type === "commandRefused")).toBe(false);
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
  });
});
