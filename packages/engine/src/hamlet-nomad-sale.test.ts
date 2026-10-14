import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nomadSaleQuest } from "./test-helpers/nomad-sale-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { trinketPoolProblem } from "./trinket-acquisition";
import { createRng } from "./rng";

let baseline: ReturnType<typeof nomadSaleQuest>;
beforeAll(() => {
  baseline = nomadSaleQuest();
}, 30000);
const visit: Command = { type: "visitNomadWagon", actorId: "hero-0" };
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
const choose = (game: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: game.dungeon!.pending!.id,
  optionId,
});
const saleOption = (game: GameState) =>
  game.dungeon!.pending!.options.find((o) => o.id.startsWith("sell:"))!.id;

it("真实先买后再次来访：出售2金立即种子洗回、继续购买、待选与付款存档不重复交易", () => {
  let game = baseline.game;
  const commands = [...baseline.commands],
    before = structuredClone(game);
  const step = (command: Command) => {
    commands.push(command);
    game = ok(game, command);
  };
  const save = () =>
    expect(
      loadQuestSave(
        JSON.parse(
          JSON.stringify(createQuestSave(baseline.start, commands, game, coreQuestSources)),
        ),
        coreQuestSources,
      ).game,
    ).toEqual(game);
  step(visit);
  save();
  const shop = game,
    pool = game.dungeon!.trinkets!,
    soldId = saleOption(game).slice(5);
  const expectedDeck = [...pool.deck!, soldId],
    rng = createRng(game.seed);
  for (let i = 0; i < game.dungeon!.cursor; i++) rng.next();
  for (let i = expectedDeck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [expectedDeck[i], expectedDeck[j]] = [expectedDeck[j]!, expectedDeck[i]!];
  }
  step(choose(game, `sell:${soldId}`));
  expect(game.dungeon!.gold).toBe(before.dungeon!.gold + 2);
  expect(game.dungeon!.trinkets!.deck).toEqual(expectedDeck);
  expect(game.dungeon!.cursor).toBe(shop.dungeon!.cursor + expectedDeck.length - 1);
  expect(game.dungeon!.trinkets!.discard).toEqual(pool.discard);
  expect(game.dungeon!.trinkets!.display).toEqual(pool.display);
  expect(game.dungeon!.trinkets!.held).toEqual([]);
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual([]);
  expect(game.dungeon!.hamlet!.visitedBuildings).toEqual(["nomadWagon"]);
  expect(game.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  expect(ok(shop, choose(shop, `sell:${soldId}`))).toEqual(game);
  expect(applyCommand(game, choose(shop, `sell:${soldId}`)).state).toBe(game);
  expect(applyCommand(game, choose(game, `sell:${soldId}`)).state).toBe(game);
  save();
  step(choose(game, game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id));
  expect(game.dungeon!.gold).toBe(before.dungeon!.gold - 2);
  save();
  step(choose(game, "equip:hero-0"));
  expect(game.dungeon!.hamlet!.nomadSold).toBeUndefined();
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(trinketPoolProblem(game.dungeon!.trinkets!, game.dungeon!.heroes)).toBeNull();
  save();
  expect(baseline.game).toEqual(before);
}, 30000);

it("缺钱仍可出售并离开；空牌堆只回售出卡，不补弃牌、不补陈列", () => {
  const b = baseline.game,
    d = b.dungeon!,
    pool = d.trinkets!;
  // 明示耗尽/倒置夹具，完整池守恒；出售价格不看朝向。
  const fixture: GameState = {
    ...b,
    dungeon: {
      ...d,
      gold: 0,
      trinkets: {
        ...pool,
        discard: [...pool.discard, ...pool.deck!],
        deck: [],
        held: pool.held.map((held) => ({ ...held, face: "inverted" })),
      },
    },
  };
  const shop = ok(fixture, visit),
    cardId = saleOption(shop).slice(5);
  expect(shop.dungeon!.pending!.options.some((o) => o.id.startsWith("buy:"))).toBe(false);
  const sold = ok(shop, choose(shop, `sell:${cardId}`));
  expect(sold.dungeon!.trinkets!.deck).toEqual([cardId]);
  expect(sold.dungeon!.cursor).toBe(shop.dungeon!.cursor);
  expect(sold.dungeon!.gold).toBe(2);
  expect(sold.dungeon!.trinkets!.discard).toEqual(fixture.dungeon!.trinkets!.discard);
  expect(sold.dungeon!.trinkets!.display).toEqual(pool.display);
  const left = ok(sold, choose(sold, "leave"));
  expect(left.dungeon!.gold).toBe(2);
  expect(left.dungeon!.hamlet!.nomadSold).toBeUndefined();
  expect(left.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
});

it("不能卖同伴/陈列/未知卡、溢出金币、付款中插入出售或绕过待选；拒绝不改状态/RNG", () => {
  const shop = ok(baseline.game, visit),
    pool = shop.dungeon!.trinkets!;
  const own = pool.held[0]!.cardId;
  for (const id of [pool.display![0]!, "trinket:p999"]) {
    expect(applyCommand(shop, choose(shop, `sell:${id}`)).state).toBe(shop);
  }
  const paid = ok(
    shop,
    choose(shop, shop.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id),
  );
  expect(applyCommand(paid, choose(paid, `sell:${own}`)).state).toBe(paid);
  expect(applyCommand(shop, { type: "rollHamletCaretaker" }).state).toBe(shop);
  const b = baseline.game,
    d = b.dungeon!;
  const overflow = ok({ ...b, dungeon: { ...d, gold: Number.MAX_SAFE_INTEGER } }, visit);
  expect(overflow.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  expect(applyCommand(overflow, choose(overflow, `sell:${own}`)).state).toBe(overflow);
  const companion = ok(
    {
      ...b,
      dungeon: {
        ...d,
        trinkets: {
          ...d.trinkets!,
          held: d.trinkets!.held.map((held) => ({ ...held, heroId: "hero-1" })),
        },
      },
    },
    visit,
  );
  expect(companion.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  expect(applyCommand(companion, choose(companion, `sell:${own}`)).state).toBe(companion);
});

it("同次访问不能出售第二件，结束后新访问重新计数；隐式牌堆同样守恒", () => {
  const b = baseline.game,
    d = b.dungeon!,
    pool = d.trinkets!;
  const secondId = pool.deck!.find(
    (id) => !pool.cards.find((c) => c.id === id)!.verification.unverified,
  )!;
  // 明示II级携带容量夹具；不声称已实现Guild升级。牌池/游商仍为I级。
  const fixture: GameState = {
    ...b,
    dungeon: {
      ...d,
      heroes: d.heroes.map((hero, i) => (i === 0 ? { ...hero, level: 2 } : hero)),
      trinkets: {
        ...pool,
        deck: null,
        held: [...pool.held, { cardId: secondId, heroId: "hero-0", face: "upright" }],
      },
    },
  };
  const shop = ok(fixture, visit),
    soldId = saleOption(shop).slice(5);
  const sold = ok(shop, choose(shop, `sell:${soldId}`));
  expect(sold.dungeon!.trinkets!.deck).toContain(soldId);
  expect(sold.dungeon!.trinkets!.deck).not.toContain(secondId);
  expect(trinketPoolProblem(sold.dungeon!.trinkets!, sold.dungeon!.heroes)).toBeNull();
  expect(sold.dungeon!.pending!.options.some((o) => o.id.startsWith("sell:"))).toBe(false);
  expect(applyCommand(sold, choose(sold, `sell:${secondId}`)).state).toBe(sold);
  const left = ok(sold, choose(sold, "leave"));
  // 明示次日服务夹具，用于确认计数只在当前访问内生效。
  const nextDay: GameState = {
    ...left,
    dungeon: {
      ...left.dungeon!,
      hamlet: {
        ...left.dungeon!.hamlet!,
        actedHeroes: [],
        visitedBuildings: [],
        blockedBuildings: [],
      },
    },
  };
  const revisited = ok(nextDay, visit);
  expect(revisited.dungeon!.pending!.options.some((o) => o.id === `sell:${secondId}`)).toBe(true);
});

it("旧游商购买待选快照可升级提示/出售选项；伪造金币、选项或行动仍拒绝", () => {
  const game = ok(baseline.game, visit),
    commands = [...baseline.commands, visit];
  const saved = createQuestSave(baseline.start, commands, game, coreQuestSources);
  const legacy = JSON.parse(JSON.stringify(saved));
  legacy.snapshot.dungeon.pending.prompt = "游商马车I：可购买一件陈列饰品；出售继续开发（R33）";
  legacy.snapshot.dungeon.pending.options = legacy.snapshot.dungeon.pending.options.filter(
    (o: { id: string }) => !o.id.startsWith("sell:"),
  );
  expect(loadQuestSave(legacy, coreQuestSources).game).toEqual(game);
  for (const mutate of [
    (snapshot: typeof game) => {
      (snapshot.dungeon as { gold: number }).gold++;
    },
    (snapshot: typeof game) => {
      (snapshot.dungeon!.pending!.options as unknown[]).pop();
    },
    (snapshot: typeof game) => {
      (snapshot.dungeon!.hamlet as { actedHeroes: readonly string[] }).actedHeroes = ["hero-0"];
    },
  ]) {
    const bad = structuredClone(legacy);
    mutate(bad.snapshot);
    expect(() => loadQuestSave(bad, coreQuestSources)).toThrow(/不一致/);
  }
}, 30000);
