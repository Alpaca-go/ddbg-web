import { describe, expect, it, beforeEach } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { resolveMonsterSkillEffects } from "../monster-skill";
import type { MonsterCardView } from "../monster-skill";
import {
  HAG_I_SCRIPT_ID,
  PROPHET_I_SCRIPT_ID,
  SIREN_I_SCRIPT_ID,
  COLLECTOR_I_SCRIPT_ID,
  FANATIC_I_SCRIPT_ID,
  FLESH_I_SCRIPT_ID,
  applyBossThreatBlackSheepBeforeHamletEvent,
  applyBossThreatCreepingSicknessEndOfHamletDay,
  applyBossThreatStressOnDungeonEntry,
  completeCurioRoomWithoutCurioDraw,
  ensureCoreBossScriptsRegistered,
  shouldSkipCurioDrawInCurioRoom,
} from "./index";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { rollHamletCaretaker } from "../hamlet-event";
import { currentHamletHero } from "../hamlet-actions";
import { readFileSync } from "node:fs";

const arbalist: MonsterCardView = JSON.parse(
  readFileSync(
    new URL("../../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards.find((card: MonsterCardView) => card.id === "monster_medium:p007");

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}

function finishProvisions(game: GameState) {
  let result = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  let state = result.state;
  while (result.pendingChoice) {
    result = applyCommand(state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    state = result.state;
  }
  expect(state.dungeon!.phase).toBe("ready");
  return state;
}

function hamletJourney(seed = 40) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  let result = applyCommand(game, { type: "rollDungeonProvisions" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = result.state;
  while (result.pendingChoice) {
    result = applyCommand(game, {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
  }
  result = applyCommand(game, { type: "leaveDungeon" });
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  game = ok(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "agree",
  });
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    game = ok(game, { type });
  return game;
}

describe("威胁被动运行时接线", () => {
  beforeEach(() => ensureCoreBossScriptsRegistered());

  it("Prophet I：进地牢命令路径每名英雄 +2 压力", () => {
    let game = createCoreDungeonQuest(902, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    game = finishProvisions(game);
    expect(game.dungeon!.heroes.every((h) => h.stress === 2)).toBe(true);
  });

  it("Prophet I：helper 进地牢压力可单独调用", () => {
    let game = createCoreDungeonQuest(903, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    const entry = applyBossThreatStressOnDungeonEntry(game);
    expect(entry.state.dungeon!.heroes.every((h: { stress: number }) => h.stress === 2)).toBe(true);
  });

  it("Prophet I：酒馆减压有效 −1", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: PROPHET_I_SCRIPT_ID });
    const heroId = game.dungeon!.hamlet!.heroOrder[0]!;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: { ...game.dungeon!.hamlet!, blockedBuildings: [], caretaker: "graveyard" },
        heroes: game.dungeon!.heroes.map((h) => (h.id === heroId ? { ...h, stress: 5 } : h)),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId: heroId,
      serviceId: "tavern3",
      quirkIds: [],
    });
    expect(game.dungeon!.heroes.find((h) => h.id === heroId)!.stress).toBe(3);
  });

  it("Hag I：疗养院 heal5 有效 Life −3（8 伤口 → 6）", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: HAG_I_SCRIPT_ID });
    const heroId = game.dungeon!.hamlet!.heroOrder[0]!;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: { ...game.dungeon!.hamlet!, blockedBuildings: [], caretaker: "graveyard" },
        heroes: game.dungeon!.heroes.map((h) =>
          h.id === heroId ? { ...h, wounds: 8, attributesVerified: true, life: 33 } : h,
        ),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId: heroId,
      serviceId: "heal5",
      quirkIds: [],
    });
    expect(game.dungeon!.heroes.find((h) => h.id === heroId)!.wounds).toBe(6);
  });

  it("Siren I：abbey 封锁并在清除威胁后 strip", () => {
    let game = hamletJourney();
    game = ok(game, { type: "setActiveBossThreat", scriptId: SIREN_I_SCRIPT_ID });
    expect(game.dungeon!.hamlet!.blockedBuildings).toContain("abbey");
    game = ok(game, { type: "setActiveBossThreat", scriptId: null });
    expect(game.dungeon!.hamlet!.blockedBuildings).not.toContain("abbey");
  });

  it("Swine Prince I：Beast 怪物攻击 threatFlatDamageBonus +2", () => {
    const beastCard: MonsterCardView = { ...arbalist, type_position_tags: ["Beast"] };
    const combat = {
      actor: { id: "m", wounds: 0 },
      target: { id: "h", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
      areaDistance: 2,
      light: 5,
    };
    const boosted = resolveMonsterSkillEffects(
      beastCard,
      1,
      { ...combat, threatFlatDamageBonus: 2 },
      8,
    );
    const plain = resolveMonsterSkillEffects(beastCard, 1, combat, 8);
    const boostedW = boosted.healthEffects.find((e) => e.source === "attack")!.effect;
    const plainW = plain.healthEffects.find((e) => e.source === "attack")!.effect;
    if (boostedW.type !== "wounds" || plainW.type !== "wounds") throw new Error("wounds");
    expect(boostedW.amounts[0]! - plainW.amounts[0]!).toBe(2);
  });

  it("rollHamletCaretaker 合并 Siren abbey 封锁", () => {
    const state = {
      seed: 904,
      notes: [],
      dungeon: {
        phase: "inHamlet",
        cursor: 0,
        heroes: coreParty.map((h, i) => ({ ...h, id: `hero-${i}`, attributesVerified: true })),
        activeBossThreatScriptId: SIREN_I_SCRIPT_ID,
        hamlet: {
          deck: [],
          permanentlyRemoved: [],
          active: null,
          last: "hamlet_event:p001",
          phase: "awaitingCaretaker",
          preparationDays: 1,
          day: 1,
          noCaretaker: false,
          extraBlock: false,
          caretaker: null,
          blockedBuildings: [],
          heroOrder: coreParty.map((_, i) => `hero-${i}`),
        },
      },
    } as unknown as GameState;
    expect(rollHamletCaretaker(state).state.dungeon!.hamlet!.blockedBuildings).toContain("abbey");
  });

  it("Collector I：激活威胁时跳过 Curio 房间抽牌", () => {
    let game = createCoreDungeonQuest(905, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: COLLECTOR_I_SCRIPT_ID });
    expect(shouldSkipCurioDrawInCurioRoom(game.dungeon!)).toBe(true);
    const roomId = game.dungeon!.rooms.find((r) => r.kind === "curio")?.id ?? game.dungeon!.position;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        position: roomId,
        phase: "awaitingRoom",
        curioRoom: { roomId, guardRoll: 8, stage: "reward" },
        rooms: game.dungeon!.rooms.map((r) =>
          r.id === roomId ? { ...r, kind: "curio" as const, cleared: false } : r,
        ),
      },
    };
    const skipped = completeCurioRoomWithoutCurioDraw(game);
    expect(skipped.state.dungeon!.phase).toBe("ready");
    expect(skipped.state.dungeon!.rooms.find((r) => r.id === roomId)!.cleared).toBe(true);
    expect("curioRoom" in skipped.state.dungeon!).toBe(false);
  });

  it("Fanatic I：drawHamletEvent 前 The Black Sheep 对 d10 最低者 +4 压力", () => {
    let game = createCoreDungeonQuest(906, "quest:p001", "standard", coreParty, coreQuestSources);
    let result = applyCommand(game, { type: "rollDungeonProvisions" });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
    while (result.pendingChoice) {
      result = applyCommand(game, {
        type: "resolveChoice",
        choiceId: result.pendingChoice.id,
        optionId: result.pendingChoice.options[0]!.id,
      });
      game = result.state;
    }
    result = applyCommand(game, { type: "leaveDungeon" });
    game = ok(result.state, {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: "agree",
    });
    for (const type of ["summarizeDungeonQuest", "beginReturnToHamlet", "finishReturnToHamlet"] as const)
      game = ok(game, { type });
    game = ok(game, { type: "setActiveBossThreat", scriptId: FANATIC_I_SCRIPT_ID });
    const before = game.dungeon!.heroes.map((h) => h.stress);
    game = ok(game, { type: "drawHamletEvent" });
    const after = game.dungeon!.heroes.map((h) => h.stress);
    expect(after.some((s, i) => s > before[i]!)).toBe(true);
    const delta = after.map((s, i) => s - before[i]!);
    expect(delta.filter((d) => d === 4).length).toBeGreaterThanOrEqual(1);
    expect(delta.every((d) => d === 0 || d === 4)).toBe(true);
  });

  it("Fanatic I：The Black Sheep helper 可单独调用", () => {
    let game = createCoreDungeonQuest(907, "quest:p001", "standard", coreParty, coreQuestSources);
    game = ok(game, { type: "setActiveBossThreat", scriptId: FANATIC_I_SCRIPT_ID });
    const result = applyBossThreatBlackSheepBeforeHamletEvent(game);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.dungeon!.heroes.some((h) => h.stress === 4)).toBe(true);
  });

  it("Flesh I：日末未访建筑累积伤口，访问时转移", () => {
    let game = hamletJourney(40);
    game = ok(game, { type: "setActiveBossThreat", scriptId: FLESH_I_SCRIPT_ID });
    const endDay = applyBossThreatCreepingSicknessEndOfHamletDay({
      ...game,
      dungeon: {
        ...game.dungeon!,
        hamlet: {
          ...game.dungeon!.hamlet!,
          phase: "awaitingCaretaker",
          visitedBuildings: ["tavern"],
        },
      },
    });
    expect(endDay.state.dungeon!.hamlet!.buildingWounds?.tavern).toBeUndefined();
    expect(endDay.state.dungeon!.hamlet!.buildingWounds?.sanitarium).toBe(1);

    game = ok(endDay.state, { type: "rollHamletCaretaker" });
    const actorId = currentHamletHero(game)!.id;
    game = {
      ...game,
      dungeon: {
        ...game.dungeon!,
        gold: 999,
        hamlet: {
          ...game.dungeon!.hamlet!,
          blockedBuildings: [],
          caretaker: "graveyard",
          visitedBuildings: [],
          buildingWounds: { tavern: 2 },
        },
        heroes: game.dungeon!.heroes.map((h) =>
          h.id === actorId
            ? { ...h, stress: 5, wounds: 0, attributesVerified: true, life: 33 }
            : h,
        ),
      },
    };
    game = ok(game, {
      type: "visitHamletBuilding",
      actorId,
      serviceId: "tavern3",
      quirkIds: [],
    });
    expect(game.dungeon!.hamlet!.buildingWounds?.tavern).toBeUndefined();
    expect(game.dungeon!.heroes.find((h) => h.id === actorId)!.wounds).toBe(2);
  });
});
