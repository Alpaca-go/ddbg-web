import { expect, it } from "vitest";
import { applyCommand, type GameState } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import { createBattleState } from "../../../battle";
import { POUNDER_I_SCRIPT_ID } from "./pounder-i";
import { naturalQuest } from "../../../test-helpers/natural-quest";

const packs = ["core", "weald"] as const;
const start: Parameters<typeof createQuestSave>[0] = {
  seed: 17,
  questId: "quest:p001",
  mode: "standard",
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  contentPacks: [...packs],
  bossEdgeRooms: true,
};
const initial = () =>
  createCoreDungeonQuest(
    17,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
const command = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
} as const;

it("显式版本开局、JSON日志恢复及旧版本缓存隔离，未换种子", () => {
  const game = initial();
  const next = applyCommand(game, command);
  expect(next.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(next.state.dungeon!.pounderDungeonThreats).toBe(true);
  expect(next.state.dungeon!.imminentThreatDescriptionCardId).toBe("boss_ability:weald:p007");
  expect(next.state.dungeon!.activeBossThreatScriptId).toBe(POUNDER_I_SCRIPT_ID);
  const save = createQuestSave(start, [command], next.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    next.state,
  );
  const tampered = JSON.parse(JSON.stringify(save));
  delete tampered.snapshot.dungeon.pounderDungeonThreats;
  expect(() => loadQuestSave(tampered, coreQuestSources)).toThrow();
  // 新注册缓存已存在，旧输入仍必须保留原停止结果与骰序。
  const legacyCommand = {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
  } as const;
  const legacy = applyCommand(game, legacyCommand);
  expect(legacy.state.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(legacy.state.dungeon!.unregisteredImminentThreatHold).toContain("brigandPounder");
  expect(legacy.state.dungeon!.cursor).toBe(next.state.dungeon!.cursor);
  const oldSave = createQuestSave(start, [legacyCommand], legacy.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(oldSave)), coreQuestSources).game).toEqual(
    legacy.state,
  );
});

it("缺依赖、Stygian和p019不接受试验标记，原子拒绝", () => {
  const game = initial();
  for (const state of [
    { ...game, dungeon: { ...game.dungeon!, mode: "stygian" as const } },
    createCoreDungeonQuest(
      17,
      "quest:p019",
      "standard",
      coreParty,
      coreQuestSources,
      true,
      null,
      packs,
    ),
  ]) {
    const result = applyCommand(state, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toEqual(state);
  }
  const refused = applyCommand(game, {
    type: "establishImminentThreat",
    pounderDungeonThreats: true,
  });
  expect(refused.state).toEqual(game);
  expect(refused.events.some((e) => e.type === "commandRefused")).toBe(true);
});

it("固定seed17普通任务按原策略自然续行并严格回放真实停点", () => {
  const entered = applyCommand(initial(), command);
  const run = naturalQuest(17, "quest:p001", true, coreQuestSources, 2, {
    continueFrom: entered.state,
  });
  expect({
    phase: run.state.dungeon!.phase,
    stop: run.stopReason ?? null,
    failure: run.state.dungeon!.campaignFailure ?? null,
  }).toMatchSnapshot();
  const save = createQuestSave(start, [command, ...run.commands], run.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(run.state);
}, 180000);

/** 真实卡技能的机制夹具，显式设置战斗位置／回合，不冒称自然部署。 */
function battleFixture(): GameState {
  const dungeon = initial().dungeon!;
  const skill = coreQuestSources.catalog.skills.find((s) => s.id === "hero_skill:p145")!;
  const stat = coreQuestSources.catalog.heroStats.find((s) => s.id === "hero_stat:p013:front")!;
  const monster = coreQuestSources.catalog.monsters.find((m) => m.id === "monster_medium:p021")!;
  const common = { wounds: 0, guard: false, dead: false, bleed: [], blight: [], statusStacks: [] };
  const base = createBattleState(1, {
    skills: [skill],
    heroStats: [stat],
    monsters: [monster],
    light: 5,
    areas: ["a", "b", "c", "d"].map((id, i, all) => ({
      id,
      adjacent: all.filter((_, j) => Math.abs(i - j) === 1),
      capacity: 8,
      elevation: "normal",
    })),
    entities: [
      {
        ...common,
        id: "h",
        side: "hero",
        hero: "PLAGUE DOCTOR",
        heroStatId: stat.id,
        heroLevel: 1,
        life: stat.life,
        dodge: stat.dodge!,
        stress: 0,
        areaId: "a",
        stance: "ranged",
        skillIds: [skill.id],
      },
      {
        ...common,
        id: "m",
        side: "monster",
        hero: null,
        monsterCardId: monster.id,
        life: monster.life!,
        dodge: 0,
        areaId: "b",
        stance: "aggressive",
        stanceSlots: 1,
        skillIds: [],
      },
    ],
  });
  return {
    ...base,
    dungeon: {
      ...dungeon,
      phase: "inBattle",
      pounderDungeonThreats: true,
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
    },
    battle: {
      ...base.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h", actions: 2, usedSkillIds: [] },
      },
    },
  };
}

it("公开Disorienting Blast→Push→Ranged只触发一次，不从区域变化推断", () => {
  const game = battleFixture();
  let result = applyCommand(game, {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "m",
    skillId: "hero_skill:p145",
    shuffleChoice: "push",
  });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  result = applyCommand(result.state, { type: "resolveShuffles" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const target = result.state.battle!.entities.find((e) => e.id === "m")!;
  expect(target.stance).toBe("ranged");
  expect(target.statusStacks).toContainEqual({ kind: "buff", remaining: 2 });
  expect(target.statusStacks).toContainEqual({ kind: "riposte", remaining: 1 });
  const repeated = applyCommand(result.state, { type: "resolveShuffles" });
  expect(repeated.state).toEqual(result.state);
});

it("村庄适配未开放时明确暂停，不悄悄跳过轰炸或消耗骰子", () => {
  const game = initial();
  const state: GameState = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      pounderDungeonThreats: true,
      activeBossThreatScriptId: POUNDER_I_SCRIPT_ID,
      phase: "inHamlet",
    },
  };
  const result = applyCommand(state, { type: "drawHamletEvent" });
  expect(result.events).toContainEqual({
    type: "commandRefused",
    message: "Pounder 村庄轰炸与日末续接尚未开放，保留回村进度",
  });
  expect(result.state).toEqual(state);
});

it.each(["legacy", "ceased", "wrongPack"])("%s 不获得Pounder状态，非法权限整笔拒绝", (kind) => {
  const base = battleFixture();
  const { pounderDungeonThreats: version, ...legacy } = base.dungeon!;
  void version;
  const state: GameState = {
    ...base,
    dungeon: {
      ...(kind === "legacy" ? legacy : base.dungeon!),
      ...(kind === "ceased" ? { bossCombatThreatCeased: POUNDER_I_SCRIPT_ID } : {}),
      ...(kind === "wrongPack" ? { contentPacks: ["core"] } : {}),
    },
  };
  let result = applyCommand(state, {
    type: "playHeroSkill",
    actorId: "h",
    targetId: "m",
    skillId: "hero_skill:p145",
    shuffleChoice: "push",
  });
  if (kind === "wrongPack") {
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toEqual(state);
    return;
  }
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  result = applyCommand(result.state, { type: "resolveShuffles" });
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  const target = result.state.battle!.entities.find((e) => e.id === "m")!;
  expect(target.stance).toBe("ranged");
  expect(target.statusStacks?.some((s) => s.kind === "buff" || s.kind === "riposte")).toBe(false);
});
