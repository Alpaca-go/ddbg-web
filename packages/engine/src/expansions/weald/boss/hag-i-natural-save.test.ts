import { applyCommand, type Command, type GameState } from "../../../command";
import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "../../../dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../test-helpers/core-quest";
import { naturalQuest } from "../../../test-helpers/natural-quest";
import { createQuestSave, loadQuestSave } from "../../../quest-save";
import type { QuestStart } from "../../../../../data/src/quest-save";

// 事先固定完整 0–6 序列，保留全部输入的真实结果；不按输赢筛选或换种子。
it.each([0, 1, 2, 3, 4, 5, 6])(
  "地点 Boss 固定矩阵 seed %s：真实自然停止状态严格回放",
  (seed) => {
    const packs = ["core", "weald"] as const;
    const initial = createCoreDungeonQuest(
      seed,
      "quest:p019",
      "standard",
      coreParty,
      coreQuestSources,
      true,
      null,
      packs,
    );
    const checkpoints = new Map<string, { state: GameState; count: number }>();
    let commandCount = 0;
    const run = naturalQuest(seed, "quest:p019", true, coreQuestSources, 2, {
      continueFrom: initial,
      locationBosses: true,
      locationSources: true,
      observe(state, command) {
        commandCount++;
        if (state.battle?.roomName !== "Hag") return;
        const mark = (name: string) => {
          if (!checkpoints.has(name)) checkpoints.set(name, { state, count: commandCount });
        };
        if (command.type === "deployHagI") mark("deployed");
        if (command.type === "startBattle") mark("started");
        if (state.battle.hagCauldron) mark("captive");
        if (state.battle.pending?.type === "hagRelease") mark("release");
      },
    });
    expect({
      description: run.state.dungeon!.imminentThreatDescriptionCardId,
      stop: run.stopReason,
      phase: run.state.dungeon!.phase,
      failure: run.state.dungeon!.campaignFailure ?? null,
      hagDeployments: run.commands.filter((c) => c.type === "deployHagI").length,
      checkpoints: [...checkpoints.keys()],
    }).toMatchSnapshot();
    if (run.state.dungeon!.unregisteredImminentThreatHold)
      expect(run.stopReason).toBe(run.state.dungeon!.unregisteredImminentThreatHold);
    else {
      expect([
        null,
        "hero died",
        "dungeon halted awaitingReplacement",
        "battle halted: heroesDefeated",
      ]).toContain(run.stopReason);
      if (run.stopReason)
        expect(
          run.state.dungeon!.heroes.some((h) => h.dead) ||
            run.state.battle!.entities.some((e) => e.side === "hero" && e.dead),
        ).toBe(true);
    }
    const start: QuestStart = {
      seed,
      questId: "quest:p019",
      mode: "standard",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
      bossEdgeRooms: true,
      contentPacks: [...packs],
    };
    for (const checkpoint of checkpoints.values()) {
      const saved = createQuestSave(
        start,
        run.commands.slice(0, checkpoint.count),
        checkpoint.state,
        coreQuestSources,
      );
      expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(
        checkpoint.state,
      );
    }
    if (seed === 6) {
      expect(run.state.dungeon!.bossQuestVictory).toBe(true);
      expect(run.state.dungeon!.defeatedWealdBossIdentities).toEqual(["hag"]);
      expect(run.state.dungeon!.questSummary).toMatchObject({
        xpPerHero: 3,
        stagecoachXp: 3,
        awarded: false,
      });
      expect([...checkpoints.keys()]).toEqual(expect.arrayContaining(["deployed", "started"]));
      let returned = run.state;
      const commands: Command[] = [...run.commands];
      for (const type of ["beginReturnToHamlet", "finishReturnToHamlet"] as const) {
        const command = { type };
        const result = applyCommand(returned, command);
        expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
        returned = result.state;
        commands.push(command);
      }
      expect(returned.dungeon!.phase).toBe("inHamlet");
      expect(returned.dungeon!.heroes.map((h) => h.xp)).toEqual(
        run.state.dungeon!.heroes.map((h) => (h.xp ?? 0) + 3),
      );
      expect(returned.dungeon!.stagecoachXp).toBe((run.state.dungeon!.stagecoachXp ?? 0) + 3);
      const saved = createQuestSave(start, commands, returned, coreQuestSources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), coreQuestSources).game).toEqual(
        returned,
      );
      const forged = JSON.parse(JSON.stringify(saved));
      forged.snapshot.dungeon.gold++;
      expect(() => loadQuestSave(forged, coreQuestSources)).toThrow();
      expect(applyCommand(returned, { type: "finishReturnToHamlet" }).state).toBe(returned);
    }
    const save = createQuestSave(start, run.commands, run.state, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(
      run.state,
    );
  },
  120000,
);
