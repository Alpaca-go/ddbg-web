import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources as sources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { trinketPoolProblem } from "./trinket-acquisition";
import { createRng } from "./rng";
import { caretakerBuilding } from "./hamlet-event";
import events from "../../data/normalized/corebox/hamlet_event.json";
import raw from "../../data/extract/corebox/raw/hamlet_event.json";
import { rawFileSchema } from "../../data/src/extract/raw";
import { buildHamletEvents } from "../../data/src/normalize/hamlet-event";

// 从完整牌池固定搜索自然起点；选不会封锁两次游商/首日疗养院的种子，不改产品牌序。
const seed = Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => {
  const rng = createRng(seed),
    deck = events.cards.map((c) => c.id);
  for (let i = 0; i < 11; i++) rng.next();
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  if (deck[0] !== "hamlet_event:p009") return false;
  for (let i = 0; i < 15; i++) rng.next(); // 事件洗回。
  const first = caretakerBuilding(Math.floor(rng.next() * 10) + 1);
  for (let i = 0; i < 13; i++) rng.next(); // 14张I级饰品牌堆洗牌。
  const second = caretakerBuilding(Math.floor(rng.next() * 10) + 1);
  return first !== "nomadWagon" && first !== "sanitarium" && second !== "nomadWagon";
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
function journey() {
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
  const before = game;
  step({ type: "drawHamletEvent" });
  const drawn = game;
  step({ type: "rollHamletCaretaker" });
  step({ type: "visitNomadWagon", actorId: "hero-0" });
  step(choose(game, game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id));
  step(choose(game, "equip:hero-0"));
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "heal5", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  return { game, commands, drawn, before };
}
let baseline: ReturnType<typeof journey>;
beforeAll(() => {
  baseline = journey();
}, 20000);
function shop() {
  return ok(baseline.game, { type: "visitNomadWagon", actorId: "hero-0" });
}
const sale = (game: GameState) =>
  game.dungeon!.pending!.options.find((o) => o.id.startsWith("sell:"))!.id;

it("Gypsy限定身份/天数/完整效果行守门，规范化只启用该事件", () => {
  expect(buildHamletEvents(rawFileSchema.parse(raw))).toEqual(events);
  expect(events.cards[8]).toMatchObject({ runtime: "gypsyTrail", days: 2 });
  for (const field of ["effect", "page", "id"] as const) {
    const changed = structuredClone(rawFileSchema.parse(raw));
    if (field === "effect")
      changed.cards[8]!.faces.front.lines.at(-2)!.text = "Heroes gain +6 {icon:08a25c05cf} when";
    if (field === "page") changed.cards[8]!.faces.front.page = 10;
    if (field === "id") changed.cards[8]!.id = "hamlet_event:p010";
    expect(() => buildHamletEvents(changed)).toThrow("Gypsy Trail身份或完整效果行漂移");
  }
});

it("自然抽Gypsy只启用两天准备；首日实际购买、次日出售7金，牌池/洗牌/行动不变，正式存档恢复", () => {
  const { drawn, before } = baseline;
  expect(drawn.dungeon!.hamlet).toMatchObject({
    last: "hamlet_event:p009",
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 2,
  });
  expect(drawn.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(drawn.dungeon!.cursor).toBe(before.dungeon!.cursor + 30);
  expect(drawn.dungeon!.gold).toBe(before.dungeon!.gold);
  let game = shop();
  const commands = [...baseline.commands, { type: "visitNomadWagon", actorId: "hero-0" } as const];
  const save = () =>
    expect(
      loadQuestSave(
        JSON.parse(JSON.stringify(createQuestSave(start, commands, game, sources))),
        sources,
      ).game,
    ).toEqual(game);
  expect(game.dungeon!.pending!.options.find((o) => o.id === sale(game))!.label).toContain(
    "获得7金",
  );
  save();
  const prior = game,
    pool = prior.dungeon!.trinkets!,
    soldId = sale(game).slice(5);
  const expected = [...pool.deck!, soldId],
    rng = createRng(seed);
  for (let i = 0; i < prior.dungeon!.cursor; i++) rng.next();
  for (let i = expected.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [expected[i], expected[j]] = [expected[j]!, expected[i]!];
  }
  const command = choose(game, sale(game));
  game = ok(game, command);
  commands.push(command);
  expect(game.dungeon!.gold).toBe(prior.dungeon!.gold + 7);
  expect(game.dungeon!.trinkets).toMatchObject({
    deck: expected,
    held: [],
    display: pool.display,
    discard: pool.discard,
  });
  expect(game.dungeon!.cursor).toBe(prior.dungeon!.cursor + expected.length - 1);
  expect(game.dungeon!.hamlet).toMatchObject({
    nomadSold: true,
    actedHeroes: [],
    visitedBuildings: ["nomadWagon"],
  });
  expect(trinketPoolProblem(game.dungeon!.trinkets!, game.dungeon!.heroes)).toBeNull();
  expect(applyCommand(game, command).state).toBe(game);
  expect(game.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  save();
  const buy = choose(game, game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id);
  game = ok(game, buy);
  commands.push(buy);
  expect(game.dungeon!.gold).toBe(prior.dungeon!.gold + 3); // 售价7、购买仍4。
  expect(game.dungeon!.pending!.id).toContain(":equip:");
  expect(applyCommand(game, choose(game, `sell:${soldId}`)).state).toBe(game);
  const equip = choose(game, "equip:hero-0");
  game = ok(game, equip);
  commands.push(equip);
  expect(game.dungeon!.hamlet!.nomadSold).toBeUndefined();
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  save();
}, 20000);

it("加价既适用正置也适用倒置；常规事件仍卖2金；溢出按7金拒绝而非2金", () => {
  for (const face of ["upright", "inverted"] as const) {
    const b = baseline.game,
      d = b.dungeon!;
    const fixture = {
      ...b,
      dungeon: {
        ...d,
        trinkets: { ...d.trinkets!, held: d.trinkets!.held.map((h) => ({ ...h, face })) },
      },
    };
    const sh = ok(fixture, { type: "visitNomadWagon", actorId: "hero-0" });
    expect(ok(sh, choose(sh, sale(sh))).dungeon!.gold).toBe(d.gold + 7);
  }
  const b = baseline.game,
    d = b.dungeon!;
  const regular = ok(
    { ...b, dungeon: { ...d, hamlet: { ...d.hamlet!, last: "hamlet_event:p005" } } },
    { type: "visitNomadWagon", actorId: "hero-0" },
  );
  expect(ok(regular, choose(regular, sale(regular))).dungeon!.gold).toBe(d.gold + 2);
  const overflow = ok(
    { ...b, dungeon: { ...d, gold: Number.MAX_SAFE_INTEGER - 2 } },
    { type: "visitNomadWagon", actorId: "hero-0" },
  );
  expect(overflow.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  expect(
    applyCommand(overflow, choose(overflow, `sell:${d.trinkets!.held[0]!.cardId}`)).state,
  ).toBe(overflow);
});

it("加价不放宽出售所有权、封锁、过期选择；离村不保留事件效果", () => {
  const game = shop(),
    d = game.dungeon!,
    cardId = d.trinkets!.held[0]!.cardId;
  for (const command of [
    choose(game, `sell:${d.trinkets!.display![0]!}`),
    { ...choose(game, `sell:${cardId}`), choiceId: "expired" },
    { type: "rollHamletCaretaker" },
  ] as Command[])
    expect(applyCommand(game, command).state).toBe(game);
  const companion = {
    ...game,
    dungeon: {
      ...d,
      trinkets: { ...d.trinkets!, held: d.trinkets!.held.map((h) => ({ ...h, heroId: "hero-1" })) },
    },
  };
  expect(applyCommand(companion, choose(companion, `sell:${cardId}`)).state).toBe(companion);
  const b = baseline.game;
  const blocked = {
    ...b,
    dungeon: { ...b.dungeon!, hamlet: { ...b.dungeon!.hamlet!, blockedBuildings: ["nomadWagon"] } },
  };
  expect(applyCommand(blocked, { type: "visitNomadWagon", actorId: "hero-0" }).state).toBe(blocked);
  // 独立准备结束夹具：只跳过剩余行动，出征沿正式命令，不注入价格/奖励字段。
  let ready: GameState = {
    ...b,
    dungeon: {
      ...b.dungeon!,
      hamlet: { ...b.dungeon!.hamlet!, phase: "preparationComplete" as const, remainingDays: 0 },
    },
  };
  ready = ok(ready, { type: "offerNextQuest" });
  const next = ok(ready, choose(ready, ready.dungeon!.pending!.options[0]!.id));
  expect(next.dungeon!.hamlet).toBeUndefined();
  expect(next.dungeon!.hamletMemory!.deck).toHaveLength(16);
});
