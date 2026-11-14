import type { QuestStart } from "../../../../../data/src/quest-save";
import { naturalQuest } from "../../../test-helpers/natural-quest";
import { expect, it } from "vitest";
import { wealdThreatPool } from "./threat-pool";
import { applyCommand, type Command } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import { savedCommandSchema } from "../../../../../data/src/quest-save";
import { clearBossScriptsForTest } from "../../../boss/registry";

const packs = ["core", "weald"] as const;
const command = { type: "establishImminentThreat", locationBosses: true } as const;
function initial(seed: number) {
  return createCoreDungeonQuest(
    seed,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
}

it("W3：四遗迹＋三 Weald 描述卡，未实现的 Boss 不从概率池删除", () => {
  const pool = wealdThreatPool({ contentPacks: packs }, 1);
  expect(pool).toHaveLength(7);
  expect(new Set(pool).size).toBe(7);
  expect(pool.slice(4)).toEqual([
    "boss_ability:weald:p013",
    "boss_ability:weald:p007",
    "boss_ability:weald:p001",
  ]);
  expect(
    wealdThreatPool(
      {
        contentPacks: packs,
        defeatedWealdBossIdentities: ["hag"],
        defeatedRuinsBossIdentities: ["prophet"],
      },
      1,
    ),
  ).toEqual(pool.filter((id) => id !== "boss_ability:weald:p013" && id !== "boss_ability:p007"));
  expect(() => wealdThreatPool({ contentPacks: packs }, 2)).toThrow();
  expect(() => wealdThreatPool({ contentPacks: ["core", "weald", "cove"] }, 1)).toThrow();
  expect(() => wealdThreatPool({ contentPacks: ["core"] }, 1)).toThrow();
  expect(savedCommandSchema.parse(command)).toEqual(command);
});

it.each([17, 23, 7])("固定 seed %s 的完整池抽取可严格存档回放；旧命令不改变", (seed) => {
  const source = initial(seed);
  clearBossScriptsForTest();
  const result = applyCommand(source, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.locationBossThreats).toBe(true);
  expect(result.state.dungeon!.cursor - source.dungeon!.cursor).toBe(6);
  const id = result.state.dungeon!.imminentThreatDescriptionCardId!;
  expect(wealdThreatPool({ contentPacks: packs }, 1)).toContain(id);
  if (["boss_ability:weald:p001", "boss_ability:weald:p007"].includes(id)) {
    expect(result.state.dungeon!.activeBossThreatScriptId).toBeUndefined();
    expect(result.state.dungeon!.unregisteredImminentThreatHold).toBeTruthy();
  } else {
    expect(result.state.dungeon!.activeBossThreatScriptId).toBeTruthy();
  }
  const start: QuestStart = {
    seed,
    questId: "quest:p019",
    mode: "standard",
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
    bossEdgeRooms: true,
    contentPacks: [...packs],
  };
  const save = createQuestSave(start, [command], result.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    result.state,
  );
  expect(applyCommand(result.state, command).state).toBe(result.state);
  const forged = JSON.parse(JSON.stringify(save));
  delete forged.commands[0].locationBosses;
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  const legacy: Command = { type: "establishImminentThreat" };
  const old = applyCommand(source, legacy);
  expect(old.state.dungeon!.locationBossThreats).toBeUndefined();
  expect(old.state.dungeon!.cursor - source.dungeon!.cursor).toBe(3);
  expect(old.state.dungeon!.imminentThreatDescriptionCardId).not.toContain("weald");
});

it("未选包原子拒绝显式地点威胁命令", () => {
  const state = createCoreDungeonQuest(
    17,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core"],
  );
  const result = applyCommand(state, command);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toBe(state);
});

it("固定 seed 17：公开地点威胁命令保留 Brigand Pounder 未实现停点", () => {
  const run = naturalQuest(17, "quest:p019", true, coreQuestSources, 2, {
    continueFrom: initial(17),
    locationBosses: true,
  });
  expect(run.commands[0]).toEqual(command);
  expect({
    description: run.state.dungeon!.imminentThreatDescriptionCardId,
    stopReason: run.stopReason,
    commands: run.commands.length,
  }).toMatchInlineSnapshot(`
    {
      "commands": 1,
      "description": "boss_ability:weald:p007",
      "stopReason": "brigandPounder 迫近威胁脚本未注册（Weald / spec §2.3）；被动与 Face the Threat 仍 hold",
    }
  `);
  expect(run.stopReason).toBe(run.state.dungeon!.unregisteredImminentThreatHold);
  expect(run.commands).toHaveLength(1);
  const start: QuestStart = {
    seed: 17,
    questId: "quest:p019",
    mode: "standard",
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
    bossEdgeRooms: true,
    contentPacks: [...packs],
  };
  const save = createQuestSave(start, run.commands, run.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(run.state);
}, 120000);
