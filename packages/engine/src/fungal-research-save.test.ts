import { expect, it } from "vitest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand } from "./command";
import { livingNecroticFungus } from "./expansions/weald/necrotic-fungus";
import { fungalResearchJourney } from "./test-helpers/fungal-research-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";

it.each([
  ["retain-one", 1, true, 1],
  ["destroy-all", 2, false, 0],
] as const)(
  "公开日志 %s：目标、带回、回村 XP 分开结算且严格回放",
  (strategy, broughtBack, objectiveMet, remaining) => {
    const { start, points, run } = fungalResearchJourney(strategy);
    const finished = points.find((p) => p.game.battle?.encounter?.turn.type === "finished")!;
    expect(finished).toBeDefined();
    expect(
      finished.game.dungeon!.rooms.find((r) => r.id === finished.game.dungeon!.position)!.kind,
    ).toBe("objective");
    expect(livingNecroticFungus(finished.game.battle!)).toHaveLength(remaining);
    expect(finished.game.dungeon!.necroticFungusBroughtBackCount ?? 0).toBe(0);
    expect(
      points.some((p) => p.game.battle?.entities.some((e) => e.necroticFungus && e.dead)),
    ).toBe(true);
    for (const point of [...points, { game: run.state, commands: run.commands }]) {
      const save = createQuestSave(start, point.commands, point.game, sources);
      expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
    }
    expect(run.state.dungeon!.questSummary).toMatchObject({
      broughtBackCount: broughtBack,
      objectiveMet,
      xpPerHero: broughtBack,
      stagecoachXp: broughtBack,
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
    expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual(Array(4).fill(broughtBack));
    expect(game.dungeon!.stagecoachXp).toBe(broughtBack);
    const save = createQuestSave(start, commands, game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
    const tampered = JSON.parse(JSON.stringify(save));
    tampered.snapshot.dungeon.necroticFungusBroughtBackCount = 99;
    expect(() => loadQuestSave(tampered, sources)).toThrow();
  },
  120000,
);
