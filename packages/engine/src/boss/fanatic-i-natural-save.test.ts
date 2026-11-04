import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { coreQuestSources } from "../test-helpers/core-quest";
import { naturalParty, naturalQuest } from "../test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "../quest-save";
import { FANATIC_I_PYRE_MONSTER_CARD_ID } from "./fanatic-i";

it("Fanatic I从任务起点自然探索、击败与回村；战斗中及回村存档严格回放", () => {
  const start = {
    seed: 23,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const checkpoints: { state: GameState; count: number }[] = [];
  let count = 0;
  const run = naturalQuest(23, "quest:p019", false, coreQuestSources, 2, {
    observe(state, command) {
      count++;
      if (
        command.type === "deployFanaticI" ||
        (state.battle?.roomName === "Fanatic Room" && command.type === "startBattle")
      )
        checkpoints.push({ state, count });
    },
  });
  expect(run.stopReason).toBeNull();
  expect(run.commands[0]!.type).toBe("establishImminentThreat");
  expect(run.commands.filter((c) => c.type === "deployFanaticI")).toHaveLength(1);
  expect(checkpoints).toHaveLength(2);
  const deployed = checkpoints[0]!.state.battle!;
  expect(deployed.entities.find((e) => e.id === "boss:fanatic:1")).toMatchObject({
    life: 39,
    wounds: 0,
    dead: false,
    areaId: "B",
  });
  const started = checkpoints[1]!.state.battle!;
  expect(started.entities.find((e) => e.id === "boss:fanatic:pyre")).toMatchObject({
    monsterCardId: FANATIC_I_PYRE_MONSTER_CARD_ID,
    areaId: "E",
  });
  expect(run.state.dungeon).toMatchObject({
    campaignLevel: 1,
    bossQuestVictory: true,
    defeatedRuinsBossIdentities: ["fanatic"],
    phase: "exited",
  });
  expect(run.state.dungeon!.questSummary).toMatchObject({
    xpPerHero: 3,
    stagecoachXp: 3,
    awarded: false,
  });
  expect(run.events.some((e) => e.type === "battleFinished" && e.outcome === "victory")).toBe(true);
  for (const checkpoint of checkpoints) {
    const save = createQuestSave(
      start,
      run.commands.slice(0, checkpoint.count),
      checkpoint.state,
      coreQuestSources,
    );
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
      checkpoint.state,
    );
    const forged = JSON.parse(JSON.stringify(save));
    forged.snapshot.battle.entities.find((e: { id: string }) => e.id === "boss:fanatic:1").wounds++;
    expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  }
  let game = run.state;
  const commands: Command[] = [...run.commands];
  const before = game.dungeon!;
  for (const type of ["beginReturnToHamlet", "finishReturnToHamlet"] as const) {
    const command = { type };
    const result = applyCommand(game, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    game = result.state;
    commands.push(command);
  }
  expect(game.dungeon!.phase).toBe("inHamlet");
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual(before.heroes.map((h) => (h.xp ?? 0) + 3));
  expect(game.dungeon!.stagecoachXp).toBe((before.stagecoachXp ?? 0) + 3);
  const saved = createQuestSave(start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(game);
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.dungeon.gold++;
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  expect(applyCommand(game, { type: "finishReturnToHamlet" }).state).toBe(game);
}, 120000);

it("p019旧占位计划须完整重放后仅升级计划；组合旧入口与篡改拒绝", () => {
  const start = {
    seed: 23,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const initial = createCoreDungeonQuest(
    23,
    start.questId,
    start.mode,
    start.party,
    coreQuestSources,
    true,
  );
  const command = { type: "establishImminentThreat" } as const;
  const fixed = applyCommand(initial, command).state;
  expect(fixed.dungeon!.activeBossThreatScriptId).toBe("boss:ruins:fanatic:1");
  expect(fixed.dungeon!.faceTheThreatEmbarkPlan!.resolvedScriptId).toBe("boss:ruins:fanatic:1");
  const saved = createQuestSave(start, [command], fixed, coreQuestSources);
  for (const oldSetup of [false, true]) {
    const legacy = JSON.parse(JSON.stringify(saved));
    legacy.snapshot.dungeon.faceTheThreatEmbarkPlan = initial.dungeon!.faceTheThreatEmbarkPlan;
    if (oldSetup) {
      delete legacy.snapshot.dungeon.campaignLevel;
      legacy.snapshot.dungeon.explorationSetup.dungeonLevel = 3;
    }
    expect(loadQuestSave(legacy, coreQuestSources).game).toEqual(fixed);
    for (const field of ["gold", "cursor"] as const) {
      const forged = structuredClone(legacy);
      forged.snapshot.dungeon[field]++;
      expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
    }
    const forged = structuredClone(legacy);
    forged.snapshot.dungeon.faceTheThreatEmbarkPlan.combatEntry.combatMonsterCardId =
      "monster_medium:p092";
    expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  }
}, 30000);
