import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../../../src/shared/core/command";
import { createLootState } from "../../../../src/shared/trinkets/loot";
import { wealdSuppliesLootFixture, wealdTaskSources } from "../../../helpers/weald-task-battle";
import { coreParty, coreQuestSources } from "../../../helpers/core-quest";
import { createCoreDungeonQuest } from "../../../../src/shared/dungeon/dungeon-quest-entry";
import { createQuestSave, loadQuestSave } from "../../../../src/shared/quest/quest-save";
import { savedCommandSchema } from "../../../../../data/src/shared/quest-save";

function fixture(lost = false): GameState {
  const source = wealdSuppliesLootFixture(),
    b = source.battle!,
    loot = createLootState();
  const token = loot.available.find((t) => t.kind === "rollProvision")!;
  return {
    ...source,
    dungeon: {
      ...source.dungeon!,
      campaignLevel: 2,
      wealdHigherBosses: true,
      shriekerBossBattles: true,
      activeBossThreatScriptId: "boss:weald:shrieker:2",
      imminentThreatDescriptionCardId: "boss_ability:weald:p002",
      questDistribution: lost
        ? {
            ...source.dungeon!.questDistribution!,
            questId: "quest:weald:p010",
          }
        : createCoreDungeonQuest(
            17,
            "quest:weald:p001",
            "standard",
            coreParty,
            wealdTaskSources,
            true,
            null,
            ["core", "weald"],
          ).dungeon!.questDistribution!,
    },
    battle: {
      ...b,
      provisions: Array.from({ length: 16 }, (_, i) => ({ id: `old${i}`, face: "food" as const })),
      loot: {
        ...loot,
        available: loot.available.filter((t) => t.id !== token.id),
        placed: [{ ...token, areaId: b.entities[0]!.areaId, revealed: false }],
      },
    },
  };
}
it.each([false, true])("R-270随机箱跳骰与Wild，双奖励=%s；满池也只扣一次行动／移箱", (lost) => {
  const state = fixture(lost),
    actorId = state.battle!.entities[0]!.id;
  const command = { type: "interactLoot", actorId, shriekerProvisionSkipRolls: true } as const;
  const result = applyCommand(state, command);
  expect(
    result.events.filter(
      (e) =>
        e.type === "commandRefused" ||
        e.type === "provisionRolled" ||
        e.type === "provisionSelected",
    ),
  ).toEqual([]);
  expect(result.pendingChoice).toBeUndefined();
  expect(result.state.inventoryOverflowHold).toBeUndefined();
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(result.state.battle!.provisions).toEqual(state.battle!.provisions);
  expect(result.state.battle!.loot!.provisionCursor).toBe(0);
  expect(result.state.battle!.loot!.placed).toEqual([]);
  expect(result.state.battle!.loot!.claimedIds).toHaveLength(1);
  expect(result.state.battle!.encounter!.turn).toMatchObject({ type: "hero", actions: 1 });
  expect(result.events).toContainEqual(
    expect.objectContaining({ type: "lootResolved", reward: { ignoredProvisions: lost ? 2 : 1 } }),
  );
  expect(result.state.dungeon!.shriekerProvisionSkipRolls).toBe(true);
  expect(applyCommand(JSON.parse(JSON.stringify(state)) as GameState, command)).toEqual(result);
});
it("旧版本仍消耗骰并进入Wild；不能在旧待选中切换，完成后才能启用", () => {
  const state = fixture(),
    actorId = state.battle!.entities[0]!.id;
  const old = applyCommand(state, { type: "interactLoot", actorId });
  expect(old.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
  expect(old.pendingChoice!.options.map((o) => o.id)).toContain("food");
  const choice = {
    type: "resolveChoice",
    choiceId: old.pendingChoice!.id,
    optionId: "food",
  } as const;
  expect(applyCommand(old.state, { ...choice, shriekerProvisionSkipRolls: true }).state).toBe(
    old.state,
  );
  const finished = applyCommand(old.state, choice);
  expect(finished.state.battle!.provisions).toEqual(state.battle!.provisions);
  expect(finished.state.dungeon!.shriekerProvisionSkipRolls).toBeUndefined();
  const enabled = applyCommand(finished.state, {
    type: "ping",
    message: "版本切换",
    shriekerProvisionSkipRolls: true,
  });
  expect(enabled.state.dungeon!.shriekerProvisionSkipRolls).toBe(true);
  expect(enabled.state.battle!.rngCursor).toBe(finished.state.battle!.rngCursor);
});
it("版本启用与原命令一起提交，拒绝命令不留版本；翻战斗面后停止跳骰", () => {
  const state = fixture(),
    actorId = state.battle!.entities[0]!.id;
  expect(
    applyCommand(state, {
      type: "interactLoot",
      actorId: "missing",
      shriekerProvisionSkipRolls: true,
    }).state,
  ).toBe(state);
  const faced = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      shriekerProvisionSkipRolls: true as const,
      bossCombatThreatCeased: "boss:weald:shrieker:2" as const,
    },
  };
  const rolled = applyCommand(faced, { type: "interactLoot", actorId });
  expect(rolled.events).toContainEqual(
    expect.objectContaining({ type: "provisionRolled", face: "wild" }),
  );
  expect(rolled.state.battle!.rngCursor).toBe(faced.battle!.rngCursor + 1);
});
it("显式版本从首个公开命令严格回放；去掉标记但保留快照被拒绝", () => {
  const initial = createCoreDungeonQuest(
    0,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  const command = {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
    pounderHamletThreats: true,
    pounderBossBattles: true,
    shriekerBossBattles: true,
    wealdHigherBosses: true,
    shriekerProvisionSkipRolls: true,
  } as const;
  const result = applyCommand(initial, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const save = createQuestSave(
    {
      seed: 0,
      questId: "quest:p001",
      mode: "standard",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      bossEdgeRooms: true,
      contentPacks: ["core", "weald"],
    },
    [command],
    result.state,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    result.state,
  );
  const { shriekerProvisionSkipRolls: _version, ...old } = command;
  void _version;
  expect(() => loadQuestSave({ ...save, commands: [old] }, coreQuestSources)).toThrow();
  expect(
    savedCommandSchema.safeParse({ ...command, shriekerProvisionSkipRolls: false }).success,
  ).toBe(false);
});
it("Stygian 完整高等级：启用标记后 II 描述面仍跳补给骰（与页面 sandbox 一致）", () => {
  const state = {
    ...fixture(),
    dungeon: {
      ...fixture().dungeon!,
      mode: "stygian" as const,
      stygianRoomRules: "full" as const,
    },
  };
  const actorId = state.battle!.entities[0]!.id;
  const enabled = applyCommand(state, {
    type: "ping",
    message: "v",
    shriekerProvisionSkipRolls: true,
  });
  expect(enabled.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const rolled = applyCommand(enabled.state, { type: "interactLoot", actorId });
  expect(rolled.events.filter((e) => e.type === "provisionRolled")).toEqual([]);
  expect(rolled.events).toContainEqual(
    expect.objectContaining({ type: "lootResolved", reward: { ignoredProvisions: 1 } }),
  );
});

it.each([2, 3] as const)(
  "等级%i村庄补给照常；III Radiant保留随机骰并照加英雄／队伍奖励",
  (level) => {
    const initial = createCoreDungeonQuest(
      0,
      "quest:weald:p001",
      "radiant",
      coreParty,
      wealdTaskSources,
      true,
      null,
      ["core", "weald"],
    );
    const state: GameState = {
      ...initial,
      inventoryOverflow: true,
      dungeon: {
        ...initial.dungeon!,
        campaignLevel: level,
        wealdHigherBosses: true,
        shriekerBossBattles: true,
        shriekerProvisionSkipRolls: true,
        activeBossThreatScriptId: `boss:weald:shrieker:${level}`,
        imminentThreatDescriptionCardId: `boss_ability:weald:p00${level}`,
        nextQuestPartyProvisionDice: 2,
        heroes: initial.dungeon!.heroes.map((h, i) =>
          i === 0 ? { ...h, nextQuestProvisionDice: 2 } : h,
        ),
      },
    };
    let result = applyCommand(state, { type: "rollDungeonProvisions" }),
      rolls = result.events.filter((e) => e.type === "provisionRolled").length;
    for (let i = 0; result.pendingChoice && i < 30; i++) {
      const pending = result.pendingChoice;
      result = applyCommand(result.state, {
        type: "resolveChoice",
        choiceId: pending.id,
        optionId: pending.options.some((o) => o.id === "food") ? "food" : pending.options[0]!.id,
      });
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      rolls += result.events.filter((e) => e.type === "provisionRolled").length;
    }
    expect(rolls).toBe(8);
    expect(result.state.dungeon!.explorationSetup!.provisions).toHaveLength(level === 2 ? 9 : 8);
    if (level === 3) {
      const ids = result.state.dungeon!.explorationSetup!.provisions.map((p) => p.id);
      expect(ids.filter((id) => id.startsWith("dungeon-starting-provision:"))).toHaveLength(4);
      expect(
        ids.some((id) => id.startsWith("dungeon-starting-provision:") && id.endsWith(":1")),
      ).toBe(false);
    }
  },
);
