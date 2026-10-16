import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import type { DungeonState } from "./dungeon";
import { canSetDungeonStances } from "./dungeon-stances";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { replacementStep as ok } from "./test-helpers/replacement";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { savedCommandSchema } from "../../data/src/quest-save";

function ready() {
  let game = createCoreDungeonQuest(31, "quest:p001", "standard", coreParty, coreQuestSources);
  game = ok(game, { type: "rollDungeonProvisions" });
  while (game.dungeon!.pending)
    game = ok(game, {
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: game.dungeon!.pending!.options[0]!.id,
    });
  return game;
}
const reverse: Command = {
  type: "setDungeonStances",
  heroIds: ["hero-3", "hero-2", "hero-1", "hero-0"],
};
const patch = (game: GameState, fields: Partial<DungeonState>): GameState => ({
  ...game,
  dungeon: { ...game.dungeon!, ...fields },
});
it("完整排列免费调整四姿态；不改英雄持牌/资源、位置、地图、光照或RNG，同种子与JSON续接一致", () => {
  const game = ready(),
    before = structuredClone(game),
    result = applyCommand(game, reverse),
    d = result.state.dungeon!;
  expect(canSetDungeonStances(game)).toBe(true);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(d.heroes.map((h) => h.id)).toEqual(["hero-3", "hero-2", "hero-1", "hero-0"]);
  expect(d.heroes.map((h) => h.stance)).toEqual(["aggressive", "defensive", "ranged", "support"]);
  for (const hero of d.heroes)
    expect(hero).toEqual({
      ...game.dungeon!.heroes.find((h) => h.id === hero.id)!,
      stance: hero.stance,
    });
  const { heroes: _old, ...oldRest } = game.dungeon!;
  const { heroes: _next, ...nextRest } = d;
  void _old;
  void _next;
  expect(nextRest).toEqual(oldRest);
  expect(game).toEqual(before);
  expect(applyCommand(JSON.parse(JSON.stringify(game)), reverse)).toEqual(result);
  expect(applyCommand(game, reverse)).toEqual(result);
  expect(savedCommandSchema.parse(reverse)).toEqual(reverse);
});
it("不完整/重复/陌生id、非法原姿态/压力、死亡或待补人状态均原子拒绝", () => {
  const game = ready();
  for (const heroIds of [
    ["hero-0"],
    ["hero-0", "hero-1", "hero-2", "hero-2"],
    ["hero-0", "hero-1", "hero-2", "stranger"],
  ]) {
    expect(applyCommand(game, { type: "setDungeonStances", heroIds }).state).toBe(game);
    if (heroIds.length !== 4 || new Set(heroIds).size !== 4)
      expect(savedCommandSchema.safeParse({ type: "setDungeonStances", heroIds }).success).toBe(
        false,
      );
  }
  for (const h of [
    { dead: true },
    { stress: 10 },
    { stress: -1 },
    { stance: "support" as const },
  ]) {
    const bad = patch(game, {
      heroes: game.dungeon!.heroes.map((hero, i) => (i ? hero : { ...hero, ...h })),
    });
    expect(canSetDungeonStances(bad)).toBe(false);
    expect(applyCommand(bad, reverse).state).toBe(bad);
  }
  const failed = patch(game, { campaignFailure: "noWaitingHeroes" });
  expect(applyCommand(failed, reverse).state).toBe(failed);
});
it("待选、开局/房间/Curio/回村/离开及已掷危险结算不插入换位，保留原步骤和骰序", () => {
  const game = ready(),
    fields: Partial<DungeonState>[] = [
      ...(
        [
          "awaitingProvisions",
          "awaitingRoom",
          "awaitingCurio",
          "blockedPressure",
          "awaitingReplacement",
          "exited",
          "inHamlet",
          "returningToHamlet",
        ] as const
      ).map((phase) => ({ phase })),
      { pending: { id: "original", prompt: "原待选", options: [] } },
      { replacementResume: "ready" },
      { roomResolution: { roomId: "G", dungeonLevel: 1, resolvedHeroIds: [], completed: false } },
      {
        phase: "awaitingHazards",
        exploration: {
          from: "S",
          to: "G",
          dicePerHero: 2,
          rolls: [{ id: "hero-0:1", heroId: "hero-0", face: "blank", resolved: false }],
        },
      },
      {
        phase: "ready",
        exploration: {
          from: "S",
          to: "G",
          dicePerHero: 2,
          rolls: [{ id: "hero-0:1", heroId: "hero-0", face: "blank", resolved: false }],
        },
      },
    ];
  for (const field of fields) {
    const bad = patch(game, field),
      before = structuredClone(bad);
    expect(canSetDungeonStances(bad)).toBe(false);
    expect(applyCommand(bad, reverse).state).toBe(bad);
    expect(bad).toEqual(before);
  }
});
it("路线已选但未掷骰时仍可调整；后续骰归属/先后按新姿态，骰面序列与消耗量保持同种子", () => {
  let game = ok(ready(), { type: "beginDungeonExploration" });
  game = ok(game, {
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options[0]!.id,
  });
  const original = applyCommand(game, { type: "rollDungeonExploration" }).state;
  expect(canSetDungeonStances(game)).toBe(true);
  const reordered = ok(game, reverse);
  expect(reordered.dungeon!.cursor).toBe(game.dungeon!.cursor);
  const rolled = ok(reordered, { type: "rollDungeonExploration" });
  expect(rolled.dungeon!.exploration!.rolls!.slice(0, 2).map((r) => r.heroId)).toEqual([
    "hero-3",
    "hero-3",
  ]);
  expect(rolled.dungeon!.exploration!.rolls!.map((r) => r.face)).toEqual(
    original.dungeon!.exploration!.rolls!.map((r) => r.face),
  );
  expect(rolled.dungeon!.cursor).toBe(original.dungeon!.cursor);
  expect(canSetDungeonStances(rolled)).toBe(false);
  expect(applyCommand(rolled, reverse).state).toBe(rolled);
});
it("正式入口换位及掷骰前检查点可保存/读取，严格拒绝额外状态字段和篡改快照", () => {
  const start = {
    seed: 31,
    questId: "quest:p001" as const,
    mode: "standard" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  let game = createCoreDungeonQuest(31, start.questId, start.mode, coreParty, coreQuestSources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    game = ok(game, c);
    commands.push(c);
  };
  const saved = () => {
    const save = createQuestSave(start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
    return save;
  };
  step({ type: "rollDungeonProvisions" });
  while (game.dungeon!.pending)
    step({
      type: "resolveChoice",
      choiceId: game.dungeon!.pending!.id,
      optionId: game.dungeon!.pending!.options[0]!.id,
    });
  step(reverse);
  saved();
  step({ type: "beginDungeonExploration" });
  step({
    type: "resolveChoice",
    choiceId: game.dungeon!.pending!.id,
    optionId: game.dungeon!.pending!.options[0]!.id,
  });
  step({ type: "setDungeonStances", heroIds: ["hero-1", "hero-3", "hero-0", "hero-2"] });
  const save = saved();
  const forged = {
    ...save,
    snapshot: { ...game, dungeon: { ...game.dungeon!, cursor: game.dungeon!.cursor + 1 } },
  };
  expect(() => loadQuestSave(forged, coreQuestSources)).toThrow(/不一致/);
  expect(savedCommandSchema.safeParse({ ...reverse, cursor: 0 }).success).toBe(false);
});
