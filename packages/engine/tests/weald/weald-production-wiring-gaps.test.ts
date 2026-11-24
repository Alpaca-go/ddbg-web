import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../src/shared/core/command";
import {
  readRuinsActTransitionReadiness,
  wealdLocationActAdvanceEnabled,
} from "../../src/shared/hamlet/act-transition-readiness";
import { campaignActIIIBossesComplete } from "../../src/shared/hamlet/campaign-boss-defeats";
import { RUINS_COMBAT_LEVELS } from "../../src/core/bosses/ruins-combat-levels";
import { getBossScript } from "../../src/core/bosses/registry";
import {
  darkestActEntryPending,
  readDarkestDungeonEntryReadiness,
} from "../../src/core/darkest/darkest-entry";
import { shriekerSkipsProvisionRolls } from "../../src/weald/bosses/shrieker-provision-version";
import { wealdSuppliesLootFixture } from "../helpers/weald-task-battle";
import { wealdActReadyFixture, wealdMixedActReadyFixture } from "../helpers/weald-act";
import { wealdActThreeCompleteFixture } from "../helpers/weald-act-three-complete";
import { actThreeCompleteFixture } from "../helpers/act-three-complete";
import { ruinsActReadyFixture } from "../helpers/ruins-act";
import type { RuinsBossIdentity } from "../../src/core/bosses/threat-description-catalog";
import type { WealdBossIdentity } from "../../src/weald/catalog";

const wealdProduction = {
  locationBossThreats: true as const,
  wealdHigherBosses: true as const,
  bossLocationSources: true as const,
  pounderBossBattles: true as const,
  shriekerBossBattles: true as const,
  contentPacks: ["core", "weald"] as const,
};

function withoutBossExpeditionRegion<T extends { bossExpeditionRegion?: "weald" }>(
  dungeon: T,
): Omit<T, "bossExpeditionRegion"> {
  const { bossExpeditionRegion: _r, ...rest } = dungeon;
  void _r;
  return rest;
}

it.each(["standard", "radiant", "stygian"] as const)(
  "R-270：Stygian 与标准模式均可启用 shriekerProvisionSkipRolls，II 描述面跳补给骰",
  (mode) => {
    const source = wealdSuppliesLootFixture();
    const state: GameState = {
      ...source,
      dungeon: {
        ...source.dungeon!,
        mode,
        ...(mode === "stygian" ? { stygianRoomRules: "full" as const } : {}),
        campaignLevel: 2,
        wealdHigherBosses: true,
        shriekerBossBattles: true,
        activeBossThreatScriptId: "boss:weald:shrieker:2",
        imminentThreatDescriptionCardId: "boss_ability:weald:p002",
      },
    };
    const enabled = applyCommand(state, {
      type: "ping",
      message: "v",
      shriekerProvisionSkipRolls: true,
    });
    expect(enabled.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(enabled.state.dungeon!.shriekerProvisionSkipRolls).toBe(true);
    expect(shriekerSkipsProvisionRolls(enabled.state.dungeon)).toBe(true);
    const withoutFlag = applyCommand(state, { type: "ping", message: "v" });
    expect(withoutFlag.state.dungeon!.shriekerProvisionSkipRolls).toBeUndefined();
    expect(shriekerSkipsProvisionRolls(withoutFlag.state.dungeon)).toBe(false);
  },
);

it("混合遗迹+Weald 击败：II→III 升幕可读回；纯 Weald 两 Boss 不回退", () => {
  const mixed = wealdMixedActReadyFixture("prophet", "hag");
  const mixedReadiness = readRuinsActTransitionReadiness(mixed);
  expect(mixedReadiness.kind, JSON.stringify(mixedReadiness)).toBe("ready");
  if (mixedReadiness.kind !== "ready") throw new Error(mixedReadiness.reason);
  expect(mixedReadiness.location).toBe("weald");
  expect(mixedReadiness.plan.toLevel).toBe(3);
  const advanced = applyCommand(mixed, { type: "advanceRuinsAct" });
  expect(advanced.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(advanced.state.dungeon!.campaignLevel).toBe(3);
  expect(advanced.state.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
  const pureWeald = wealdActReadyFixture(2, "shrieker");
  expect(readRuinsActTransitionReadiness(pureWeald).kind).toBe("ready");
  const ruinsReady = readRuinsActTransitionReadiness(ruinsActReadyFixture(2, "necromancer"));
  expect(ruinsReady.kind).toBe("ready");
  if (ruinsReady.kind === "ready") expect(ruinsReady.location).toBe("ruins");
});

it("混合战役当前池为遗迹时升幕仍走 switchRuinsActPools 并写入 tasks-v1", () => {
  const mixed = wealdMixedActReadyFixture("necromancer", "brigandPounder");
  expect(mixed.dungeon!.monsterPool!.location).toBe("ruins");
  const result = applyCommand(mixed, { type: "advanceRuinsAct" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.monsterPool?.location).toBe("ruins");
  expect(result.state.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
});

it("纯 Weald 三 Boss 记录可触发最暗入口；纯遗迹与 II 幕残留摘要不回退", () => {
  const weald = wealdActThreeCompleteFixture();
  expect(darkestActEntryPending(weald.dungeon!)).toBe(true);
  expect(readDarkestDungeonEntryReadiness(weald).kind).toBe("ok");
  const ruins = actThreeCompleteFixture();
  expect(darkestActEntryPending(ruins.dungeon!)).toBe(true);
  const onlyTwoWeald = {
    ...wealdActThreeCompleteFixture().dungeon!,
    defeatedWealdBossIdentities: ["hag", "brigandPounder"] as const,
  };
  expect(darkestActEntryPending(onlyTwoWeald)).toBe(false);
});

it("混合生产路径无 bossExpeditionRegion：I 级首击败遗迹 Boss 仍升幕并写 tasks-v1", () => {
  const ruinsBoss: RuinsBossIdentity = "prophet";
  const entry = RUINS_COMBAT_LEVELS[ruinsBoss][0]!;
  const base = ruinsActReadyFixture(1, ruinsBoss);
  const dungeonBody = {
    ...withoutBossExpeditionRegion({ ...base.dungeon!, ...wealdProduction }),
    completedRegularQuests: [
      { questId: "quest:p001", campaignLevel: 1 as const },
      { questId: "quest:p002", campaignLevel: 1 as const },
    ],
    bossCombatThreatCeased: entry.script,
    imminentThreatDescriptionCardId: entry.description,
    faceTheThreatEmbarkPlan: {
      questId: "quest:p019" as const,
      resolvedScriptId: entry.script,
      combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
      rulesRef: ["R35", "W3"],
      layoutWiringHold: "混合 I 级遗迹首击败",
    },
  };
  const state: GameState = { ...base, dungeon: dungeonBody };
  expect(state.dungeon!.bossExpeditionRegion).toBeUndefined();
  expect(wealdLocationActAdvanceEnabled(state.dungeon!)).toBe(true);
  expect(readRuinsActTransitionReadiness(state).kind).toBe("ready");
  const advanced = applyCommand(state, { type: "advanceRuinsAct" });
  expect(advanced.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(advanced.state.dungeon!.campaignLevel).toBe(2);
  expect(advanced.state.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
});

it("混合生产路径无 bossExpeditionRegion：最近击败为遗迹脚本时 II→III 可读回并写 tasks-v1", () => {
  const ruinsBoss: RuinsBossIdentity = "necromancer";
  const wealdBoss: WealdBossIdentity = "hag";
  const entry = RUINS_COMBAT_LEVELS[ruinsBoss][1]!;
  const mixed = wealdMixedActReadyFixture(ruinsBoss, wealdBoss);
  const faceTheThreatEmbarkPlan = {
    questId: "quest:p019" as const,
    resolvedScriptId: entry.script,
    combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
    rulesRef: ["R35", "W3"],
    layoutWiringHold: "混合 II 遗迹最近击败",
  };
  const state: GameState = {
    ...mixed,
    dungeon: {
      ...withoutBossExpeditionRegion(mixed.dungeon!),
      bossCombatThreatCeased: entry.script,
      imminentThreatDescriptionCardId: entry.description,
      faceTheThreatEmbarkPlan,
    },
  };
  expect(wealdLocationActAdvanceEnabled(state.dungeon!)).toBe(true);
  const readiness = readRuinsActTransitionReadiness(state);
  expect(readiness.kind, JSON.stringify(readiness)).toBe("ready");
  const advanced = applyCommand(state, { type: "advanceRuinsAct" });
  expect(advanced.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(advanced.state.dungeon!.wealdHigherQuestOffers).toBe("tasks-v1");
});

it("混合三 Boss 合计无 bossExpeditionRegion：最暗入口仍为真", () => {
  const weald = wealdActThreeCompleteFixture();
  const dungeon = withoutBossExpeditionRegion({
    ...weald.dungeon!,
    defeatedRuinsBossIdentities: ["prophet"] as const,
    defeatedWealdBossIdentities: ["hag", "brigandPounder"] as const,
  });
  expect(campaignActIIIBossesComplete(dungeon)).toBe(true);
  expect(darkestActEntryPending(dungeon)).toBe(true);
});

it("纯遗迹无 Weald 生产标记：最暗仍只看三条遗迹记录", () => {
  const ruins = actThreeCompleteFixture();
  expect(ruins.dungeon!.wealdHigherBosses).toBeUndefined();
  expect(campaignActIIIBossesComplete(ruins.dungeon!)).toBe(true);
  const mixedRecords = {
    ...ruins.dungeon!,
    defeatedRuinsBossIdentities: ["prophet", "necromancer"] as const,
    defeatedWealdBossIdentities: ["hag"] as const,
  };
  expect(campaignActIIIBossesComplete(mixedRecords)).toBe(false);
});

it("缺 wealdHigherBosses 或旧 wealdHigherQuestOffers:true 仍拒绝升幕读回", () => {
  const state = wealdActReadyFixture(2, "hag");
  const d = state.dungeon!;
  const { wealdHigherBosses: _b, ...noBosses } = d;
  void _b;
  expect(readRuinsActTransitionReadiness({ ...state, dungeon: noBosses }).kind).toBe("blocked");
  expect(
    readRuinsActTransitionReadiness({
      ...state,
      dungeon: { ...d, wealdHigherQuestOffers: true as const },
    }).kind,
  ).toBe("blocked");
});
