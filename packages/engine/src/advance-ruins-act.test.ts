import { expect, it } from "vitest";
import { applyCommand } from "./command";
import { ruinsActReadyFixture } from "./test-helpers/ruins-act";
import { RUINS_BOSS_IDENTITIES } from "./boss/threat-description-catalog";
import { savedCommandSchema } from "../../data/src/quest-save";
import { switchRuinsActPools } from "./act-transition-pools";
import { drawImminentThreatAfterActAdvance } from "./boss/establish-imminent-threat";
import type { DungeonState } from "./dungeon";
import { createQuestSave } from "./quest-save";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { requiresRuinsActAdvance } from "./act-transition-readiness";

const command = { type: "advanceRuinsAct" } as const;
it("公开命令两级四Boss原子升幕，先抽威胁再洗完整怪物池，重复调用拒绝", () => {
  for (const level of [1, 2] as const)
    for (const boss of RUINS_BOSS_IDENTITIES) {
      const original = ruinsActReadyFixture(level, boss);
      const pools = switchRuinsActPools(
        1,
        original.dungeon!.monsterPool!,
        original.dungeon!.trinkets!,
        original.dungeon!.heroes,
      );
      if (pools.kind !== "ready") throw new Error(pools.reason);
      const state =
        level === 1
          ? original
          : {
              ...original,
              dungeon: {
                ...original.dungeon!,
                monsterPool: pools.monsterPool,
                trinkets: pools.trinkets,
                explorationSetup: { ...original.dungeon!.explorationSetup!, dungeonLevel: 2 },
              },
            };
      const target = (level + 1) as 2 | 3;
      const threatFirst = drawImminentThreatAfterActAdvance(
        { ...state, dungeon: { ...state.dungeon!, campaignLevel: target } },
        { type: "drawImminentThreatAfterActAdvance" },
      );
      const before = structuredClone(state);
      expect(requiresRuinsActAdvance(state.dungeon!)).toBe(true);
      expect(applyCommand(state, { type: "drawHamletEvent" }).state).toBe(state);
      const result = applyCommand(state, command);
      expect(
        result.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(result.events),
      ).toBe(false);
      expect(result.state.dungeon?.campaignLevel).toBe(target);
      expect(requiresRuinsActAdvance(result.state.dungeon!)).toBe(false);
      expect(result.state.dungeon?.monsterPool?.remaining).toHaveLength(level === 1 ? 53 : 62);
      expect(result.state.dungeon?.trinkets?.level).toBe(target);
      expect(result.state.dungeon?.discardedQuests).toHaveLength(level * 5);
      expect(result.state.dungeon?.activeBossThreatScriptId).toBeDefined();
      expect(result.state.dungeon?.imminentThreatDescriptionCardId).not.toBe(
        state.dungeon?.imminentThreatDescriptionCardId,
      );
      expect(result.state.dungeon?.imminentThreatDescriptionCardId).toBe(
        threatFirst.state.dungeon?.imminentThreatDescriptionCardId,
      );
      expect(result.state.dungeon?.cursor).toBe(
        threatFirst.state.dungeon!.cursor + (level === 1 ? 52 : 61),
      );
      expect(applyCommand(state, command)).toEqual(result);
      expect(applyCommand(result.state, command).state).toBe(result.state);
      const village = applyCommand(result.state, { type: "drawHamletEvent" });
      expect(
        village.events.some((e) => e.type === "commandRefused"),
        JSON.stringify(village.events),
      ).toBe(false);
      expect(state).toEqual(before);
    }
});

it("回村机制夹具不能绕过种子日志校验伪装成正式存档", () => {
  const state = applyCommand(ruinsActReadyFixture(1, "necromancer"), command).state;
  expect(() =>
    createQuestSave(
      {
        seed: 1,
        questId: "quest:p019",
        mode: "radiant",
        party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
      },
      [command],
      state,
      coreQuestSources,
    ),
  ).toThrow("无法回放");
});

it("非法源状态或损坏池全量回滚，非法命令字段拒绝进入存档", () => {
  const state = ruinsActReadyFixture(1, "necromancer"),
    d = state.dungeon!;
  const patches: Partial<DungeonState>[] = [
    { cursor: -1 },
    { monsterPool: { ...d.monsterPool!, remaining: [] } },
    { trinkets: { ...d.trinkets!, level: 2 } },
    { buildingLevels: { guild: 9 } as unknown as NonNullable<DungeonState["buildingLevels"]> },
  ];
  for (const patch of patches) {
    const changed = { ...state, dungeon: { ...d, ...patch } },
      before = structuredClone(changed);
    const result = applyCommand(changed, command);
    expect(result.state).toBe(changed);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(changed).toEqual(before);
  }
  expect(savedCommandSchema.safeParse(command).success).toBe(true);
  expect(savedCommandSchema.safeParse({ ...command, campaignLevel: 3 }).success).toBe(false);
});
