import { expect, it } from "vitest";
import { applyCommand, type Command } from "../../../command";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { drawInitialQuestOffers } from "../../../initial-quest-draw";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import { naturalQuest, CURRENT_WEALD_ROOM_VERSIONS } from "../../../test-helpers/natural-quest";

const packs = ["core", "weald"] as const;
const mode = "hamlet-quest-draw:ruins-two" as const;
const questId = drawInitialQuestOffers(0, packs, mode).offers[0]!;
const initial = () =>
  createCoreDungeonQuest(
    0,
    questId,
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
    mode,
  );
const start = {
  seed: 0,
  questId,
  mode: "standard" as const,
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  contentPacks: [...packs],
  initialQuestDrawMode: mode,
};
const command = {
  type: "establishImminentThreat",
  locationBosses: true,
  locationSources: true,
  pounderDungeonThreats: true,
  pounderHamletThreats: true,
  pounderBossBattles: true,
  shriekerBossBattles: true,
} as const;

it("seed0 原固定身份：新版本抽到实际 Shrieker，旧无标记仍保持停点；reserve待选完整日志恢复", () => {
  const source = initial();
  const result = applyCommand(source, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  expect(result.state.dungeon!.activeBossThreatScriptId).toBe("boss:weald:shrieker:1");
  const { shriekerBossBattles: _flag, ...old } = command;
  void _flag;
  const legacy = applyCommand(source, old);
  expect(legacy.state.dungeon!.activeBossThreatScriptId).toBeUndefined();
  expect(legacy.state.dungeon!.unregisteredImminentThreatHold).toContain("shrieker");
  const commands: Command[] = [command, { type: "rollDungeonProvisions" }];
  let state = applyCommand(result.state, commands[1]!).state;
  for (let i = 0; i < 20 && !state.dungeon!.shriekerTheft; i++) {
    const pending = state.dungeon!.pending!;
    const choice = {
      type: "resolveChoice" as const,
      choiceId: pending.id,
      optionId: pending.options[0]!.id,
    };
    commands.push(choice);
    state = applyCommand(state, choice).state;
  }
  expect(state.dungeon!.shriekerTheft!.side).toBe("reserve");
  const before = state;
  const save = createQuestSave(start, commands, state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(state);
  const pending = state.dungeon!.pending!;
  const chosen = {
    type: "resolveChoice" as const,
    choiceId: pending.id,
    optionId: pending.options[0]!.id,
  };
  commands.push(chosen);
  state = applyCommand(state, chosen).state;
  expect(state.dungeon!.explorationSetup!.provisions).toHaveLength(
    before.dungeon!.explorationSetup!.provisions.length - 1,
  );
  expect(state.dungeon!.shriekerTheft).toBeUndefined();
  const final = createQuestSave(start, commands, state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(final)), coreQuestSources).game).toEqual(state);
});

it("seed0 沿用当前固定探索策略：新威胁版本的自然命令完整严格恢复，保留实际结果", () => {
  const established = applyCommand(initial(), command);
  const run = naturalQuest(0, questId, true, coreQuestSources, 2, {
    ...CURRENT_WEALD_ROOM_VERSIONS,
    continueFrom: established.state,
    handleDeaths: true,
  });
  const commands = [command, ...run.commands];
  const save = createQuestSave(start, commands, run.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(run.state);
  expect({
    stop: run.stopReason,
    phase: run.state.dungeon?.phase,
    summary: run.state.dungeon?.questSummary,
    thefts: commands.filter(
      (c) => c.type === "resolveChoice" && c.choiceId.startsWith("shrieker-theft:"),
    ).length,
  }).toMatchSnapshot();
}, 180000);

it("seed19 固定 Shrieker 身份：完整出发日志保留抵达前败局，不筛胜负", () => {
  const seed = 19;
  const source = createCoreDungeonQuest(
    seed,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    packs,
  );
  const established = applyCommand(source, command);
  expect(established.state.dungeon!.activeBossThreatScriptId).toBe("boss:weald:shrieker:1");
  const run = naturalQuest(seed, "quest:p019", true, coreQuestSources, 2, {
    ...CURRENT_WEALD_ROOM_VERSIONS,
    continueFrom: established.state,
    handleDeaths: true,
  });
  const commands: Command[] = [command, ...run.commands];
  let state = run.state;
  if (
    state.battle?.encounter?.turn.type === "halted" ||
    state.battle?.encounter?.turn.type === "finished"
  ) {
    const finish = { type: "finishDungeonBattle" } as const;
    const result = applyCommand(state, finish);
    if (!result.events.some((e) => e.type === "commandRefused")) {
      state = result.state;
      commands.push(finish);
    }
  }
  const start = {
    seed,
    questId: "quest:p019" as const,
    mode: "standard" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    contentPacks: [...packs],
    bossEdgeRooms: true,
  };
  const save = createQuestSave(start, commands, state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(state);
  expect({
    stop: run.stopReason,
    phase: state.dungeon?.phase,
    deployed: commands.some((c) => c.type === "deployShriekerI"),
    skills: commands.filter((c) => c.type === "playMonsterSkill" && c.actorId === "boss:shrieker")
      .length,
    failure: state.dungeon?.campaignFailure,
    victory: state.dungeon?.bossQuestVictory,
  }).toMatchSnapshot();
});
