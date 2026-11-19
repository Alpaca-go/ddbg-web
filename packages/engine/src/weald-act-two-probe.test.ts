import { expect, it } from "vitest";
import { WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE } from "./test-helpers/weald-face-the-threat-natural-seed-scan";
import {
  useCombatProvisions,
  wealdFaceTheThreatNaturalCrossActJourney,
} from "./test-helpers/weald-face-the-threat-natural-prefix";
import { CURRENT_WEALD_ROOM_VERSIONS, naturalQuest } from "./test-helpers/natural-quest";
import { wealdTaskSources } from "./test-helpers/weald-task-battle";

/**
 * P1 基线探测：从已验收的 I→II 末态继续跑第一趟 II 级任务，记录停点。
 * 这不是完整 Act II 验收，也不筛胜负；V1 驱动会替换这些结果。
 */
const cases = [
  { seed: 7, mode: "radiant" as const },
  { seed: 13, mode: "radiant" as const },
  { seed: 56, mode: "radiant" as const },
  { seed: 90, mode: "standard" as const },
  { seed: 20, mode: "stygian" as const },
];

it("已验收种子的 Act II 第一趟探测快照（非验收）", () => {
  const rows = cases.map(({ seed, mode }) => {
    const journey = wealdFaceTheThreatNaturalCrossActJourney(seed, {
      ...WEALD_NATURAL_ACT_ONE_RADIANT_CAMPAIGN_DRIVE,
      radiant: mode === "radiant",
      ...(mode === "stygian" ? { stygian: true } : {}),
    });
    const questId = journey.game.dungeon!.questDistribution!.questId as never;
    const run = naturalQuest(seed, questId, true, wealdTaskSources, 2, {
      continueFrom: journey.game,
      handleDeaths: true,
      preferStagecoachRevival: true,
      survival: true,
      restThreshold: 4,
      heroAction: useCombatProvisions,
      ...CURRENT_WEALD_ROOM_VERSIONS,
    });
    const d = run.state.dungeon!;
    return {
      seed,
      mode,
      questId,
      stop: run.stopReason,
      phase: d.phase,
      fail: d.campaignFailure ?? null,
      xp: d.questSummary?.xpPerHero ?? null,
      cleared: d.questSummary?.clearedRoomIds ?? null,
      heroes: d.heroes.map((h) => ({
        id: h.id,
        level: h.level,
        dead: h.dead ?? false,
        wounds: h.wounds,
      })),
    };
  });
  expect(rows).toMatchSnapshot();
}, 300_000);
