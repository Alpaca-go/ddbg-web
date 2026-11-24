import { currentHamletHero, hamletActionOptions } from "../../../src/hamlet-actions";
import { expect, it } from "vitest";
import { applyCommand, type Command } from "../../../src/command";
import { createCoreDungeonQuest } from "../../../src/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../src/test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "../../../src/quest-save";
import { naturalQuest } from "../../../src/test-helpers/natural-quest";
import { resolveFaceTheThreatEmbarkForChoose } from "../../../src/boss/face-the-threat-embark-runtime";

const packs = ["core", "weald"] as const;
const start: Parameters<typeof createQuestSave>[0] = {
  seed: 17,
  questId: "quest:p019",
  mode: "standard",
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  contentPacks: [...packs],
  bossEdgeRooms: true,
};
const initial = () =>
  createCoreDungeonQuest(
    17,
    "quest:p019",
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
  pounderHamletThreats: true,
  pounderBossBattles: true,
} as const;

it.each(["dependencies", "level", "pack"])("拒绝新Boss版本 %s 越界且不耗骰序", (kind) => {
  const source = initial();
  const state = {
    ...source,
    dungeon: {
      ...source.dungeon!,
      ...(kind === "level" ? { campaignLevel: 2 as const } : {}),
      ...(kind === "pack" ? { contentPacks: ["core" as const] } : {}),
    },
  };
  const { pounderHamletThreats: _dependency, ...missingDependency } = command;
  void _dependency;
  const result = applyCommand(state, kind === "dependencies" ? missingDependency : command);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(result.state).toEqual(state);
});

it("Stygian 仅拒绝缺生产版本的试验命令", () => {
  const source = initial();
  const stygian = {
    ...source,
    dungeon: { ...source.dungeon!, mode: "stygian" as const, stygianRoomRules: "full" as const },
  };
  const trial = applyCommand(stygian, {
    type: "establishImminentThreat",
    locationBosses: true,
    locationSources: true,
    pounderDungeonThreats: true,
  });
  expect(trial.events.some((e) => e.type === "commandRefused")).toBe(true);
  const production = applyCommand(stygian, command);
  expect(production.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(production.state.dungeon!.pounderBossBattles).toBe(true);
});

it("seed17 新版本p019定威胁重建Weald来源与出征计划，严格日志恢复且拒绝删版本", () => {
  const state = initial();
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon).toMatchObject({
    pounderBossBattles: true,
    bossExpeditionRegion: "weald",
    activeBossThreatScriptId: "boss:weald:brigandPounder:1",
    faceTheThreatEmbarkPlan: {
      resolvedScriptId: "boss:weald:brigandPounder:1",
      roomPlacement: "edgeRoomsR30",
    },
  });
  expect(result.state.dungeon!.monsterPool!.location).toBe("weald");
  const save = createQuestSave(start, [command], result.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
    result.state,
  );
  const tampered = JSON.parse(JSON.stringify(save));
  delete tampered.snapshot.dungeon.pounderBossBattles;
  expect(() => loadQuestSave(tampered, coreQuestSources)).toThrow(/快照与回放不一致/);
  const { pounderBossBattles: _version, ...old } = command;
  void _version;
  const legacy = applyCommand(state, old);
  expect(legacy.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(legacy.state).toEqual(state);
  const { pounderBossBattles: _flag, ...dungeon } = result.state.dungeon!;
  void _flag;
  expect(resolveFaceTheThreatEmbarkForChoose({ ...result.state, dungeon }, "quest:p019").kind).toBe(
    "refused",
  );
});

it.each([false, true])(
  "seed17既有补员流程%s：沿用自然探索策略至真实停点，全部日志严格恢复",
  (handleDeaths) => {
    const established = applyCommand(initial(), command);
    const run = naturalQuest(17, "quest:p019", true, coreQuestSources, 2, {
      continueFrom: established.state,
      handleDeaths,
    });
    const commands: Command[] = [command, ...run.commands];
    const save = createQuestSave(start, commands, run.state, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
      run.state,
    );
    if (!handleDeaths) {
      expect(run.state.dungeon!.phase).toBe("awaitingReplacement");
      expect(run.stopReason).toBe("dungeon halted awaitingReplacement");
      expect(run.commands.some((c) => c.type === "deployPounderI")).toBe(false);
      return;
    }
    expect(
      run.commands.some((c) => c.type === "deployPounderI"),
      JSON.stringify({
        stop: run.stopReason,
        phase: run.state.dungeon!.phase,
        last: run.commands.slice(-4),
      }),
    ).toBe(true);
    expect(run.state.battle?.roomName).toBe("Pounder");
    expect(run.stopReason).toBe("battle halted: heroesDefeated");
    const finished = applyCommand(run.state, { type: "finishDungeonBattle" });
    expect(finished.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(finished.state.dungeon!.campaignFailure).toBe("bossQuestHeroesDefeated");
    const finalSave = createQuestSave(
      start,
      [...commands, { type: "finishDungeonBattle" }],
      finished.state,
      coreQuestSources,
    );
    expect(loadQuestSave(JSON.parse(JSON.stringify(finalSave)), coreQuestSources).game).toEqual(
      finished.state,
    );
  },
);

it("新Boss版本沿seed17原普通任务与村庄策略跨任务保留，完整日志严格恢复", () => {
  const base = createCoreDungeonQuest(
    17,
    "quest:p001",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
  const ok = (state: Parameters<typeof applyCommand>[0], c: Command) => {
    const result = applyCommand(state, c);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    return result;
  };
  const entered = ok(base, command);
  const run = naturalQuest(17, "quest:p001", true, coreQuestSources, 2, {
    continueFrom: entered.state,
  });
  expect(run.stopReason).toBeNull();
  let state = run.state;
  const commands: Command[] = [command, ...run.commands];
  let stop: string | null = null;
  const step = (command: Command) => {
    const result = ok(state, command);
    state = result.state;
    commands.push(command);
  };
  const settle = () => {
    for (let i = 0; i < 40 && state.dungeon!.pending; i++) {
      const p = state.dungeon!.pending!;
      step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
    }
  };
  step({ type: "beginReturnToHamlet" });
  settle();
  step({ type: "finishReturnToHamlet" });
  step({ type: "drawHamletEvent" });
  settle();
  for (let i = 0; i < 100 && state.dungeon!.hamlet!.phase !== "preparationComplete"; i++) {
    if (state.dungeon!.hamlet!.phase === "awaitingCaretaker") {
      step({ type: "rollHamletCaretaker" });
      settle();
      continue;
    }
    const actorId = currentHamletHero(state)?.id;
    if (!actorId) {
      stop = state.dungeon!.phase;
      break;
    }
    const speech: Command = { type: "useHamletSkill", actorId, skill: "zealousSpeech" };
    const legal = !applyCommand(state, speech).events.some((e) => e.type === "commandRefused");
    const service = hamletActionOptions(state)
      .map((o) => o.command)
      .find((c) => c.type === "visitHamletBuilding");
    if (legal) step(speech);
    else if (service) step(service);
    else {
      stop = "村庄无可用建筑服务";
      break;
    }
    settle();
  }
  expect({
    phase: state.dungeon!.phase,
    hamlet: state.dungeon!.hamlet!.phase,
    stop,
  }).toEqual({ phase: "inHamlet", hamlet: "preparationComplete", stop: null });
  expect(state.dungeon!.hamlet!.phase).toBe("preparationComplete");
  step({ type: "offerNextQuest" });
  settle();
  expect(state.dungeon!.pounderBossBattles).toBe(true);
  expect(state.dungeon!.pounderHamletThreats).toBe(true);
  expect(state.dungeon!.pounderDungeonThreats).toBe(true);
  expect(state.dungeon!.phase).toBe("awaitingProvisions");
  const start: Parameters<typeof createQuestSave>[0] = {
    seed: 17,
    questId: "quest:p001",
    mode: "standard",
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
  } as Parameters<typeof createQuestSave>[0];
  const save = createQuestSave(start, commands, state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(state);
}, 180000);
