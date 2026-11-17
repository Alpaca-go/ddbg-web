import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { drawImminentThreatAfterActAdvance } from "./boss/establish-imminent-threat";
import { clearBossScriptsForTest } from "./boss/registry";
import {
  readRuinsActTransitionReadiness,
  requiresRuinsActAdvance,
  wealdLocationActAdvanceEnabled,
} from "./act-transition-readiness";
import { switchWealdActPools } from "./act-transition-pools";
import { wealdThreatPool } from "./expansions/weald/boss/threat-pool";
import { WEALD_BOSS_IDENTITIES } from "./expansions/weald/catalog";
import { wealdActReadyFixture } from "./test-helpers/weald-act";

const command = { type: "advanceRuinsAct" } as const;

it.each([
  ["standard", null],
  ["radiant", null],
  ["stygian", "full"],
] as const)(
  "Weald 生产路径 %s：两级三 Boss 升幕后可走 drawImminentThreatAfterActAdvance",
  (mode, stygianRoomRules) => {
    for (const level of [1, 2] as const)
      for (const boss of level === 1 ? (["hag"] as const) : WEALD_BOSS_IDENTITIES) {
        const original = wealdActReadyFixture(level, boss);
        const state: typeof original = {
          ...original,
          dungeon: {
            ...original.dungeon!,
            mode,
            ...(stygianRoomRules ? { stygianRoomRules } : {}),
          },
        };
        const readiness = readRuinsActTransitionReadiness(state);
        expect(readiness.kind, JSON.stringify(readiness)).toBe("ready");
        if (readiness.kind !== "ready") throw new Error(readiness.reason);
        expect(readiness.location).toBe("weald");
        expect(wealdLocationActAdvanceEnabled(state.dungeon!)).toBe(true);
        const pools = switchWealdActPools(
          level,
          state.dungeon!.monsterPool!,
          state.dungeon!.trinkets!,
          state.dungeon!.heroes,
          state.dungeon!.contentPacks!,
        );
        if (pools.kind !== "ready") throw new Error(pools.reason);
        const target = (level + 1) as 2 | 3;
        clearBossScriptsForTest();
        const threatFirst = drawImminentThreatAfterActAdvance(
          {
            ...state,
            dungeon: {
              ...state.dungeon!,
              campaignLevel: target,
              monsterPool: pools.monsterPool,
              trinkets: pools.trinkets,
            },
          },
          { type: "drawImminentThreatAfterActAdvance" },
        );
        expect(threatFirst.events.filter((e) => e.type === "commandRefused")).toEqual([]);
        expect(requiresRuinsActAdvance(state.dungeon!)).toBe(true);
        const result = applyCommand(state, command);
        expect(
          result.events.some((e) => e.type === "commandRefused"),
          JSON.stringify(result.events),
        ).toBe(false);
        expect(result.state.dungeon?.campaignLevel).toBe(target);
        expect(requiresRuinsActAdvance(result.state.dungeon!)).toBe(false);
        expect(result.state.dungeon?.mode).toBe(mode);
        if (stygianRoomRules) expect(result.state.dungeon?.stygianRoomRules).toBe(stygianRoomRules);
        expect(result.state.dungeon?.activeBossThreatScriptId).toBeDefined();
        expect(wealdThreatPool(result.state.dungeon!, target)).toContain(
          result.state.dungeon!.imminentThreatDescriptionCardId,
        );
        expect(result.state.dungeon?.imminentThreatDescriptionCardId).toBe(
          threatFirst.state.dungeon?.imminentThreatDescriptionCardId,
        );
        expect(result.state.dungeon?.monsterPool?.wealdSourceVersion).toBe("higher-v1");
        expect(result.state.dungeon?.monsterPool?.wealdMonsterLevel).toBe(target);
        if (target >= 2) expect(result.state.dungeon?.wealdHigherQuestOffers).toBe("tasks-v1");
        const village = applyCommand(result.state, { type: "drawHamletEvent" });
        expect(village.events.some((e) => e.type === "commandRefused")).toBe(false);
      }
  },
);

it("缺 wealdHigherBosses 或 wealdHigherQuestOffers:true 时读回拒绝", () => {
  const state = wealdActReadyFixture(2, "hag");
  const d = state.dungeon!;
  const { wealdHigherBosses: _b, ...noBossVersion } = d;
  void _b;
  for (const dungeon of [noBossVersion, { ...d, wealdHigherQuestOffers: true as const }])
    expect(readRuinsActTransitionReadiness({ ...state, dungeon }).kind).toBe("blocked");
});

it("缺 bossExpeditionRegion 时战役升幕仍可读回并提交", () => {
  const state = wealdActReadyFixture(2, "hag");
  const { bossExpeditionRegion: _r, ...dungeon } = state.dungeon!;
  void _r;
  expect(wealdLocationActAdvanceEnabled(dungeon)).toBe(true);
  expect(readRuinsActTransitionReadiness({ ...state, dungeon }).kind).toBe("ready");
  const advanced = applyCommand({ ...state, dungeon }, command);
  expect(advanced.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(advanced.state.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
});
