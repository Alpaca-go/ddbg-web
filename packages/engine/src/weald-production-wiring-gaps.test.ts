import { expect, it } from "vitest";
import { applyCommand, type GameState } from "./command";
import { readRuinsActTransitionReadiness } from "./act-transition-readiness";
import { darkestActEntryPending, readDarkestDungeonEntryReadiness } from "./darkest-entry";
import { shriekerSkipsProvisionRolls } from "./expansions/weald/boss/shrieker-provision-version";
import { wealdSuppliesLootFixture } from "./test-helpers/weald-task-battle";
import { wealdActReadyFixture, wealdMixedActReadyFixture } from "./test-helpers/weald-act";
import { wealdActThreeCompleteFixture } from "./test-helpers/weald-act-three-complete";
import { actThreeCompleteFixture } from "./test-helpers/act-three-complete";
import { ruinsActReadyFixture } from "./test-helpers/ruins-act";

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
