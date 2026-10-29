import { beforeEach, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { chooseNextQuest } from "../hamlet-embark";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import {
  ensureNecromancerIBossScriptRegistered,
  ensureProphetIBossScriptRegistered,
  FACE_THE_THREAT_QUEST_ID,
  NECROMANCER_I_COMBAT_MONSTER_CARD_ID,
  NECROMANCER_I_SCRIPT_ID,
  PROPHET_I_SCRIPT_ID,
  readStoredFaceTheThreatEmbarkPlan,
  resolveFaceTheThreatEmbarkForChoose,
} from "./index";

function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
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

function preparationReady(game: GameState): GameState {
  const d = game.dungeon!;
  return {
    ...game,
    dungeon: {
      ...d,
      pending: null,
      hamlet: {
        ...d.hamlet!,
        phase: "preparationComplete",
        remainingDays: 0,
        actedHeroes: [],
        visitedBuildings: [],
        heroOrder: [],
        caretaker: null,
        blockedBuildings: d.hamlet!.weekBlockedBuildings ?? [],
        active: null,
      },
    },
  };
}

function hamletReadyForFaceEmbark(game: GameState): GameState {
  const ready = preparationReady(game);
  const d = ready.dungeon!;
  const pending = {
    id: `hamlet-next-quest:${d.decision}`,
    actorId: "party",
    prompt: "Face the Threat 测试",
    options: [{ id: FACE_THE_THREAT_QUEST_ID, label: "Face the Threat!" }],
  };
  return {
    ...ready,
    dungeon: {
      ...d,
      pending,
      nextQuestOffers: [FACE_THE_THREAT_QUEST_ID],
      activeBossThreatScriptId: NECROMANCER_I_SCRIPT_ID,
      campaignLevel: 1,
    },
  };
}

describe("Face the Threat 出征 applyCommand 最小运行时", () => {
  beforeEach(() => {
    ensureNecromancerIBossScriptRegistered();
    ensureProphetIBossScriptRegistered();
  });

  it("chooseNextQuest：钩子 ok 写入 faceTheThreatEmbarkPlan", () => {
    const base = hamletReadyForFaceEmbark(hamletJourney());
    const cursorBefore = base.dungeon!.cursor;
    const result = chooseNextQuest(
      base,
      base.dungeon!.pending!.id,
      FACE_THE_THREAT_QUEST_ID,
    );
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    const plan = readStoredFaceTheThreatEmbarkPlan(result.state.dungeon);
    expect(plan?.resolvedScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
    expect(plan?.combatEntry.combatMonsterCardId).toBe(NECROMANCER_I_COMBAT_MONSTER_CARD_ID);
    expect(plan?.layoutWiringHold).toMatch(/R-121/);
    expect(result.state.dungeon!.phase).toBe("awaitingProvisions");
    expect(result.state.dungeon!.cursor).toBeGreaterThan(cursorBefore);
    expect(result.events.at(-1)?.message).toMatch(/Face the Threat→/);
  });

  it("chooseNextQuest：II 级无 faceTheThreatBossScriptByCampaignLevel 映射时拒绝且 cursor 不变", () => {
    let base = hamletReadyForFaceEmbark(hamletJourney());
    base = {
      ...base,
      dungeon: {
        ...base.dungeon!,
        campaignLevel: 2,
        trinkets: { ...base.dungeon!.trinkets!, level: 2 },
        activeBossThreatScriptId: PROPHET_I_SCRIPT_ID,
      },
    };
    const cursorBefore = base.dungeon!.cursor;
    const result = chooseNextQuest(
      base,
      base.dungeon!.pending!.id,
      FACE_THE_THREAT_QUEST_ID,
    );
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state.dungeon!.cursor).toBe(cursorBefore);
    expect(result.state.dungeon!.phase).toBe("inHamlet");
  });

  it("resolveFaceTheThreatEmbarkForChoose 与 establishImminentThreat 的 active 威胁一致", () => {
    let game = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources);
    game = ok(game, { type: "establishImminentThreat" });
    const resolved = resolveFaceTheThreatEmbarkForChoose(game, FACE_THE_THREAT_QUEST_ID);
    expect(resolved.kind).toBe("ok");
    if (resolved.kind === "ok") {
      expect(resolved.plan.resolvedScriptId).toBe(game.dungeon!.activeBossThreatScriptId);
    }
  });

  it("沙盒 createCoreDungeonQuest p019 写入 faceTheThreatEmbarkPlan", () => {
    const game = createCoreDungeonQuest(
      3,
      FACE_THE_THREAT_QUEST_ID,
      "radiant",
      coreParty,
      coreQuestSources,
    );
    const plan = readStoredFaceTheThreatEmbarkPlan(game.dungeon);
    expect(plan?.resolvedScriptId).toBe(NECROMANCER_I_SCRIPT_ID);
  });
});
