import { applyCommand, type Command } from "../../src/command";
import { expect, it } from "vitest";
import { fungalResearchThreeObjectives } from "../../src/test-helpers/fungal-research-three-objectives";
import { disinfectionSources as sources } from "../../src/test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "../../src/quest-save";
it("seed1 当前版本独立保全全部真菌策略：真实结果与完整日志", () => {
  const { start, run, clearedBattles } = fungalResearchThreeObjectives(sources, true, "retain-all");
  expect({
    stop: run.stopReason,
    phase: run.state.dungeon!.phase,
    summary: run.state.dungeon!.questSummary ?? null,
    clearedBattles,
  }).toMatchSnapshot();
  expect(run.stopReason).toBeNull();
  expect(run.state.dungeon!.questSummary).toMatchObject({
    objectiveMet: true,
    broughtBackCount: 0,
    xpPerHero: 0,
    stagecoachXp: 0,
  });
  expect(clearedBattles).toHaveLength(3);
  expect(clearedBattles.every((b) => b.objective && b.living > 0 && b.destroyed === 0)).toBe(true);
  let replay = run.initial;
  for (const command of run.commands) {
    const liveFungi =
      replay.battle?.entities.filter((e) => e.necroticFungus && !e.dead).map((e) => e.id) ?? [];
    if (command.type === "playHeroSkill") expect(liveFungi).not.toContain(command.targetId);
    if (command.type === "playHeroSkillTargets")
      expect(command.targetIds.some((id) => liveFungi.includes(id))).toBe(false);
    const result = applyCommand(replay, command);
    expect(
      result.events.some(
        (e) =>
          e.type === "commandRefused" ||
          (e.type === "passiveTriggered" && e.trigger === "abyssalPuff"),
      ),
    ).toBe(false);
    replay = result.state;
  }
  expect(replay).toEqual(run.state);
  const save = createQuestSave(start, run.commands, run.state, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(run.state);
  let game = run.state;
  const commands = [...run.commands];
  const step = (c: Command) => {
    const recorded = {
      ...c,
      allTrinkets: true as const,
      ...(c.type === "resolveChoice" ? { bossEdgeRooms: true as const } : {}),
    };
    const r = applyCommand(game, recorded);
    expect(r.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    game = r.state;
    commands.push(recorded);
  };
  step({ type: "beginReturnToHamlet" });
  for (let i = 0; game.dungeon!.pending && i < 100; i++) {
    const p = game.dungeon!.pending!;
    step({ type: "resolveChoice", choiceId: p.id, optionId: p.options[0]!.id });
  }
  step({ type: "finishReturnToHamlet" });
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual([0, 0, 0, 0]);
  expect(game.dungeon!.stagecoachXp).toBe(0);
  const returned = createQuestSave(start, commands, game, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(returned)), sources).game).toEqual(game);
}, 180000);
