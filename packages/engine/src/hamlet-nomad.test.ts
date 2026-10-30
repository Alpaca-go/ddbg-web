import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nomadQuest } from "./test-helpers/nomad-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { trinketPoolProblem, drawTrinket, trinketOptions } from "./trinket-acquisition";

let baseline: ReturnType<typeof nomadQuest>;
beforeAll(() => {
  baseline = nomadQuest();
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
function shelf() {
  return ok(baseline.game, visit);
}
function paid(game: GameState) {
  return ok(
    game,
    choose(game, game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id),
  );
}
it("真实第四天首次来访完整14张I级池陈列三张并守恒，待选/付款后/装备后存档回放一致", () => {
  let game = baseline.game;
  const commands = [...baseline.commands],
    before = structuredClone(game);
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
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
  expect(game.dungeon!.trinkets!.display).toHaveLength(3);
  expect(trinketPoolProblem(game.dungeon!.trinkets!, game.dungeon!.heroes)).toBeNull();
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual([]);
  expect(game.dungeon!.hamlet!.visitedBuildings).toEqual(["nomadWagon"]);
  expect(ok(baseline.game, visit)).toEqual(game);
  save();
  step(choose(game, game.dungeon!.pending!.options.find((o) => o.id.startsWith("buy:"))!.id));
  expect(game.dungeon!.gold).toBe(before.dungeon!.gold - 4);
  expect(game.dungeon!.trinkets!.display).toHaveLength(2);
  const cursor = game.dungeon!.cursor,
    cardId = game.dungeon!.trinkets!.incoming!.cardId;
  save();
  step(choose(game, "equip:hero-0"));
  expect(game.dungeon!.gold).toBe(before.dungeon!.gold - 4);
  expect(game.dungeon!.cursor).toBe(cursor);
  expect(game.dungeon!.trinkets!.held).toContainEqual({
    cardId,
    heroId: "hero-0",
    face: "upright",
  });
  expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(game.dungeon!.pending).toBeNull();
  save();
  expect(baseline.game).toEqual(before);
}, 30000);
it("缺钱可查看/离开，待选冻结其他命令，越序/封锁/坏牌池原子拒绝", () => {
  const game = baseline.game,
    d = game.dungeon!;
  const poor = { ...game, dungeon: { ...d, gold: 0 } },
    shop = ok(poor, visit);
  expect(shop.dungeon!.pending!.options.map((o) => o.id)).toEqual(["leave"]);
  expect(ok(shop, choose(shop, "leave")).dungeon!.gold).toBe(0);
  for (const patch of [
    { hamlet: { ...d.hamlet!, blockedBuildings: ["nomadWagon"] } },
    { hamlet: { ...d.hamlet!, visitedBuildings: ["nomadWagon"] } },
    { trinkets: { ...d.trinkets!, deck: [] } },
  ]) {
    const bad = { ...game, dungeon: { ...d, ...patch } };
    expect(applyCommand(bad, visit).state).toBe(bad);
  }
  // R-100：可抽仅 2 张、其余在弃牌时洗回弃牌并抽满 3 张陈列，不拒绝。
  const shortDeck = {
    ...game,
    dungeon: {
      ...d,
      trinkets: {
        ...d.trinkets!,
        deck: d.trinkets!.cards.slice(0, 2).map((c) => c.id),
        discard: d.trinkets!.cards.slice(2).map((c) => c.id),
      },
    },
  };
  const filled = ok(shortDeck, visit);
  expect(filled.dungeon!.trinkets!.display).toHaveLength(3);
  expect(filled.dungeon!.trinkets!.discard).toEqual([]);
  expect(filled.dungeon!.hamlet!.visitedBuildings).toEqual(["nomadWagon"]);
  expect(applyCommand(game, { ...visit, actorId: "hero-1" } as Command).state).toBe(game);
  for (const c of [
    visit,
    { type: "rollHamletCaretaker" },
    { type: "upgradeHamletBuilding", building: "nomadWagon" },
  ] as Command[])
    expect(applyCommand(shop, c).state).toBe(shop);
});
it("陈列不筛未核实卡，但拒绝购买；下一天/买空不补货，地牢抽饰品也不重复抽陈列", () => {
  const original = baseline.game,
    d = original.dungeon!,
    pool = d.trinkets!;
  // I 级正式目录已全部核实；显式构造未核实卡与牌序，独立覆盖拒绝购买边界。
  const unknown = {
    ...pool.cards[0]!,
    verification: { unverified: true, reasons: ["测试夹具：待核实饰品"] },
  };
  const order = [unknown.id, ...pool.cards.map((c) => c.id).filter((id) => id !== unknown.id)];
  const fixture = {
    ...original,
    dungeon: {
      ...d,
      trinkets: {
        ...pool,
        cards: pool.cards.map((card) => (card.id === unknown.id ? unknown : card)),
        deck: order,
      },
    },
  };
  const shop = ok(fixture, visit);
  expect(shop.dungeon!.trinkets!.display).toContain(unknown.id);
  expect(shop.dungeon!.pending!.options.some((o) => o.id === `buy:${unknown.id}`)).toBe(false);
  expect(applyCommand(shop, choose(shop, `buy:${unknown.id}`)).state).toBe(shop);
  const left = ok(shop, choose(shop, "leave"));
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
  expect(revisited.dungeon!.trinkets).toBe(left.dungeon!.trinkets);
  expect(revisited.dungeon!.cursor).toBe(left.dungeon!.cursor);
  const draw = drawTrinket(
    left.dungeon!.trinkets!,
    d.heroes,
    "hero-1",
    left.seed,
    left.dungeon!.cursor,
  );
  expect(draw.status).toBe("resolved");
  if (draw.status === "resolved")
    expect(left.dungeon!.trinkets!.display).not.toContain(draw.pool.incoming!.cardId);
  const empty = {
    ...nextDay,
    dungeon: {
      ...nextDay.dungeon!,
      trinkets: { ...pool, display: [], deck: pool.cards.map((c) => c.id) },
    },
  };
  expect(ok(empty, visit).dungeon!.trinkets!.display).toEqual([]);
});
it("购买后可交给同伴或弃置；满槽可弃旧腾位，不能再次付款或重发饰品", () => {
  const shop = shelf(),
    game = paid(shop),
    pool = game.dungeon!.trinkets!,
    cardId = pool.incoming!.cardId;
  const equipped = ok(game, choose(game, "equip:hero-2"));
  expect(equipped.dungeon!.trinkets!.held).toContainEqual({
    cardId,
    heroId: "hero-2",
    face: "upright",
  });
  const discarded = ok(game, choose(game, "discard-new"));
  expect(discarded.dungeon!.trinkets!.discard).toContain(cardId);
  expect(discarded.dungeon!.gold).toBe(game.dungeon!.gold);
  expect(applyCommand(equipped, choose(game, "equip:hero-2")).state).toBe(equipped);
  // 满槽夹具：从剩余堆给每人一张获批饰品，守恒不复制卡。
  const ids = pool
    .deck!.filter((id) => !pool.cards.find((c) => c.id === id)!.verification.unverified)
    .slice(0, 4);
  const full: GameState = {
    ...game,
    dungeon: {
      ...game.dungeon!,
      trinkets: {
        ...pool,
        deck: pool.deck!.filter((id) => !ids.includes(id)),
        held: ids.map((id, i) => ({ cardId: id, heroId: `hero-${i}`, face: "upright" as const })),
      },
    },
  };
  const ready: GameState = {
    ...full,
    dungeon: {
      ...full.dungeon!,
      pending: {
        ...full.dungeon!.pending!,
        options: trinketOptions(full.dungeon!.trinkets!, full.dungeon!.heroes).map(
          ({ id, label }) => ({ id, label }),
        ),
      },
    },
  };
  const freed = ok(ready, choose(ready, `discard:${ids[0]}`));
  expect(freed.dungeon!.gold).toBe(full.dungeon!.gold);
  expect(freed.dungeon!.trinkets!.incoming!.cardId).toBe(cardId);
  expect(ok(freed, choose(freed, "equip:hero-0")).dungeon!.trinkets!.incoming).toBeNull();
});
