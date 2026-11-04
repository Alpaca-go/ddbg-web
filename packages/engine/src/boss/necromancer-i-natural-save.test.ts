import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { coreQuestSources } from "../test-helpers/core-quest";
import { naturalParty, naturalQuest } from "../test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "../quest-save";

it("Necromancer I从任务起点自然探索、击败与回村；战斗中及回村存档严格回放", () => {
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const checkpoints: { state: GameState; count: number }[] = [];
  let count = 0;
  const run = naturalQuest(2, "quest:p019", false, coreQuestSources, 2, {
    observe(state, command) {
      count++;
      if (
        command.type === "deployNecromancerI" ||
        (state.battle?.roomName === "Necromancer Room" && command.type === "startBattle")
      )
        checkpoints.push({ state, count });
    },
  });
  expect(run.stopReason).toBeNull();
  expect(run.commands[0]!.type).toBe("establishImminentThreat");
  expect(run.commands.filter((c) => c.type === "deployNecromancerI")).toHaveLength(1);
  expect(checkpoints).toHaveLength(2);
  const deployed = checkpoints[0]!.state.battle!;
  expect(deployed.entities.find((e) => e.id === "boss:necromancer:1")).toMatchObject({
    life: 77,
    wounds: 0,
    dead: false,
    areaId: "A",
  });
  expect(run.state.dungeon).toMatchObject({
    campaignLevel: 1,
    bossQuestVictory: true,
    defeatedRuinsBossIdentities: ["necromancer"],
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
    forged.snapshot.battle.entities.find((e: { id: string }) => e.id === "boss:necromancer:1")
      .wounds++;
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

function legacyFaceSave() {
  const start = {
    seed: 2,
    questId: "quest:p019",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const game = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    coreQuestSources,
    true,
  );
  const legacy = JSON.parse(JSON.stringify(createQuestSave(start, [], game, coreQuestSources)));
  delete legacy.snapshot.dungeon.campaignLevel;
  legacy.snapshot.dungeon.explorationSetup.dungeonLevel = 3;
  return { start, game, legacy };
}

it("旧p019入口快照仅迁移DL3占位与缺失战役等级", () => {
  const { start, game, legacy } = legacyFaceSave();
  const loaded = loadQuestSave(legacy, coreQuestSources);
  expect(loaded.game).toEqual(game);
  expect(createQuestSave(start, loaded.commands, loaded.game, coreQuestSources).snapshot).toEqual(
    JSON.parse(JSON.stringify(game)),
  );
});

it.each(["gold", "cursor"] as const)("旧p019快照篡改%s仍拒绝", (field) => {
  const { legacy } = legacyFaceSave();
  const forged = structuredClone(legacy);
  forged.snapshot.dungeon[field]++;
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
});
