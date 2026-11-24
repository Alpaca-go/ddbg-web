import { beforeAll, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { loadQuestSave } from "../../src/shared/quest/quest-save";
import { coreParty } from "../helpers/core-quest";
import { WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE } from "../helpers/weald-face-the-threat-natural-seed-scan";
import { wealdTaskSources } from "../helpers/weald-task-battle";
import {
  WEALD_PRODUCTION_ESTABLISH_THREAT,
  wealdFaceTheThreatNaturalActOnePrefix,
  wealdFaceTheThreatNaturalCrossActJourney,
  type WealdFaceTheThreatCrossActJourney,
} from "../helpers/weald-face-the-threat-natural-prefix";

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result.state;
}

describe("Weald 自然跨幕 Face the Threat 全流程命令日志（生产路径）", () => {
  let journey: WealdFaceTheThreatCrossActJourney;
  const seed = 1;

  beforeAll(() => {
    journey = wealdFaceTheThreatNaturalCrossActJourney(seed, {
      skillFallback: true,
      handleDeaths: true,
    });
  }, 300_000);

  it("I 幕自然前缀含显式生产 establishImminentThreat", () => {
    expect(journey.actOnePrefix.commands[0]).toEqual(WEALD_PRODUCTION_ESTABLISH_THREAT);
    expect(journey.actOnePrefix.game.dungeon!.locationBossThreats).toBe(true);
    expect(journey.actOnePrefix.game.dungeon!.wealdHigherBosses).toBe(true);
    expect(journey.actOnePrefix.game.dungeon!.bossLocationSources).toBe(true);
    expect(journey.actOnePrefix.commands.some((c) => c.type === "offerNextQuest")).toBe(true);
  });

  it("第十四刀：seed 1 跨幕仍依赖夹具边界（自然链未 Hag 全胜）", () => {
    expect(journey.naturalActOneBoundary).toBe(false);
    expect(journey.manualContinuation.reason).toContain("wealdActReadyFixture");
  });

  it("跨幕段：advanceRuinsAct→tasks-v1 抽选→II 出征（从 I 幕末边界重放）", () => {
    const crossAct = journey.commands.slice(journey.actOnePrefix.commands.length);
    expect(crossAct[0]).toEqual({ type: "advanceRuinsAct" });
    expect(journey.game.dungeon!.campaignLevel).toBe(2);
    expect(journey.game.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
    expect(journey.game.dungeon!.questDistribution!.questId.startsWith("quest:weald:")).toBe(true);
    expect(crossAct.some((c) => c.type === "offerNextQuest")).toBe(true);
    let state = journey.actOneReady;
    for (const command of crossAct) state = ok(state, command);
    expect(state).toEqual(journey.game);
  });

  it("I 幕自然前缀从战役起点可重放", () => {
    const { firstQuest } = journey.actOnePrefix;
    let state = createCoreDungeonQuest(
      seed,
      firstQuest as BasicQuestId,
      "standard",
      coreParty,
      wealdTaskSources,
      true,
      null,
      journey.actOnePrefix.start.contentPacks,
      journey.actOnePrefix.start.initialQuestDrawMode,
    );
    for (const command of journey.actOnePrefix.commands) state = ok(state, command);
    expect(state).toEqual(journey.actOnePrefix.game);
  });

  it("存档：I 幕前缀与跨幕段分别严格往返", () => {
    const crossAct = journey.commands.slice(journey.actOnePrefix.commands.length);
    let replayed = journey.actOneReady;
    for (const command of crossAct) replayed = ok(replayed, command);
    expect(replayed).toEqual(journey.game);
    const actOneLoaded = loadQuestSave(
      JSON.parse(JSON.stringify(journey.actOneSave)),
      wealdTaskSources,
    );
    expect(actOneLoaded.game).toEqual(journey.actOnePrefix.game);
    if (journey.crossActSave) {
      const crossLoaded = loadQuestSave(
        JSON.parse(JSON.stringify(journey.crossActSave)),
        wealdTaskSources,
      );
      expect(crossLoaded.game).toEqual(journey.game);
      expect(crossLoaded.commands).toEqual(crossAct);
    }
    expect(journey.manualContinuation.reason.length).toBeGreaterThan(0);
  });
});

describe("Weald 自然 I 幕生产定威胁（seed 1 固定矩阵）", () => {
  it("公开命令与停点记录（不宣称 Hag 自然全胜）", () => {
    const prefix = wealdFaceTheThreatNaturalActOnePrefix(1, {
      skillFallback: true,
      handleDeaths: true,
    });
    expect(prefix.commands[0]).toEqual(WEALD_PRODUCTION_ESTABLISH_THREAT);
    expect(prefix.stop ?? prefix.hagVictory).toBeTruthy();
  });
});

it("Radiant seed 13：从正式开局击败 Hag I、回村、升 II 幕并严格回放同一局", () => {
  const journey = wealdFaceTheThreatNaturalCrossActJourney(
    13,
    WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE,
  );
  const { actOnePrefix: actOne, commands, crossActSave, game } = journey;
  expect(actOne.stop).toBeNull();
  expect(actOne.wealdBossVictory).toBe(true);
  expect(journey.naturalActOneBoundary).toBe(true);
  expect(journey.actOneReady).toBe(actOne.game);
  expect(journey.start.mode).toBe("radiant");
  const { dungeon } = actOne.game;
  expect(dungeon!.completedRegularQuests).toHaveLength(2);
  expect(dungeon).toMatchObject({
    phase: "inHamlet",
    defeatedWealdBossIdentities: ["hag"],
    faceTheThreatEmbarkPlan: { roomPlacement: "edgeRoomsR30" },
    hamletReturn: { phase: "complete" },
    questSummary: { questId: "quest:p019", xpPerHero: 3, stagecoachXp: 3, awarded: true },
  });
  expect(actOne.commands.filter((command) => command.type === "deployHagI")).toHaveLength(1);
  expect(commands[actOne.commands.length]).toEqual({ type: "advanceRuinsAct" });
  expect(game.dungeon).toMatchObject({ campaignLevel: 2, wealdHigherQuestOffers: "tasks-v1" });
  expect(game.dungeon!.questDistribution!.questId).toMatch(/^quest:weald:p0(?:06|07|08|09|10)$/);
  expect(crossActSave).not.toBeNull();
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(crossActSave)), wealdTaskSources);
  expect(loaded.commands).toEqual(commands);
  expect(loaded.game).toEqual(game);
}, 120_000);
