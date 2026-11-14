import { expect, it } from "vitest";
import { circleOfWitchesJourney } from "./test-helpers/circle-of-witches-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand } from "./command";
import { WEALD_CRONE_EXCEPTION_INSTANCE_ID as croneId } from "./expansions/weald/circle-of-witches-spawn";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";

it.each([1, 3] as const)(
  "公开日志击杀 %i 只 Crone：目标、组件复用、XP 与回村严格回放",
  (kills) => {
    const { start, run, points } = circleOfWitchesJourney(kills);
    const starts = points.filter((p) => p.commands.at(-1)?.type === "startDungeonBattle");
    expect(starts).toHaveLength(kills);
    expect(new Set(starts.map((p) => p.game.dungeon!.position)).size).toBe(kills);
    for (const { game } of starts) {
      expect(game.dungeon!.roomCards!.active!.cardId).toBe("room:weald:p009");
      expect(game.dungeon!.questExceptionComponentAvailable).toBe(false);
      expect(game.battle!.entities.filter((e) => e.id === croneId)).toHaveLength(1);
      expect(dungeonMonsterPoolThrough(game.dungeon!.monsterPool!, 1)).toHaveLength(45);
      expect(
        dungeonMonsterPoolThrough(game.dungeon!.monsterPool!, 1).some(
          (e) => e.instanceId === croneId,
        ),
      ).toBe(false);
    }
    const handoffs = points.filter((p) => p.commands.at(-1)?.type === "finishDungeonBattle");
    expect(handoffs).toHaveLength(kills);
    expect(handoffs.map((p) => p.game.dungeon!.questExceptionCroneKills)).toEqual(
      Array.from({ length: kills }, (_, i) => i + 1),
    );
    expect(handoffs.every((p) => p.game.dungeon!.questExceptionComponentAvailable)).toBe(true);
    for (const point of [...points, { game: run.state, commands: run.commands }]) {
      const save = createQuestSave(start, point.commands, point.game, sources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
    }
    expect(run.state.dungeon!.questSummary).toMatchObject({
      croneKills: kills,
      xpPerHero: kills,
      stagecoachXp: kills,
    });
    let game = run.state;
    const commands = [...run.commands];
    const step = (command: (typeof commands)[number]) => {
      const result = applyCommand(game, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      commands.push(command);
      game = result.state;
    };
    step({ type: "beginReturnToHamlet" });
    for (let i = 0; game.dungeon!.pending && i < 100; i++) {
      const p = game.dungeon!.pending!;
      step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
    }
    step({ type: "finishReturnToHamlet" });
    expect(game.dungeon!.heroes.filter((h) => !h.dead).map((h) => h.xp)).toEqual(
      Array(4).fill(kills),
    );
    expect(game.dungeon!.stagecoachXp).toBe(kills);
    const save = createQuestSave(start, commands, game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
    const tampered = JSON.parse(JSON.stringify(save));
    tampered.snapshot.dungeon.questExceptionCroneKills = 0;
    expect(() => loadQuestSave(tampered, sources)).toThrow();
  },
  120000,
);
