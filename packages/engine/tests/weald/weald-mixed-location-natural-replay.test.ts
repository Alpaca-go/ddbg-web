import { beforeAll, describe, expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import type { BasicQuestId } from "../../../data/src/basic-quests";
import { loadQuestSave } from "../../src/shared/quest/quest-save";
import { coreParty } from "../helpers/core-quest";
import { wealdTaskSources } from "../helpers/weald-task-battle";
import { WEALD_PRODUCTION_ESTABLISH_THREAT } from "../helpers/weald-face-the-threat-natural-prefix";
import {
  WEALD_MIXED_LOCATION_NATURAL_SEED,
  wealdMixedLocationNaturalCrossActJourney,
  type WealdMixedLocationCrossActJourney,
} from "../helpers/weald-mixed-location-natural-prefix";

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result.state;
}

describe("混合遗迹+Weald 自然跨幕升幕来源（生产路径）", () => {
  let journey: WealdMixedLocationCrossActJourney;
  const seed = WEALD_MIXED_LOCATION_NATURAL_SEED;

  beforeAll(() => {
    journey = wealdMixedLocationNaturalCrossActJourney(seed, {
      skillFallback: true,
      handleDeaths: true,
    });
  }, 300_000);

  it("I 幕前缀：split-one-each + 生产定威胁，无 bossExpeditionRegion", () => {
    expect(journey.start.initialQuestDrawMode).toBe("hamlet-quest-draw:split-one-each");
    expect(journey.actOnePrefix.commands[0]).toEqual(WEALD_PRODUCTION_ESTABLISH_THREAT);
    expect(journey.actOnePrefix.game.dungeon!.bossExpeditionRegion).toBeUndefined();
    const { completedRuinsQuests, completedWealdQuests } = journey.actOnePrefix;
    expect(completedRuinsQuests.length + completedWealdQuests.length).toBeGreaterThan(0);
  });

  it("II→III 升幕仍依赖明示混合边界（夹具≠自然 II 全胜）", () => {
    expect(journey.naturalActTwoBoundary).toBe(false);
    expect(journey.manualContinuation.reason).toMatch(/wealdMixedActReadyFixture|夹具/);
  });

  it("升幕来源：defeatedRuinsBossIdentities + defeatedWealdBossIdentities 可读回", () => {
    const d = journey.actTwoReady.dungeon!;
    expect(d.defeatedRuinsBossIdentities?.length).toBeGreaterThan(0);
    expect(d.defeatedWealdBossIdentities?.length).toBeGreaterThan(0);
    expect(d.bossExpeditionRegion).toBeUndefined();
    expect(d.wealdHigherQuestOffers).toBe("tasks-v1");
  });

  it("跨幕段 advanceRuinsAct→III tasks-v1 出征可严格重放", () => {
    const crossAct = journey.commands.slice(journey.actOnePrefix.commands.length);
    expect(crossAct[0]).toEqual({ type: "advanceRuinsAct" });
    expect(journey.game.dungeon!.campaignLevel).toBe(3);
    expect(journey.game.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
    let state = journey.actTwoReady;
    for (const command of crossAct) state = ok(state, command);
    expect(state).toEqual(journey.game);
  });

  it("I 幕前缀从战役起点严格重放", () => {
    const { firstQuest, start } = journey.actOnePrefix;
    let state = createCoreDungeonQuest(
      seed,
      firstQuest as BasicQuestId,
      "standard",
      coreParty,
      wealdTaskSources,
      true,
      null,
      start.contentPacks,
      start.initialQuestDrawMode,
    );
    for (const command of journey.actOnePrefix.commands) state = ok(state, command);
    expect(state).toEqual(journey.actOnePrefix.game);
  });

  it("存档往返", () => {
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
    }
  });
});
