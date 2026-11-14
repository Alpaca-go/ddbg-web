import { expect, it } from "vitest";
import { fungalResearchThreeObjectives } from "./test-helpers/fungal-research-three-objectives";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { applyCommand } from "./command";
import { prepareObjectiveRoomBattle } from "./dungeon-objective";
import { livingNecroticFungus } from "./expansions/weald/necrotic-fungus";

it("R-246/R-252：三目标旁置牌 secured 后不再抽，带回 4 封顶 3 XP 并严格回放", () => {
  const { start, run, points, clearedBattles } = fungalResearchThreeObjectives();
  const starts = points.filter((p) => p.commands.at(-1)?.type === "startDungeonBattle");
  expect(starts).toHaveLength(3);
  expect(new Set(starts.map((p) => p.game.dungeon!.position)).size).toBe(3);
  const cardIds = starts.map((p) => p.game.dungeon!.roomCards!.active!.cardId);
  expect([...cardIds].sort()).toEqual(["room:weald:p003", "room:weald:p006", "room:weald:p008"]);
  for (const [i, p] of starts.entries()) {
    expect(p.game.dungeon!.fungalResearchSecuredRoomCardIds ?? []).toEqual(cardIds.slice(0, i));
    expect((p.game.dungeon!.roomCards!.deck ?? []).some((id) => cardIds.includes(id))).toBe(false);
  }
  const beforeHandoffs = points.filter((p) => p.game.battle?.encounter?.turn.type === "finished");
  expect(beforeHandoffs).toHaveLength(3);
  expect(beforeHandoffs.every((p) => livingNecroticFungus(p.game.battle!).length >= 1)).toBe(true);
  expect(clearedBattles.filter((b) => b.objective)).toHaveLength(3);
  expect(clearedBattles.every((b) => b.delta === b.destroyed)).toBe(true);
  expect(clearedBattles.reduce((n, b) => n + b.destroyed, 0)).toBe(4);
  expect(run.state.dungeon!.fungalResearchSecuredRoomCardIds).toEqual(cardIds);
  expect(run.state.dungeon!.questSummary).toMatchObject({
    broughtBackCount: 4,
    objectiveMet: true,
    xpPerHero: 3,
    stagecoachXp: 3,
  });
  // 负例仅篡改已取得牌列表；真实场景始终从公开命令构造。
  const first = starts[0]!.game;
  const { battle: _battle, ...outside } = first;
  void _battle;
  for (const secured of [["room:weald:p003", "room:weald:p003"], ["room:weald:p001"]]) {
    const invalid = {
      ...outside,
      dungeon: {
        ...first.dungeon!,
        fungalResearchSecuredRoomCardIds: secured,
        roomCards: { ...first.dungeon!.roomCards!, active: null },
      },
    };
    expect(
      prepareObjectiveRoomBattle(invalid)?.events.some((e) => e.type === "commandRefused"),
    ).toBe(true);
  }
  for (const point of [...points, { game: run.state, commands: run.commands }]) {
    const save = createQuestSave(start, point.commands, point.game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(point.game);
  }
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
  expect(game.dungeon!.heroes.map((h) => h.xp)).toEqual([3, 3, 3, 3]);
  expect(game.dungeon!.stagecoachXp).toBe(3);
  const save = createQuestSave(start, commands, game, sources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  const tampered = JSON.parse(JSON.stringify(save));
  tampered.snapshot.dungeon.fungalResearchSecuredRoomCardIds = [];
  expect(() => loadQuestSave(tampered, sources)).toThrow();
}, 120000);
