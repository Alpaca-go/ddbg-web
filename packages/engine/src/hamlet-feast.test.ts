import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { createRng } from "./rng";
import events from "../../data/normalized/corebox/hamlet_event.json";
import raw from "../../data/extract/corebox/raw/hamlet_event.json";
import { rawFileSchema } from "../../data/src/extract/raw";
import { buildHamletEvents } from "../../data/src/normalize/hamlet-event";

const seed = Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => {
  const rng = createRng(seed),
    deck = events.cards.map((c) => c.id);
  for (let i = 0; i < 11; i++) rng.next();
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck[0] === "hamlet_event:p010";
})!;
const start = {
  seed,
  questId: "quest:p001" as const,
  mode: "radiant" as const,
  party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
};
const choose = (game: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: game.dungeon!.pending!.id,
  optionId,
});
function ok(game: GameState, c: Command) {
  const r = applyCommand(game, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  return r.state;
}
function returned() {
  let game = createCoreDungeonQuest(seed, start.questId, start.mode, coreParty, sources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    game = ok(game, c);
    commands.push(c);
  };
  step({ type: "rollDungeonProvisions" });
  while (game.dungeon!.pending) step(choose(game, "torch"));
  step({ type: "leaveDungeon" });
  step(choose(game, "agree"));
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  return { game, commands };
}
let baseline: ReturnType<typeof returned>;
beforeAll(() => {
  baseline = returned();
});
const draw: Command = { type: "drawHamletEvent" };

it("The Feast完整身份/效果行签名守门，只有Lost Shipment继续未实现", () => {
  expect(buildHamletEvents(rawFileSchema.parse(raw))).toEqual(events);
  expect(events.cards[9]).toMatchObject({ runtime: "feast", days: 1 });
  expect(events.cards.filter((c) => c.runtime === "unimplemented").map((c) => c.id)).toEqual([
    "hamlet_event:p003",
  ]);
  for (const field of ["effect", "page", "id"] as const) {
    const changed = structuredClone(rawFileSchema.parse(raw));
    if (field === "effect")
      changed.cards[9]!.faces.front.lines.at(-1)!.text = "fully restore both icons.";
    if (field === "page") changed.cards[9]!.faces.front.page = 9;
    if (field === "id") changed.cards[9]!.id = "hamlet_event:p009";
    expect(() => buildHamletEvents(changed)).toThrow("The Feast身份或完整效果行漂移");
  }
});

it("自然抽完整牌池，逐英雄恢复/放弃，全部完成才洗回一次、启用一天；待选及完成正式存档恢复", () => {
  let game = baseline.game;
  const commands = [...baseline.commands];
  const step = (c: Command) => {
    game = ok(game, c);
    commands.push(c);
  };
  const save = () =>
    expect(
      loadQuestSave(
        JSON.parse(JSON.stringify(createQuestSave(start, commands, game, sources))),
        sources,
      ).game,
    ).toEqual(game);
  const before = structuredClone(game),
    initialCursor = game.dungeon!.cursor;
  step(draw);
  expect(game.dungeon!.hamlet).toMatchObject({
    active: "hamlet_event:p010",
    phase: "eventBlocked",
    preparationDays: null,
  });
  expect(game.dungeon!.hamlet!.deck).toHaveLength(15);
  expect(game.dungeon!.cursor).toBe(initialCursor + 15);
  expect(before.dungeon!.hamlet).toBeUndefined();
  save();
  for (const [i, option] of ["stress", "wounds", "skip", "wounds"].entries()) {
    expect(game.dungeon!.pending!.actorId).toBe(`hero-${i}`);
    step(choose(game, option));
    expect(game.dungeon!.cursor).toBe(initialCursor + (i === 3 ? 30 : 15));
    if (i === 1) save();
  }
  expect(game.dungeon!.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 1,
  });
  expect(game.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(game.dungeon!.hamlet!.eventRemainingHeroes).toBeUndefined();
  expect(game.dungeon!.gold).toBe(before.dungeon!.gold);
  expect(game.dungeon!.conditions).toEqual(before.dungeon!.conditions);
  expect(applyCommand(game, draw).state).toBe(game);
  save();
  step({ type: "rollHamletCaretaker" });
  step({ type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" });
  expect(game.dungeon!.hamlet!.phase).toBe("preparationComplete");
  save();
}, 20000);

/** 明示伤口/怪癖/战斗投影夹具；不声称这些由该自然退出任务获得。 */
function injured(): GameState {
  const b = baseline.game,
    d = b.dungeon!;
  return {
    ...b,
    dungeon: {
      ...d,
      conditions: { ...d.conditions!, positiveDeck: null, negativeDeck: null, quirkDiscard: [] },
      heroes: d.heroes.map((h, i) => {
        const wounds = i === 3 ? h.life! : 7,
          stress = 8,
          quirkIds = [["quirk:p022"], ["quirk:p003"], ["quirk:p009"], []][i]!;
        return {
          ...h,
          wounds,
          stress,
          quirkIds,
          combat: {
            id: h.id,
            side: "hero" as const,
            areaId: "A",
            hero: coreParty[i]!.heroStatId,
            skillIds: h.skillIds!,
            guard: false,
            dead: false,
            wounds,
            stress,
            dodge: 0,
            bleed: [],
            blight: [],
            quirkIds,
          },
        };
      }),
    },
  };
}

it("R-086 Infirm七伤口仍清零；Fast Healer/Resilient不改变另一轨，死门英雄清零不掷骰，投影一致", () => {
  const fixture = injured(),
    before = structuredClone(fixture);
  let game = ok(fixture, draw);
  const cursor = game.dungeon!.cursor;
  for (const option of ["wounds", "stress", "skip", "wounds"])
    game = ok(game, choose(game, option));
  expect(game.dungeon!.heroes.map((h) => [h.wounds, h.stress])).toEqual([
    [0, 8],
    [7, 0],
    [7, 8],
    [0, 8],
  ]);
  expect(game.dungeon!.heroes.map((h) => [h.combat!.wounds, h.combat!.stress])).toEqual([
    [0, 8],
    [7, 0],
    [7, 8],
    [0, 8],
  ]);
  expect(game.dungeon!.heroes.map((h) => h.quirkIds)).toEqual(
    fixture.dungeon!.heroes.map((h) => h.quirkIds),
  );
  expect(game.dungeon!.cursor).toBe(cursor + 15);
  expect(fixture).toEqual(before);
  // Fast Healer/Resilient各自也能选对应轨，仍只归零，不溢出或改另一轨。
  let other = ok(fixture, draw);
  for (const option of ["skip", "wounds", "stress", "skip"])
    other = ok(other, choose(other, option));
  expect(other.dungeon!.heroes.map((h) => [h.wounds, h.stress])).toEqual([
    [7, 8],
    [0, 8],
    [7, 0],
    [fixture.dungeon!.heroes[3]!.life!, 8],
  ]);
});

it("事件待选冻结无关命令；非法/过期选择、重复恢复均原子拒绝", () => {
  const game = ok(injured(), draw),
    before = structuredClone(game);
  for (const command of [
    draw,
    { type: "rollHamletCaretaker" },
    { type: "offerNextQuest" },
    { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" },
    { type: "ping", message: "blocked" },
    choose(game, "both"),
    { ...choose(game, "wounds"), choiceId: "expired" },
  ] as Command[])
    expect(applyCommand(game, command).state).toBe(game);
  const command = choose(game, "wounds"),
    next = ok(game, command);
  expect(applyCommand(next, command).state).toBe(next);
  expect(game).toEqual(before);
});

it("死亡/失效Life/异常压力或缺牌池时抽牌整体拒绝，不丢事件、不消费RNG", () => {
  const b = injured(),
    d = b.dungeon!;
  for (const patch of [
    { dead: true },
    { life: 999 },
    { wounds: -1 },
    { stress: 10 },
    { attributesVerified: false },
  ]) {
    const fixture = {
      ...b,
      dungeon: { ...d, heroes: d.heroes.map((h, i) => (i === 2 ? { ...h, ...patch } : h)) },
    };
    expect(applyCommand(fixture, draw).state).toBe(fixture);
  }
  const badPool = {
    ...b,
    dungeon: { ...d, conditions: { ...d.conditions!, quirkDiscard: ["quirk:p022"] } },
  };
  expect(applyCommand(badPool, draw).state).toBe(badPool);
});
