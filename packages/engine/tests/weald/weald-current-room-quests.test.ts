import { applyCommand, type Command } from "../../src/command";
import { it, expect } from "vitest";
import { fungalResearchThreeObjectives } from "../../src/test-helpers/fungal-research-three-objectives";
import { disinfectionThreeTargets } from "../../src/test-helpers/disinfection-three-targets";
import { circleOfWitchesJourney } from "../../src/test-helpers/circle-of-witches-quest";
import { purgeTheWoodsJourney } from "../../src/test-helpers/purge-the-woods-quest";
import { patrolTheWoodsJourney } from "../../src/test-helpers/patrol-the-woods-quest";
import { disinfectionSources as sources } from "../../src/test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
const scenarios = [
  ["p001 seed1", () => fungalResearchThreeObjectives(sources, true)],
  ["p002 seed2", () => circleOfWitchesJourney(3, sources, true)],
  ["p003 seed2", () => disinfectionThreeTargets(2, sources, true)],
  ["p004 seed4", () => purgeTheWoodsJourney(sources, true)],
  ["p005 seed3", () => patrolTheWoodsJourney(sources, true)],
] as const;
for (const [name, journey] of scenarios)
  it(`当前页面房间版本 ${name} 严格回放`, () => {
    const { start, run } = journey();
    const d = run.state.dungeon!;
    expect({
      stop: run.stopReason,
      phase: d.phase,
      cleared: d.rooms.filter((r) => r.cleared).length,
      summary: d.questSummary ?? null,
      turn: run.state.battle?.encounter?.turn.type ?? null,
    }).toMatchSnapshot();
    const starts = run.commands.filter((c) => c.type === "startBattle");
    expect(starts.length).toBeGreaterThan(0);
    for (const c of starts)
      expect(c).toMatchObject({
        wealdUnprepared: true,
        wealdPrecious: true,
        wealdAbyssalPuff: true,
        wealdOurs: true,
        wealdClearingHeroes: true,
        wealdClearingMonsters: true,
        allTrinkets: true,
      });
    expect(run.commands.every((c) => c.allTrinkets === true)).toBe(true);
    const attacks = run.commands.filter((c) => c.type === "playMonsterSkill");
    expect(attacks.length).toBeGreaterThan(0);
    expect(attacks.every((c) => c.toxicMushrooms === true)).toBe(true);
    const save = createQuestSave(start, run.commands, run.state, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(run.state);
    if (name === "p001 seed1") {
      expect(run.stopReason).toBe("battle halted: heroesDefeated");
      expect(d.questSummary).toBeUndefined();
      return;
    }
    expect(run.stopReason).toBeNull();
    expect(d.questSummary).toMatchObject({ xpPerHero: 3, stagecoachXp: 3 });
    let game = run.state;
    const commands = [...run.commands];
    const step = (command: Command) => {
      const recorded = {
        ...command,
        allTrinkets: true as const,
        ...(command.type === "resolveChoice" ? { bossEdgeRooms: true as const } : {}),
      };
      const r = applyCommand(game, recorded);
      expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
      commands.push(recorded);
      game = r.state;
    };
    step({ type: "beginReturnToHamlet" });
    for (let i = 0; i < 100 && game.dungeon!.hamletReturn?.phase !== "provisions"; i++) {
      const d = game.dungeon!,
        p = d.pending ?? d.deathTrinketChoice ?? d.replacementPreparation?.choice;
      if (p)
        step({
          type: "resolveChoice",
          choiceId: p.id,
          optionId:
            d.replacementPreparation?.stage === "upgrades" ? "finish-upgrades" : p.options[0]!.id,
        });
      else {
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
    const returned = createQuestSave(start, commands, game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(returned)), sources).game).toEqual(game);
  }, 180000);
