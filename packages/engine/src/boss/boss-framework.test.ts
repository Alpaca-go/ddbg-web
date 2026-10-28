import { describe, expect, it, beforeEach } from "vitest";
import {
  clearBossScriptsForTest,
  defaultMonsterTurnActionCount,
  encounterRoundRetreatLimit,
  ensureFixtureBossScriptRegistered,
  FIXTURE_BOSS_SCRIPT_ID,
  getBossScript,
  isBossQuestId,
  registerBossScript,
  resolveBossScriptIdForQuest,
  runBossHook,
  FACE_THE_THREAT_QUEST_ID,
  fixtureBossSkeletonScript,
  DEFAULT_BOSS_BATTLE_RULES,
} from "./index";

describe("Phase 5 Boss 框架骨架", () => {
  beforeEach(() => {
    clearBossScriptsForTest();
    ensureFixtureBossScriptRegistered();
  });

  it("fixture 脚本可注册并通过各钩子 stub/探针（无印刷数值）", () => {
    const script = getBossScript(FIXTURE_BOSS_SCRIPT_ID);
    expect(script?.displayName).toBe("Phase5 Skeleton Fixture");
    expect(encounterRoundRetreatLimit(script!.rules)).toBeNull();
    expect(encounterRoundRetreatLimit(null)).toBe(4);

    const dungeonPassive = runBossHook(script!, "threatPassiveDungeon", {
      scriptId: FIXTURE_BOSS_SCRIPT_ID,
      side: "dungeon",
    });
    expect(dungeonPassive.status).toBe("stub");

    const placement = runBossHook(script!, "bossSlotPlacement", {
      scriptId: FIXTURE_BOSS_SCRIPT_ID,
      layoutId: "layout:fixture",
      bossSlotNodeIds: ["A", "B", "G"],
    });
    expect(placement.status).toBe("stub");
    if (placement.status === "stub") expect(placement.hold).toMatch(/R-121/);

    const face = runBossHook(script!, "faceTheThreatEmbark", {
      scriptId: FIXTURE_BOSS_SCRIPT_ID,
      questId: FACE_THE_THREAT_QUEST_ID,
    });
    expect(face.status).toBe("stub");

    const actions = defaultMonsterTurnActionCount(script!, {
      scriptId: FIXTURE_BOSS_SCRIPT_ID,
      monsterEntityId: "monster:fixture",
      round: 1,
    });
    expect(actions.status).toBe("ok");
    if (actions.status === "ok") expect(actions.value).toBe(2);
  });

  it("Boss 任务识别与脚本映射表为空时不编造 script id", () => {
    expect(isBossQuestId("quest:p019")).toBe(true);
    expect(isBossQuestId("quest:p001")).toBe(false);
    expect(resolveBossScriptIdForQuest("quest:p019")).toBeUndefined();
  });

  it("注册表拒绝静默覆盖不同定义", () => {
    registerBossScript(fixtureBossSkeletonScript);
    expect(() =>
      registerBossScript({
        ...fixtureBossSkeletonScript,
        displayName: "other",
      }),
    ).toThrow(/冲突/);
  });

  it("未定义 monsterTurnActionCount 时默认 1 次行动", () => {
    registerBossScript({
      id: "boss:fixture:minimal",
      displayName: "minimal",
      rules: DEFAULT_BOSS_BATTLE_RULES,
      hooks: {},
    });
    const minimal = getBossScript("boss:fixture:minimal")!;
    const count = defaultMonsterTurnActionCount(minimal, {
      scriptId: "boss:fixture:minimal",
      monsterEntityId: "m1",
      round: 3,
    });
    expect(count).toEqual({ status: "ok", value: 1 });
  });
});
