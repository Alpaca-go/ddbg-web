import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { replacementHeroCandidates } from "./hero-death-estate";
import {
  VERIFIED_EXTRA_IDS,
  naturalWipeoutReplacementPath,
} from "./test-helpers/wipeout-replacement";
import { coreQuestSources } from "./test-helpers/core-quest";

it("自然全灭命令日志→正式存档往返；驿站III余额4可准备并入队四名已核实额外", () => {
  const path = naturalWipeoutReplacementPath();
  const { awaiting, prepared, start, commands, save } = path;
  expect(awaiting.dungeon!.phase).toBe("awaitingReplacement");
  expect(awaiting.dungeon!.buildingLevels!.stagecoach).toBe(3);
  expect(awaiting.dungeon!.waitingHeroTokens).toBe(4);
  expect(awaiting.dungeon!.heroes.every((h) => h.dead)).toBe(true);
  expect(awaiting.dungeon!.deadHeroNames).toHaveLength(4);
  expect(awaiting.dungeon!.campaignFailure).toBeUndefined();
  expect(replacementHeroCandidates(awaiting.dungeon!).map((c) => c.name)).toEqual([
    "BOUNTY HUNTER",
    "PLAGUE DOCTOR",
    "GRAVE ROBBER",
    "OCCULTIST",
  ]);

  expect(prepared.dungeon!.preparedReplacements).toHaveLength(4);
  expect(prepared.dungeon!.preparedReplacements!.map((p) => p.hero.heroStatId).sort()).toEqual(
    [...VERIFIED_EXTRA_IDS].sort(),
  );
  expect(prepared.dungeon!.waitingHeroTokens).toBe(0);
  expect(replacementHeroCandidates(prepared.dungeon!)).toEqual([]);

  const restored = loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game;
  expect(restored).toEqual(prepared);

  // 从全灭停点起逐条公开准备命令回放，与正式存档一致。
  let replay: GameState = JSON.parse(JSON.stringify(awaiting));
  const prepCommands = commands.slice(
    commands.findIndex((c) => c.type === "prepareReplacementHero"),
  );
  for (const command of prepCommands) {
    const result = applyCommand(replay, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    replay = result.state;
  }
  expect(replay).toEqual(prepared);

  const joined = applyCommand(prepared, { type: "joinPreparedReplacements" }).state;
  expect(joined.dungeon!.heroes.every((h) => !h.dead)).toBe(true);
  expect(joined.dungeon!.heroes.map((h) => h.heroStatId).sort()).toEqual(
    [...VERIFIED_EXTRA_IDS].sort(),
  );
  expect(joined.dungeon!.preparedReplacements).toBeUndefined();
  expect(joined.dungeon!.campaignFailure).toBeUndefined();

  const afterJoin = createQuestSave(
    start,
    [...commands, { type: "joinPreparedReplacements" }],
    joined,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(afterJoin)), coreQuestSources).game).toEqual(
    joined,
  );
}, 120000);
