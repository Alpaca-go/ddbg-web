import { beforeAll, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../src/command";
import { createCampaignQuest } from "../../src/campaign-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { loadQuestSave } from "../../src/quest-save";
import { coreParty } from "../../src/test-helpers/core-quest";
import { wealdTaskSources } from "../../src/test-helpers/weald-task-battle";
import {
  WEALD_PRODUCTION_ESTABLISH_THREAT,
  wealdFaceTheThreatNaturalCrossActJourney,
  type WealdFaceTheThreatCrossActJourney,
} from "../../src/test-helpers/weald-face-the-threat-natural-prefix";
import { readActiveWealdStygianRoom } from "../../src/weald/rooms/stygian-room-effects";

/** 第十五刀：Stygian 固定种子（生产 weald-two + tasks-v1；I 幕跨幕仍夹具接续）。 */
export const WEALD_STYGIAN_NATURAL_SEED = 3 as const;

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result.state;
}

describe("Weald Stygian 自然 Face the Threat 命令日志（正式生产路径）", () => {
  let journey: WealdFaceTheThreatCrossActJourney;
  const seed = WEALD_STYGIAN_NATURAL_SEED;

  beforeAll(() => {
    journey = wealdFaceTheThreatNaturalCrossActJourney(seed, {
      skillFallback: true,
      handleDeaths: true,
      stygian: true,
      wealdProductionRooms: true,
    });
  }, 300_000);

  it("战役起点为 Stygian + tasks-v1 + 0 起始金（R-272）", () => {
    expect(journey.start).toMatchObject({
      mode: "stygian",
      stygianRoomRules: "full",
      wealdHigherQuestOffers: "tasks-v1",
      initialQuestDrawMode: "hamlet-quest-draw:weald-two",
    });
    const fresh = createCampaignQuest(
      seed,
      journey.actOnePrefix.firstQuest as BasicQuestId,
      "stygian",
      coreParty,
      wealdTaskSources,
      journey.start.contentPacks,
      journey.start.initialQuestDrawMode,
      "tasks-v1",
    );
    expect(fresh.dungeon).toMatchObject({
      mode: "stygian",
      stygianRoomRules: "full",
      wealdHigherQuestOffers: "tasks-v1",
      gold: 0,
    });
  });

  it("前缀含显式生产 establishImminentThreat", () => {
    expect(journey.actOnePrefix.commands[0]).toEqual(WEALD_PRODUCTION_ESTABLISH_THREAT);
  });

  it("探索中目击 Weald p001–p009 Stygian 替换；p010–p012 生产读回不替换（R-036）", () => {
    const witnesses = journey.actOnePrefix.stygianOrdinaryRoomWitnesses ?? [];
    expect(witnesses.length).toBeGreaterThan(0);
    expect(witnesses.every((id) => /^stygian_room:weald:\d{2}$/.test(id))).toBe(true);
    const bossDungeon = {
      ...journey.actOnePrefix.game.dungeon!,
      roomCards: {
        ...journey.actOnePrefix.game.dungeon!.roomCards!,
        active: { roomId: "r-boss", cardId: "room:weald:10", blockedReason: "" },
      },
    };
    expect(readActiveWealdStygianRoom(bossDungeon)).toBeUndefined();
    if (journey.actOnePrefix.bossRoomWithoutStygianWitness)
      expect(journey.actOnePrefix.game.dungeon!.questDistribution?.questId).toBe("quest:p019");
  });

  it("I 幕 Hag 自然全胜未达成：跨幕仍夹具边界", () => {
    expect(journey.naturalActOneBoundary).toBe(false);
    expect(journey.manualContinuation.reason).toContain("wealdActReadyFixture");
  });

  it("跨幕段 advanceRuinsAct→tasks-v1 II 出征可严格重放", () => {
    const crossAct = journey.commands.slice(journey.actOnePrefix.commands.length);
    expect(crossAct[0]).toEqual({ type: "advanceRuinsAct" });
    expect(journey.game.dungeon!.campaignLevel).toBe(2);
    let state = journey.actOneReady;
    for (const command of crossAct) state = ok(state, command);
    expect(state).toEqual(journey.game);
  });

  it("I 幕前缀从 Stygian 战役起点严格重放", () => {
    const { firstQuest, start } = journey.actOnePrefix;
    let state = createCampaignQuest(
      seed,
      firstQuest as BasicQuestId,
      "stygian",
      coreParty,
      wealdTaskSources,
      start.contentPacks,
      start.initialQuestDrawMode,
      "tasks-v1",
    );
    for (const command of journey.actOnePrefix.commands) state = ok(state, command);
    expect(state).toEqual(journey.actOnePrefix.game);
  });

  it("存档：I 幕前缀与跨幕段往返（与标准自然日志一致）", () => {
    const actOneLoaded = loadQuestSave(
      JSON.parse(JSON.stringify(journey.actOneSave)),
      wealdTaskSources,
    );
    expect(actOneLoaded.game).toEqual(journey.actOnePrefix.game);
    const crossAct = journey.commands.slice(journey.actOnePrefix.commands.length);
    if (journey.crossActSave) {
      const crossLoaded = loadQuestSave(
        JSON.parse(JSON.stringify(journey.crossActSave)),
        wealdTaskSources,
      );
      expect(crossLoaded.commands).toEqual(crossAct);
      expect(crossLoaded.game).toEqual(journey.game);
    }
    expect(journey.manualContinuation.reason.length).toBeGreaterThan(0);
  });
});
