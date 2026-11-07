import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { ensureDarkestMidBossScriptsRegistered } from "./boss/darkest-mid-boss-scripts";
import {
  TEMPLAR_IMPALER_MONSTER_CARD_ID,
  TEMPLAR_REVELATION_SKILL_SLOT,
  TEMPLAR_WARLORD_MONSTER_CARD_ID,
} from "./boss/darkest-templars-skills-acc";
import { nextBattleRoll } from "./battle-roll";

const ok = (game: GameState, command: Command) => {
  const result = applyCommand(game, command);
  expect(
    result.events.filter((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
};

function deploy(questId: "quest:p016" | "quest:p017" | "quest:p018", command: Command) {
  ensureDarkestMidBossScriptsRegistered();
  const game = createCoreDungeonQuest(7, questId, "radiant", coreParty, coreQuestSources);
  const d = game.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const prep = ok(
    { ...game, dungeon: { ...d, phase: "awaitingRoom", position: room.id } },
    { type: "prepareDungeonBattle" },
  );
  return ok(ok(prep.state, command).state, { type: "startBattle" }).state;
}

function monsterTurn(state: GameState, cardId: string, rngCursor?: number): GameState {
  const actor = state.battle!.entities.find((entity) => entity.monsterCardId === cardId)!;
  return {
    ...state,
    battle: {
      ...state.battle!,
      ...(rngCursor === undefined ? {} : { rngCursor }),
      encounter: {
        round: 1,
        deck: ["hero", "monster"],
        actedIds: [],
        turn: { type: "monster", actorId: actor.id },
      },
    },
  };
}

/** 需要玩家选择落点/位移时，按公开 resolveChoice 继续；其余步骤由 autoMonsterTurn 自己完成。 */
function runAutoTurn(initial: GameState, actorId: string) {
  let state = initial;
  const events: string[] = [];
  for (let guard = 0; guard < 8; guard++) {
    const result = applyCommand(state, { type: "autoMonsterTurn", actorId });
    expect(
      result.events.filter((event) => event.type === "commandRefused"),
      JSON.stringify(result.events),
    ).toEqual([]);
    events.push(...result.events.map((event) => event.type));
    state = result.state;
    const pending = state.battle?.pending;
    if (!pending) return { state, events };
    state = ok(state, {
      type: "resolveChoice",
      choiceId: pending.choice.id,
      optionId: pending.choice.options[0]!.id,
    }).state;
  }
  throw new Error("自动回合没有收敛");
}

it("Templars I：两只 Templar 的回合都能一键跑完，落点仍由玩家选", () => {
  const started = deploy("quest:p017", { type: "deployTemplarsI" });
  for (const cardId of [TEMPLAR_IMPALER_MONSTER_CARD_ID, TEMPLAR_WARLORD_MONSTER_CARD_ID]) {
    const actor = started.battle!.entities.find((entity) => entity.monsterCardId === cardId)!;
    const run = runAutoTurn(monsterTurn(started, cardId), actor.id);
    expect(run.events, cardId).toContain("turnEnded");
    expect(run.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(run.state.battle!.monsterAction).toBeNull();
  }
});

it("Shuffling Horror / Mammoth Cyst：自动回合完成", () => {
  const horror = deploy("quest:p016", { type: "deployShufflingHorrorI" });
  const horrorActor = horror.battle!.entities.find((entity) => entity.side === "monster")!;
  const horrorRun = runAutoTurn(monsterTurn(horror, horrorActor.monsterCardId!), horrorActor.id);
  expect(horrorRun.events).toContain("turnEnded");

  const mammoth = deploy("quest:p018", { type: "deployMammothCystI" });
  const mammothActor = mammoth.battle!.entities.find(
    (entity) => entity.monsterCardId === "monster_large:p016",
  )!;
  const mammothRun = runAutoTurn(monsterTurn(mammoth, "monster_large:p016"), mammothActor.id);
  expect(mammothRun.events).toContain("turnEnded");
});

it("Mammoth Revivify：选招命中 slot 3 时走自身技能分支并结束回合", () => {
  const mammoth = deploy("quest:p018", { type: "deployMammothCystI" });
  const actor = mammoth.battle!.entities.find(
    (entity) => entity.monsterCardId === "monster_large:p016",
  )!;
  const cursor = Array.from({ length: 200 }, (_, index) => index).find((value) => {
    const roll = nextBattleRoll(mammoth.seed, value);
    return roll >= 9 && roll <= 10;
  })!;
  const run = runAutoTurn(monsterTurn(mammoth, "monster_large:p016", cursor), actor.id);
  expect(run.events).toContain("turnEnded");
  expect(run.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
});

it("需要玩家决定的位移不替玩家选：返回 pending，不施放技能", () => {
  const started = deploy("quest:p017", { type: "deployTemplarsI" });
  const actor = started.battle!.entities.find(
    (entity) => entity.monsterCardId === TEMPLAR_WARLORD_MONSTER_CARD_ID,
  )!;
  const hero = started.battle!.entities.find((entity) => entity.side === "hero" && !entity.dead)!;
  const withAction: GameState = {
    ...monsterTurn(started, TEMPLAR_WARLORD_MONSTER_CARD_ID),
    battle: {
      ...monsterTurn(started, TEMPLAR_WARLORD_MONSTER_CARD_ID).battle!,
      monsterAction: {
        actorId: actor.id,
        skillSlot: TEMPLAR_REVELATION_SKILL_SLOT,
        targetId: hero.id,
        selectionRoll: null,
      },
    },
  };
  const result = applyCommand(withAction, { type: "autoMonsterTurn", actorId: actor.id });
  expect(
    result.events.filter((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  expect(result.pendingChoice).toBeDefined();
  expect(result.state.battle?.pending?.type).toBe("monsterMove");
  expect(result.events.some((event) => event.type === "turnEnded")).toBe(false);
});

it("不是当前怪物回合时拒绝", () => {
  const started = deploy("quest:p017", { type: "deployTemplarsI" });
  const hero = started.battle!.entities.find((entity) => entity.side === "hero")!;
  const result = applyCommand(started, { type: "autoMonsterTurn", actorId: hero.id });
  expect(result.events[0]).toMatchObject({ type: "commandRefused" });
});
