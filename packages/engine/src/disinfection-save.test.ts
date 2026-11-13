import { expect, it } from "vitest";
import { savedCommandSchema } from "../../data/src/quest-save";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { disinfectionJourney, disinfectionSources } from "./test-helpers/disinfection-quest";
import { applyCommand } from "./command";

it("固定公开日志可在消毒前后保存恢复，并继续到任务摘要", () => {
  const journey = disinfectionJourney();
  for (const point of [journey.before, journey.after]) {
    const saved = createQuestSave(journey.start, point.commands, point.game, disinfectionSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(saved)), disinfectionSources).game).toEqual(
      point.game,
    );
  }
  const command = journey.after.commands.at(-1)!;
  expect(journey.before.game.dungeon!.disinfectionOakCount).toBe(0);
  expect(journey.after.game.dungeon!.disinfectionOakCount).toBe(1);
  expect(journey.after.game.dungeon!.disinfectedOakRoomIds).toEqual([
    journey.after.game.dungeon!.position,
  ]);
  const sameRoom = { ...journey.before.game, dungeon: journey.after.game.dungeon! };
  expect(applyCommand(sameRoom, command).state).toBe(sameRoom);
  expect(command.type).toBe("disinfectInfectedOak");
  expect(applyCommand(journey.before.game, command).state).toEqual(journey.after.game);
  expect(
    applyCommand(journey.after.game, command).events.some((e) => e.type === "commandRefused"),
  ).toBe(true);
  expect(journey.run.stopReason).toBeNull();
  expect(journey.run.state.dungeon!.questSummary).toMatchObject({
    xpPerHero: 1,
    oaksDisinfected: 1,
  });
  let game = journey.run.state;
  const commands = [...journey.run.commands];
  const step = (command: (typeof commands)[number]) => {
    const result = applyCommand(game, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    commands.push(command);
    game = result.state;
  };
  step({ type: "beginReturnToHamlet" });
  for (let i = 0; game.dungeon!.pending && i < 100; i++) {
    const pending = game.dungeon!.pending!;
    step({ type: "resolveChoice", choiceId: pending.id, optionId: pending.options[0]!.id });
  }
  step({ type: "finishReturnToHamlet" });
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual([1, 1, 1, 1]);
  expect(game.dungeon!.stagecoachXp).toBe(1);
  const returned = createQuestSave(journey.start, commands, game, disinfectionSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(returned)), disinfectionSources).game).toEqual(
    game,
  );
}, 120000);

it("消毒日志只允许命令和 actorId，不接受计数、药水、区域或奖励注入", () => {
  expect(
    savedCommandSchema.safeParse({ type: "disinfectInfectedOak", actorId: "hero-0" }).success,
  ).toBe(true);
  for (const extra of [
    { disinfectionOakCount: 3 },
    { disinfectedOakRoomIds: ["R1"] },
    { provisions: [] },
    { areaId: "B" },
    { xp: 3 },
  ])
    expect(
      savedCommandSchema.safeParse({ type: "disinfectInfectedOak", actorId: "hero-0", ...extra })
        .success,
    ).toBe(false);
});
