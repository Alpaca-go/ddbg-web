import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { coreQuestSources } from "../test-helpers/core-quest";
import { naturalParty, naturalQuest } from "../test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "../quest-save";
import { MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID } from "./darkest-mammoth-cyst-combat-runtime";

const preMammothSources = (): CoreQuestSources => ({
  ...coreQuestSources,
  catalog: {
    ...coreQuestSources.catalog,
    monsters: coreQuestSources.catalog.monsters.filter(
      (c) => c.id !== MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    ),
  },
});

it("Mammoth Cyst I固定自然路线：战斗停止点或胜利回村严格回放", () => {
  const start = {
    seed: 3279,
    questId: "quest:p018",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const checkpoints: { state: GameState; count: number }[] = [];
  let count = 0;
  const run = naturalQuest(3279, "quest:p018", true, coreQuestSources, 2, {
    observe(state, command) {
      count++;
      if (
        command.type === "deployMammothCystI" ||
        (state.battle?.roomName === "Mammoth Cyst Room" && command.type === "startBattle")
      )
        checkpoints.push({ state, count });
    },
  });
  // R-190、R-201、R-218：保留种子与策略；输赢不作为流程验收目标。
  if (run.stopReason !== null) {
    expect(run.stopReason).toBe("battle halted: heroesDefeated");
    expect(run.state.battle?.encounter?.turn).toMatchObject({
      type: "halted",
      reason: "heroesDefeated",
    });
    expect(checkpoints).toHaveLength(2);
    for (const checkpoint of [...checkpoints, { state: run.state, count: run.commands.length }]) {
      const saved = createQuestSave(
        start,
        run.commands.slice(0, checkpoint.count),
        checkpoint.state,
        coreQuestSources,
      );
      expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(
        checkpoint.state,
      );
      const forged = JSON.parse(JSON.stringify(saved));
      forged.snapshot.dungeon.gold++;
      expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
    }
    return;
  }
  expect(run.stopReason).toBeNull();
  expect(run.commands[0]!.type).toBe("rollDungeonProvisions");
  expect(run.commands.filter((c) => c.type === "deployMammothCystI")).toHaveLength(1);
  expect(checkpoints).toHaveLength(2);
  const deployed = checkpoints[0]!.state.battle!;
  expect(
    deployed.entities.find((e) => e.monsterCardId === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID),
  ).toMatchObject({
    life: 109,
    wounds: 0,
    dead: false,
    areaId: "H",
  });
  const started = checkpoints[1]!.state.battle!;
  expect(started.encounter!.deck).toHaveLength(6);
  expect(run.state.dungeon).toMatchObject({
    bossQuestVictory: true,
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
    forged.snapshot.battle.entities.find(
      (e: { monsterCardId?: string }) => e.monsterCardId === MAMMOTH_CYST_COMBAT_MONSTER_CARD_ID,
    ).wounds++;
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

it("preMammothCyst旧目录须完整重放后升级；篡改拒绝", () => {
  const start = {
    seed: 3279,
    questId: "quest:p018",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const previous = preMammothSources();
  const oldGame = createCoreDungeonQuest(
    3279,
    start.questId,
    start.mode,
    start.party,
    previous,
    true,
  );
  const saved = createQuestSave(start, [], oldGame, previous);
  expect(
    loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources, [previous]).game,
  ).toEqual(
    createCoreDungeonQuest(3279, start.questId, start.mode, start.party, coreQuestSources, true),
  );
  for (const field of ["gold", "cursor"] as const) {
    const forged = JSON.parse(JSON.stringify(saved));
    forged.snapshot.dungeon[field]++;
    expect(() => loadQuestSave(forged, coreQuestSources, [previous])).toThrow();
  }
}, 30000);
