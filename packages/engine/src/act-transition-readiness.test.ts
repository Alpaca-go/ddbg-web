import { expect, it } from "vitest";
import { readRuinsActTransitionReadiness } from "./act-transition-readiness";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { RUINS_COMBAT_LEVELS } from "./boss/ruins-combat-levels";
import { ensureCoreBossScriptsRegistered } from "./boss/ensure-core-boss-scripts";
import { getBossScript } from "./boss/registry";
import { RUINS_BOSS_IDENTITIES, type RuinsBossIdentity } from "./boss/threat-description-catalog";
import type { GameState } from "./command";
import type { DungeonState } from "./dungeon";

const start = createCoreDungeonQuest(1, "quest:p019", "radiant", coreParty, coreQuestSources);
ensureCoreBossScriptsRegistered();
/** 明示回村边界机制夹具，不冒称自然Boss部署或正式战役日志。 */
function ready(level: 1 | 2, boss: RuinsBossIdentity): GameState {
  const { activeBossThreatScriptId: _active, ...d } = start.dungeon!;
  void _active;
  const entry = RUINS_COMBAT_LEVELS[boss][level - 1]!;
  return {
    ...start,
    dungeon: {
      ...d,
      phase: "inHamlet",
      campaignLevel: level,
      bossQuestVictory: true,
      pending: null,
      discardedQuests:
        level === 1
          ? ["quest:p001", "quest:p002", "quest:p003"]
          : ["quest:p006", "quest:p007", "quest:p008"],
      defeatedRuinsBossIdentities:
        level === 1 ? [boss] : [RUINS_BOSS_IDENTITIES.find((id) => id !== boss)!, boss],
      bossCombatThreatCeased: entry.script,
      imminentThreatDescriptionCardId: entry.description,
      faceTheThreatEmbarkPlan: {
        questId: "quest:p019",
        resolvedScriptId: entry.script,
        combatEntry: { ...getBossScript(entry.script)!.combatEntry! },
        rulesRef: ["R35"],
        layoutWiringHold: "明示几何未审夹具",
      },
      questSummary: {
        questId: "quest:p019",
        name: "Face the Threat!",
        clearedRoomIds: [],
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: true,
      },
      hamletReturn: { phase: "complete" } as NonNullable<DungeonState["hamletReturn"]>,
    },
  };
}

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
