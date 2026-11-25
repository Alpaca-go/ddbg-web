import { expect, it } from "vitest";
import { loadQuestSave } from "../../src/shared/quest/quest-save";
import { WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE } from "../helpers/weald-face-the-threat-natural-seed-scan";
import { wealdTaskSources } from "../helpers/weald-task-battle";
import { wealdFaceTheThreatNaturalCrossActJourney } from "../helpers/weald-face-the-threat-natural-prefix";
import type { WealdBossIdentity } from "../../src/weald/catalog";

function expectBossCampaign(
  seed: number,
  boss: WealdBossIdentity,
  deployCommand: string,
  mode: "radiant" | "standard" | "stygian",
) {
  const journey = wealdFaceTheThreatNaturalCrossActJourney(seed, {
    ...WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE,
    radiant: mode === "radiant",
    ...(mode === "stygian" ? { stygian: true } : {}),
  });
  const actOne = journey.actOnePrefix;
  expect(actOne.stop).toBeNull();
  expect(actOne.wealdBossVictory).toBe(true);
  expect(journey.start.mode).toBe(mode);
  if (mode === "stygian") {
    expect(journey.start).toMatchObject({
      stygianRoomRules: "full",
      initialQuestDrawMode: "hamlet-quest-draw:weald-two",
    });
    expect((actOne.stygianOrdinaryRoomWitnesses ?? []).length).toBeGreaterThan(0);
  }
  expect(journey.naturalActOneBoundary).toBe(true);
  expect(journey.actOneReady).toBe(actOne.game);
  expect(actOne.game.dungeon!.completedRegularQuests).toHaveLength(2);
  expect(actOne.game.dungeon).toMatchObject({
    phase: "inHamlet",
    defeatedWealdBossIdentities: [boss],
    faceTheThreatEmbarkPlan: { roomPlacement: "edgeRoomsR30" },
    hamletReturn: { phase: "complete" },
    questSummary: { questId: "quest:p019", xpPerHero: 3, stagecoachXp: 3, awarded: true },
  });
  expect(actOne.commands.filter((command) => command.type === deployCommand)).toHaveLength(1);
  expect(journey.commands[actOne.commands.length]).toEqual({ type: "advanceRuinsAct" });
  expect(journey.game.dungeon).toMatchObject({
    campaignLevel: 2,
    wealdHigherQuestOffers: "tasks-v1",
  });
  expect(journey.game.dungeon!.questDistribution!.questId).toMatch(
    /^quest:weald:p0(?:06|07|08|09|10)$/,
  );
  expect(journey.crossActSave).not.toBeNull();
  const loaded = loadQuestSave(JSON.parse(JSON.stringify(journey.crossActSave)), wealdTaskSources);
  expect(loaded.commands).toEqual(journey.commands);
  expect(loaded.game).toEqual(journey.game);
}

it("Radiant seed 7：两趟普通任务后自然击败 Pounder I、回村领取 3 XP 并升 II 幕", () => {
  expectBossCampaign(7, "brigandPounder", "deployPounderI", "radiant");
}, 120_000);

it("Radiant seed 56：两趟普通任务后自然击败 Shrieker I、回村领取 3 XP 并升 II 幕", () => {
  expectBossCampaign(56, "shrieker", "deployShriekerI", "radiant");
}, 120_000);

it("Standard seed 90：两趟普通任务后自然击败 Pounder I、回村领取 3 XP 并升 II 幕", () => {
  expectBossCampaign(90, "brigandPounder", "deployPounderI", "standard");
}, 120_000);

it("Stygian seed 20：两趟普通任务后自然击败 Hag I、回村领取 3 XP 并升 II 幕", () => {
  expectBossCampaign(20, "hag", "deployHagI", "stygian");
}, 120_000);
