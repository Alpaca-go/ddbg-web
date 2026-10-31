import { expect, it } from "vitest";
import { readRuinsActTransitionReadiness } from "./act-transition-readiness";
import { RUINS_BOSS_IDENTITIES } from "./boss/threat-description-catalog";
import type { DungeonState } from "./dungeon";
import { ruinsActReadyFixture as ready, ruinsActInitial as start } from "./test-helpers/ruins-act";

it("两级四Boss边界夹具读取对应计划，不改状态/游标，返回数据独立", () => {
  for (const level of [1, 2] as const)
    for (const boss of RUINS_BOSS_IDENTITIES) {
      const state = ready(level, boss),
        before = structuredClone(state);
      const result = readRuinsActTransitionReadiness(state);
      expect(result.kind).toBe("ready");
      if (result.kind !== "ready") throw new Error(result.reason);
      expect(result.plan.toLevel).toBe(level + 1);
      expect(result.plan.imminentThreatDescriptionCardIds).toHaveLength(4 - level);
      result.plan.imminentThreatDescriptionCardIds.length = 0;
      expect(readRuinsActTransitionReadiness(state)).not.toEqual(result);
      expect(state).toEqual(before);
    }
});

it("普通/最暗任务、无胜利、未发XP、未回村、待选及未清威胁不能提供计划", () => {
  const state = ready(1, "necromancer"),
    d = state.dungeon!;
  const changes: Partial<DungeonState>[] = [
    { phase: "ready" },
    { campaignLevel: 3 },
    { discardedQuests: [] },
    { questDistribution: { ...d.questDistribution!, questId: "quest:p001" } },
    { questSummary: { ...d.questSummary!, awarded: false } },
    { hamletReturn: { ...d.hamletReturn!, phase: "converting" } },
    { activeBossThreatScriptId: "boss:ruins:necromancer:1" },
    { pending: { type: "probe" } as unknown as NonNullable<DungeonState["pending"]> },
  ];
  for (const patch of changes) {
    const changed = { ...state, dungeon: { ...d, ...patch } },
      before = structuredClone(changed);
    expect(readRuinsActTransitionReadiness(changed).kind).toBe("blocked");
    expect(changed).toEqual(before);
  }
  expect(readRuinsActTransitionReadiness(start).kind).toBe("blocked");
  const { bossQuestVictory: _victory, ...withoutVictory } = d;
  void _victory;
  expect(readRuinsActTransitionReadiness({ ...state, dungeon: withoutVictory }).kind).toBe(
    "blocked",
  );
});

it("拒绝Boss身份/等级/卡引用漂移、重复击败与无效任务记录", () => {
  const state = ready(2, "prophet"),
    d = state.dungeon!,
    embark = d.faceTheThreatEmbarkPlan!;
  for (const patch of [
    { bossCombatThreatCeased: "boss:ruins:prophet:1" },
    { imminentThreatDescriptionCardId: "boss_ability:p007" },
    {
      faceTheThreatEmbarkPlan: {
        ...embark,
        combatEntry: { ...embark.combatEntry, combatMonsterCardId: "monster_large:p005" },
      },
    },
    { defeatedRuinsBossIdentities: ["prophet", "prophet"] },
    { discardedQuests: ["quest:p011"] },
  ] satisfies Partial<DungeonState>[])
    expect(readRuinsActTransitionReadiness({ ...state, dungeon: { ...d, ...patch } }).kind).toBe(
      "blocked",
    );
});
