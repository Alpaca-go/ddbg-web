import { expect, it } from "vitest";
import { wealdThreatPool } from "../../../src/weald/bosses/threat-pool";
import { applyCommand, type GameState } from "../../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../../src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../helpers/core-quest";
import { createQuestSave, loadQuestSave } from "../../../src/shared/quest/quest-save";
import { savedCommandSchema, type QuestStart } from "../../../../data/src/quest-save";
import { clearBossScriptsForTest } from "../../../src/core/bosses/registry";

const command = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
  pounderHamletThreats: true,
  pounderBossBattles: true,
  shriekerBossBattles: true,
  wealdHigherBosses: true,
} as const;
const initial = () =>
  createCoreDungeonQuest(0, "quest:p001", "standard", coreParty, coreQuestSources, true, null, [
    "core",
    "weald",
  ]);

it("W3：显式高等级版本包含全部三个当地 Boss，击败身份跨等级排除", () => {
  for (const level of [2, 3] as const) {
    const d = { contentPacks: ["core", "weald"] as const, wealdHigherBosses: true as const };
    const pool = wealdThreatPool(d, level);
    expect(pool).toHaveLength(7);
    expect(pool.slice(4)).toEqual(
      level === 2
        ? ["boss_ability:weald:p014", "boss_ability:weald:p008", "boss_ability:weald:p002"]
        : ["boss_ability:weald:p015", "boss_ability:weald:p009", "boss_ability:weald:p003"],
    );
    expect(wealdThreatPool({ ...d, defeatedWealdBossIdentities: ["hag"] }, level)).toEqual(
      pool.filter((id) => id !== pool[4]),
    );
    expect(() => wealdThreatPool({ contentPacks: d.contentPacks }, level)).toThrow();
  }
});

it("完整新命令的初始日志可严格恢复，删除版本但保留快照被拒绝", () => {
  const source = initial();
  const result = applyCommand(source, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.wealdHigherBosses).toBe(true);
  expect(savedCommandSchema.parse(command)).toEqual(command);
  const start: QuestStart = {
    seed: 0,
    questId: "quest:p001",
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    bossEdgeRooms: true,
    contentPacks: ["core", "weald"],
  };
  const save = createQuestSave(start, [command], result.state, coreQuestSources);
  clearBossScriptsForTest();
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    result.state,
  );
  const bad = { ...save, commands: [{ ...command, wealdHigherBosses: undefined }] };
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(bad)), coreQuestSources)).toThrow();
});

it("高等级升幕后抽牌保持真实全池与固定 RNG，旧版继续保留停点", () => {
  const source = initial();
  const state: GameState = {
    ...source,
    dungeon: {
      ...source.dungeon!,
      campaignLevel: 2,
      locationBossThreats: true,
      bossLocationSources: true,
      wealdHigherBosses: true,
      defeatedWealdBossIdentities: ["hag"],
      defeatedRuinsBossIdentities: [],
    },
  };
  const before = structuredClone(state);
  clearBossScriptsForTest();
  const result = applyCommand(state, { type: "drawImminentThreatAfterActAdvance" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.cursor - state.dungeon!.cursor).toBe(5);
  expect(wealdThreatPool(state.dungeon!, 2)).toContain(
    result.state.dungeon!.imminentThreatDescriptionCardId,
  );
  expect(applyCommand(state, { type: "drawImminentThreatAfterActAdvance" })).toEqual(result);
  expect(state).toEqual(before);
  const { wealdHigherBosses: _version, ...legacy } = state.dungeon!;
  void _version;
  expect(
    applyCommand(
      { ...state, dungeon: legacy },
      { type: "drawImminentThreatAfterActAdvance" },
    ).events.some((e) => e.type === "commandRefused"),
  ).toBe(true);
  expect(applyCommand(source, { ...command, locationSources: undefined }).state).toBe(source);
});
