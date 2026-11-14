import { expect, it } from "vitest";
import { purgeTheWoodsJourney } from "./test-helpers/purge-the-woods-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { dungeonMonsterPoolThrough } from "./monster-pool-runtime";
import { recoverHamletPools } from "./hamlet-return-pools";
import { applyCommand } from "./command";

it("R-248/R-251：三巢穴当地池、Dark/Trap 保留与 3 XP 回村严格回放", () => {
  const { start, run, points, battles, darkVisits } = purgeTheWoodsJourney();
  expect(battles.length).toBeGreaterThanOrEqual(3);
  expect(battles.every((b) => b.kind === "lair")).toBe(true);
  expect(battles.every((b) => b.ids.every((id) => id.startsWith("monster-deck:weald:")))).toBe(
    true,
  );
  const d = run.state.dungeon!;
  expect(d.rooms.filter((r) => r.kind === "lair" && r.cleared)).toHaveLength(3);
  expect(d.rooms.filter((r) => r.kind === "dark")).toHaveLength(3);
  expect(d.rooms.filter((r) => r.kind === "trap")).toHaveLength(2);
  expect(d.rooms.filter((r) => r.kind !== "lair").every((r) => !r.cleared)).toBe(true);
  expect(darkVisits.length).toBeGreaterThan(0);
  expect(
    points.some(
      (p) => p.game.dungeon!.rooms.find((r) => r.id === p.game.dungeon!.position)?.kind === "trap",
    ),
  ).toBe(true);
  for (const visit of darkVisits) {
    expect(visit.after).toBe(Math.max(0, visit.before - 1));
    expect(visit.cleared).toBe(false);
  }
  expect(run.commands.some((c) => c.type === "prepareReplacementHero")).toBe(true);
  for (const point of [...points, { game: run.state, commands: run.commands }]) {
    const pool = point.game.dungeon!.monsterPool!;
    expect(pool.monsterDrawScope).toBe("wealdLocalOnly");
    expect(dungeonMonsterPoolThrough(pool, 1)).toHaveLength(14);
    const save = createQuestSave(start, point.commands, point.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
  }
  expect(d.questSummary).toMatchObject({ xpPerHero: 3, stagecoachXp: 3 });
  expect(recoverHamletPools(d, run.state.seed).status).toBe("resolved");
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
  const save = createQuestSave(start, commands, game, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  const tampered = JSON.parse(JSON.stringify(save));
  tampered.snapshot.dungeon.monsterPool.monsterDrawScope = undefined;
  expect(() => loadQuestSave(tampered, sources)).toThrow();
}, 120000);
