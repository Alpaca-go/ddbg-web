import { expect, it } from "vitest";
import { applyCommand, type ApplyResult, type Command, type GameState } from "../command";
import { nextBattleRoll } from "../battle-roll";
import { selectMonsterSkill } from "../monster-stance";
import { readFinalFormSequence } from "./final-form-sequence";
import { finalPreparationFixture } from "../test-helpers/final-preparation";
import {
  ANCESTOR_2_MONSTER_CARD_ID,
} from "./ancestor2-swift-teleportation";
import { isAbsoluteNothingnessEntity } from "./ancestor2-absolute-nothingness";
import {
  applyAncestor2SkillFromStanceSelection,
} from "./ancestor2-skill-ai";
import {
  EMBRACE_FUTILITY_SKILL_SLOT,
} from "./ancestor2-skills-acc";

function ok(state: GameState, command: Command): ApplyResult {
  const result = applyCommand(state, command);
  expect(result.events.filter((event) => event.type === "commandRefused")).toEqual([]);
  return result;
}

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

function ancestor2Fighting(): GameState {
  const deployed = withoutAbsoluteNothingness(prepared("quest:p017"));
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

function withHeroSameAreaAsAncestor(state: GameState): GameState {
  const hero = state.battle!.entities.find((entity) => entity.side === "hero")!;
  return {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((entity) =>
        entity.id === hero.id ? { ...entity, areaId: ancestor(state).areaId } : entity,
      ),
    },
  };
}

function alignSelectionRoll(state: GameState, slot: 1 | 2 | 3): GameState {
  const card = state.battle!.monsters!.find((entry) => entry.id === ANCESTOR_2_MONSTER_CARD_ID)!;
  const actor = ancestor(state);
  const stances = ["aggressive", "defensive", "ranged", "support"] as const;
  const position = stances.indexOf(actor.stance!);
  const occupied = stances.slice(position, position + actor.stanceSlots!);
  let cursor = state.battle!.rngCursor;
  for (let attempt = 0; attempt < 10_000; attempt += 1) {
    const pick = selectMonsterSkill(card, occupied, nextBattleRoll(state.seed, cursor));
    if (pick.status === "selected" && pick.skillSlot === slot) {
      return { ...state, battle: { ...state.battle!, rngCursor: cursor } };
    }
    cursor += 1;
  }
  throw new Error(`无法对齐 Ancestor 2 选招骰至 slot ${slot}`);
}

it("p018 卡面 stanceGroups 与 Fanatic III 同型 d10 分段", () => {
  const card = ancestor2Fighting().battle!.monsters!.find(
    (entry) => entry.id === ANCESTOR_2_MONSTER_CARD_ID,
  )!;
  expect(card.speed).toBe(3);
  expect(card.stanceGroups).toEqual([
    {
      stances: ["aggressive", "defensive", "ranged", "support"],
      rollTable: [
        { min: 1, max: 2, skill: 1 },
        { min: 3, max: 6, skill: 2 },
        { min: 7, max: 10, skill: 3 },
      ],
    },
  ]);
});

it("prepareMonsterAction · slot 3 走 Acc 显式命令并完成回合（含 Swift Teleportation）", () => {
  let game = onAncestorTurn(withHeroSameAreaAsAncestor(ancestor2Fighting()));
  game = alignSelectionRoll(game, 3);
  const cursorBefore = game.battle!.rngCursor;
  const before = structuredClone(game);
  const result = ok(game, { type: "prepareMonsterAction", actorId: ancestor(game).id });
  expect(game).toEqual(before);
  expect(
    result.events.some(
      (event) =>
        event.type === "dungeonUpdated" &&
        event.message.includes(`slot ${EMBRACE_FUTILITY_SKILL_SLOT}`) &&
        event.message.includes("姿态选招"),
    ),
  ).toBe(true);
  expect(
    result.events.some(
      (event) =>
        event.type === "monsterSkillResolved" || event.type === "monsterSkillTargetsResolved",
    ),
  ).toBe(true);
  expect(result.events.some((event) => event.type === "turnEnded")).toBe(true);
  expect(result.state.battle!.rngCursor).toBeGreaterThan(cursorBefore + 1);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  expect(readFinalFormSequence(result.state)!.current!.combatReady).toBe(false);
});

it("非 ancestor2 形态拒绝 applyAncestor2SkillFromStanceSelection", () => {
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
  const result = applyAncestor2SkillFromStanceSelection(wrongForm, ancestor(wrongForm).id);
  expect(result.events.some((event) => event.type === "commandRefused")).toBe(true);
});
