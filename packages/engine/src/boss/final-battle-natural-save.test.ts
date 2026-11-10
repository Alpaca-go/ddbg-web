import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import type { CoreQuestSources } from "../dungeon-quest-entry";
import { expect, it } from "vitest";
import { applyCommand } from "../command";
import type { Command, GameState } from "../command";
import { coreQuestSources } from "../test-helpers/core-quest";
import { naturalParty } from "../test-helpers/natural-quest";
import { naturalFinalBattle } from "../test-helpers/natural-final-battle";
import { createQuestSave, loadQuestSave } from "../quest-save";
import { ANCESTOR_1_MONSTER_CARD_ID } from "./ancestor1-time-heals-all";
import { FINAL_BATTLE_BOSS_CATALOG_CARD_IDS } from "./darkest-boss-catalog";

const preFinalBattleSources = (): CoreQuestSources => ({
  ...coreQuestSources,
  catalog: {
    ...coreQuestSources.catalog,
    monsters: coreQuestSources.catalog.monsters.filter(
      (c) => !(FINAL_BATTLE_BOSS_CATALOG_CARD_IDS as readonly string[]).includes(c.id),
    ),
  },
});

it("p018 固定自然前缀严格回放，若进入最终战则核对首形态部署与开战", () => {
  const start = {
    seed: 3279,
    questId: "quest:p018",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const checkpoints: { state: GameState; count: number }[] = [];
  const observedCommands: Command[] = [];
  let observedState: GameState | undefined;
  let run: ReturnType<typeof naturalFinalBattle>;
  try {
    run = naturalFinalBattle(3279, coreQuestSources, {
      through: "battleStarted",
      observe(state, command) {
        observedState = state;
        observedCommands.push(command);
        if (
          command.type === "deployFinalBattleForm" ||
          (state.battle?.roomName === "Ancestor Room" && command.type === "startBattle")
        )
          checkpoints.push({ state, count: observedCommands.length });
      },
    });
  } catch (error) {
    // R-190：固定路线若打输，验证真实停止点和回放，保留原种子与策略。
    if (!(error instanceof Error) || error.message !== "battle halted: heroesDefeated") throw error;
    expect(observedState?.battle?.encounter?.turn).toMatchObject({
      type: "halted",
      reason: "heroesDefeated",
    });
    const save = createQuestSave(start, observedCommands, observedState!, coreQuestSources);
    expect(loadQuestSave(save, coreQuestSources).game).toEqual(observedState);
    return;
  }
  expect(run.commands[0]!.type).toBe("rollDungeonProvisions");
  expect(run.commands.some((c) => c.type === "beginFinalPreparation")).toBe(true);
  expect(run.commands.some((c) => c.type === "prepareFinalBattleForms")).toBe(true);
  expect(checkpoints).toHaveLength(2);
  const deployed = checkpoints[0]!.state;
  expect(deployed.dungeon!.finalFormSequence!.status).toBe("fighting");
  expect(
    deployed.battle!.entities.find((e) => e.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID),
  ).toMatchObject({
    dead: false,
    areaId: "E",
  });
  const started = checkpoints[1]!.state.battle!;
  expect(started.encounter!.deck).toHaveLength(8);
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
      (e: { monsterCardId?: string }) => e.monsterCardId === ANCESTOR_1_MONSTER_CARD_ID,
    ).wounds++;
    expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  }
  const game = checkpoints[1]!.state;
  const commands: Command[] = run.commands.slice(0, checkpoints[1]!.count);
  const saved = createQuestSave(start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(game);
  const forged = JSON.parse(JSON.stringify(saved));
  forged.snapshot.dungeon.cursor++;
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
  // 战役胜利只由命令回放派生：快照里伪造 campaignVictory 必须被严格校验拦下。
  const forgedVictory = JSON.parse(JSON.stringify(saved));
  forgedVictory.snapshot.dungeon.campaignVictory = true;
  expect(() => loadQuestSave(forgedVictory, coreQuestSources)).toThrow();
  expect(applyCommand(game, { type: "startBattle" }).state).toBe(game);
}, 180000);

it("preFinalBattleBossCatalog 旧目录须完整重放后升级；篡改拒绝", () => {
  const start = {
    seed: 3279,
    questId: "quest:p018",
    mode: "radiant",
    party: naturalParty,
    bossEdgeRooms: true,
  } as const;
  const previous = preFinalBattleSources();
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
