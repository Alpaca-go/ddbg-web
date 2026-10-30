import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { caregiversQuest } from "./test-helpers/caregivers-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { conditionPoolProblem } from "./conditions";
import { medicalQuest } from "./test-helpers/medical-quest";
import { createRng } from "./rng";

let baseline: ReturnType<typeof caregiversQuest>;
beforeAll(() => {
  baseline = caregiversQuest();
}, 30000);
function choose(game: GameState, optionId: string) {
  const command: Command = { type: "resolveChoice", choiceId: game.dungeon!.pending!.id, optionId };
  const result = applyCommand(game, command);
  expect(
    result.events.some((event) => event.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return { game: result.state, command };
}
it("真实seed1逐英雄可移除正/负一张或跳过，无怪癖者不产生空选择，全部选完才洗回和启用准备日", () => {
  const original = baseline.game,
    before = structuredClone(original),
    d = original.dungeon!;
  expect(d.hamlet).toMatchObject({
    active: "hamlet_event:p012",
    phase: "eventBlocked",
    preparationDays: null,
    eventRemainingHeroes: ["hero-0", "hero-1", "hero-2"],
  });
  expect(d.hamlet!.deck).toHaveLength(15);
  expect(d.conditions!.quirks.find((quirk) => quirk.id === "quirk:p030")!.polarity).toBe(
    "negative",
  );
  expect(d.conditions!.quirks.find((quirk) => quirk.id === "quirk:p017")!.polarity).toBe(
    "positive",
  );
  expect(d.pending!.actorId).toBe("hero-0");
  expect(d.pending!.options.map((option) => option.id)).toEqual([
    "quirk:p030",
    "quirk:p028",
    "skip",
  ]);
  let game = choose(original, "quirk:p030").game;
  expect(game.dungeon!.pending!.actorId).toBe("hero-1");
  expect(game.dungeon!.cursor).toBe(d.cursor);
  expect(game.dungeon!.heroes[0]!.quirkIds).toEqual(["quirk:p028"]);
  expect(game.dungeon!.heroes[0]!.combat!.quirkIds).toEqual(["quirk:p028"]);
  expect(game.dungeon!.hamlet!.deck).toHaveLength(15);
  expect(game.dungeon!.hamlet!.preparationDays).toBeNull();
  game = choose(game, "quirk:p017").game;
  expect(game.dungeon!.heroes[1]!.quirkIds).toEqual(["quirk:p032", "quirk:p026"]);
  expect(game.dungeon!.pending!.actorId).toBe("hero-2");
  const last = choose(game, "skip");
  game = last.game;
  const n = game.dungeon!;
  expect(n.heroes[2]!.quirkIds).toEqual(["quirk:p034", "quirk:p025"]);
  expect(n.heroes[3]!.quirkIds).toEqual([]);
  expect(n.conditions!.quirkDiscard).toEqual([
    ...d.conditions!.quirkDiscard,
    "quirk:p030",
    "quirk:p017",
  ]);
  expect(conditionPoolProblem(n.conditions!, n.heroes)).toBeNull();
  expect(n.pending).toBeNull();
  expect(n.hamlet).toMatchObject({
    active: null,
    preparationDays: 2,
    phase: "awaitingCaretaker",
    day: 1,
    heroOrder: [],
  });
  expect(n.hamlet!.eventRemainingHeroes).toBeUndefined();
  expect(n.hamlet!.deck).toHaveLength(16);
  expect(n.cursor).toBe(d.cursor + 15);
  expect(n.gold).toBe(d.gold);
  expect(n.heroes.map((hero) => [hero.wounds, hero.stress, hero.xp])).toEqual(
    d.heroes.map((hero) => [hero.wounds, hero.stress, hero.xp]),
  );
  expect(applyCommand(game, last.command).state).toBe(game);
  expect(original).toEqual(before);
});
it("每段真实待选日志可保存回放，刷新不重复移除；最终看守人从同一游标继续", () => {
  let game = baseline.game;
  const commands = [...baseline.commands];
  const replay = () => {
    const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  };
  replay();
  for (const option of ["quirk:p030", "quirk:p017", "skip"]) {
    const result = choose(game, option);
    game = result.game;
    commands.push(result.command);
    replay();
  }
  const command: Command = { type: "rollHamletCaretaker" };
  game = applyCommand(game, command).state;
  commands.push(command);
  replay();
  expect(game.dungeon!.hamlet).toMatchObject({ phase: "heroActions", day: 1, preparationDays: 2 });
}, 30000);
it("其他命令、过期选择、别人的怪癖、坏牌池或英雄队列均原子拒绝；跳过保留持牌", () => {
  const game = baseline.game,
    pending = game.dungeon!.pending!;
  for (const command of [
    { type: "drawHamletEvent" },
    { type: "rollHamletCaretaker" },
    { type: "upgradeHamletBuilding", building: "abbey" },
    { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" },
    { type: "resolveChoice", choiceId: "stale", optionId: "skip" },
    { type: "resolveChoice", choiceId: pending.id, optionId: "quirk:p034" },
  ] as Command[])
    expect(applyCommand(game, command).state).toBe(game);
  const skipped = choose(game, "skip");
  expect(skipped.game.dungeon!.heroes).toBe(game.dungeon!.heroes);
  expect(skipped.game.dungeon!.conditions).toBe(game.dungeon!.conditions);
  expect(applyCommand(skipped.game, skipped.command).state).toBe(skipped.game);
  const d = game.dungeon!;
  for (const broken of [
    {
      ...d,
      conditions: { ...d.conditions!, quirkDiscard: [...d.conditions!.quirkDiscard, "quirk:p030"] },
    },
    { ...d, hamlet: { ...d.hamlet!, deck: [] } },
    { ...d, hamlet: { ...d.hamlet!, eventRemainingHeroes: ["missing"] } },
    { ...d, hamlet: { ...d.hamlet!, eventRemainingHeroes: ["hero-0", "hero-0"] } },
  ]) {
    const bad = { ...game, dungeon: broken };
    expect(
      applyCommand(bad, { type: "resolveChoice", choiceId: pending.id, optionId: "skip" }).state,
    ).toBe(bad);
  }
});
it("全体无怪癖直接完成；初始英雄结构损坏拒绝抽牌，不留下游标或半个事件", () => {
  const s = medicalQuest();
  // 明示事件边界夹具：选择能从当前游标抽到p12的种子，英雄/牌池来自真实入口。
  const cursor = s.game.dungeon!.cursor;
  const seed = Array.from({ length: 300 }, (_, i) => i + 1).find((candidate) => {
    const rng = createRng(candidate);
    for (let i = 0; i < cursor; i++) rng.next();
    const ids = Array.from({ length: 16 }, (_, i) => i + 1);
    for (let i = 15; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    }
    return ids[0] === 12;
  })!;
  const game: GameState = { ...s.game, seed };
  const result = applyCommand(game, { type: "drawHamletEvent" });
  expect(result.state.dungeon!.hamlet).toMatchObject({
    last: "hamlet_event:p012",
    preparationDays: 2,
    phase: "awaitingCaretaker",
  });
  expect(result.pendingChoice).toBeUndefined();
  expect(result.state.dungeon!.cursor).toBe(cursor + 30);
  expect(result.state.dungeon!.heroes).toBe(game.dungeon!.heroes);
  const broken = { ...game, dungeon: { ...game.dungeon!, heroes: game.dungeon!.heroes.slice(1) } };
  expect(applyCommand(broken, { type: "drawHamletEvent" }).state).toBe(broken);
});
