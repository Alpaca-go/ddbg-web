import { expect, it } from "vitest";
import { disinfectionThreeTargets } from "./test-helpers/disinfection-three-targets";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand } from "./command";

it.each([7, 2] as const)(
  "seed %i：三目标消毒、交接、替补及 3 XP 回村严格回放",
  (seed) => {
    const { start, points, run } = disinfectionThreeTargets(seed);
    const disinfected = points.filter((p) => p.commands.at(-1)?.type === "disinfectInfectedOak");
    expect(disinfected).toHaveLength(3);
    expect(new Set(disinfected.map((p) => p.game.dungeon!.position)).size).toBe(3);
    expect(disinfected.map((p) => p.game.dungeon!.disinfectionOakCount)).toEqual([1, 2, 3]);
    for (const after of disinfected) {
      const before = points.find((p) => p.commands.length === after.commands.length - 1)!;
      expect(after.game.dungeon!.roomCards!.active!.cardId).toBe("room:weald:p005");
      expect(
        before.game.battle!.provisions!.filter((p) => p.face === "potion").length -
          after.game.battle!.provisions!.filter((p) => p.face === "potion").length,
      ).toBe(1);
      expect(after.game.dungeon!.disinfectedOakRoomIds).toHaveLength(
        after.game.dungeon!.disinfectionOakCount!,
      );
      expect(
        applyCommand(after.game, after.commands.at(-1)!).events.some(
          (e) => e.type === "commandRefused",
        ),
      ).toBe(true);
    }
    if (seed === 2) {
      const doubleReplacement = points.find(
        (p) =>
          p.game.dungeon!.heroes.filter((h) => h.dead).length === 2 &&
          p.game.dungeon!.preparedReplacements?.length === 2,
      );
      expect(doubleReplacement).toBeDefined();
    }
    for (const point of [...points, { game: run.state, commands: run.commands }]) {
      const save = createQuestSave(start, point.commands, point.game, sources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
    }
    expect(run.state.dungeon!.questSummary).toMatchObject({
      oaksDisinfected: 3,
      xpPerHero: 3,
      stagecoachXp: 3,
    });
    const cleared = run.state.dungeon!.rooms.filter((r) => r.kind === "objective" && r.cleared);
    expect(cleared).toHaveLength(seed === 7 ? 3 : 2);
    let game = run.state;
    const commands = [...run.commands];
    const step = (command: (typeof commands)[number]) => {
      const result = applyCommand(game, command);
      expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      commands.push(command);
      game = result.state;
    };
    step({ type: "beginReturnToHamlet" });
    for (let i = 0; i < 100 && game.dungeon!.hamletReturn?.phase !== "provisions"; i++) {
      const d = game.dungeon!;
      const p = d.pending ?? d.deathTrinketChoice ?? d.replacementPreparation?.choice;
      if (p) {
        step({
          type: "resolveChoice",
          choiceId: p.id,
          optionId:
            d.replacementPreparation?.stage === "upgrades" ? "finish-upgrades" : p.options[0]!.id,
        });
      } else {
        expect(d.hamletReturn?.phase).toBe("awaitingReplacement");
        step({
          type:
            (d.preparedReplacements?.length ?? 0) >= d.heroes.filter((h) => h.dead).length
              ? "joinPreparedReplacements"
              : "prepareReplacementHero",
        });
      }
    }
    step({ type: "finishReturnToHamlet" });
    expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual([3, 3, 3, 3]);
    expect(game.dungeon!.stagecoachXp).toBe(3);
    const save = createQuestSave(start, commands, game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
    for (const patch of [{ disinfectionOakCount: 1 }, { disinfectedOakRoomIds: [] }]) {
      const tampered = JSON.parse(JSON.stringify(save));
      Object.assign(tampered.snapshot.dungeon, patch);
      expect(() => loadQuestSave(tampered, sources)).toThrow();
    }
  },
  120000,
);
