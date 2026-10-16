import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { nomadUpgradeQuest } from "./test-helpers/nomad-upgrade-quest";
import { coreQuestSources as sources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import {
  trinketPoolProblem,
  trinketDeck,
  drawTrinket,
  switchTrinketDungeonLevel,
} from "./trinket-acquisition";
import raw from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";

const cards = normalizedTrinketFileSchema.parse(raw).cards;
let journeys: Record<2 | 3, ReturnType<typeof nomadUpgradeQuest>>;
beforeAll(() => {
  journeys = { 2: nomadUpgradeQuest(2), 3: nomadUpgradeQuest(3) };
}, 30000);
const visit: Command = { type: "visitNomadWagon", actorId: "hero-0" };
const choose = (g: GameState, optionId: string): Command => ({
  type: "resolveChoice",
  choiceId: g.dungeon!.pending!.id,
  optionId,
});
function ok(g: GameState, c: Command) {
  const r = applyCommand(g, c);
  expect(
    r.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toEqual([]);
  expect(trinketPoolProblem(r.state.dungeon!.trinkets!, r.state.dungeon!.heroes)).toBeNull();
  return r.state;
}

it.each([2, 3] as const)(
  "游商%d：自然付费升级/分级陈列/购买和装备待选正式存档；离村仅洗回对应池",
  (level) => {
    const journey = journeys[level],
      before = structuredClone(journey.game);
    let game = journey.game;
    const commands = [...journey.commands];
    const step = (c: Command) => {
      game = ok(game, c);
      commands.push(c);
    };
    const save = () =>
      expect(
        loadQuestSave(
          JSON.parse(JSON.stringify(createQuestSave(journey.start, commands, game, sources))),
          sources,
        ).game,
      ).toEqual(game);
    step(visit);
    const pool = game.dungeon!.trinkets!;
    expect(
      [1, 2, 3].map(
        (l) =>
          pool.display!.filter((id) => pool.cards.find((c) => c.id === id)!.level === l).length,
      ),
    ).toEqual(level === 2 ? [2, 1, 0] : [1, 1, 1]);
    expect(pool.cards).toHaveLength(level === 2 ? 26 : 38);
    expect(game.dungeon!.cursor - before.dungeon!.cursor).toBe(level === 2 ? 24 : 35);
    expect(ok(before, visit)).toEqual(game);
    save();
    const cardId = pool.display!.find(
      (id) => pool.cards.find((c) => c.id === id)!.level === level,
    )!;
    const card = pool.cards.find((c) => c.id === cardId)!;
    // 未核实陈列照常保留，不能因抽到未知卡而换牌；付款验证选任意实际可买卡。
    if (card.verification.unverified)
      expect(applyCommand(game, choose(game, `buy:${cardId}`)).state).toBe(game);
    const buy = game.dungeon!.pending!.options.filter((o) => o.id.startsWith("buy:")).at(-1);
    expect(buy).toBeDefined();
    const purchased = buy!.id.slice(4),
      price = 2 + 2 * pool.cards.find((c) => c.id === purchased)!.level;
    step(choose(game, buy!.id));
    expect(game.dungeon!.gold).toBe(before.dungeon!.gold - price);
    save();
    step(choose(game, "equip:hero-0"));
    save();
    expect(game.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
    // 剩余三位英雄走公开行动，准备结束后正式选择下一任务。
    step({ type: "useHamletSkill", actorId: "hero-1", skill: "sharpenSpear" });
    step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
    step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
    const displays = [...game.dungeon!.trinkets!.display!];
    step({ type: "offerNextQuest" });
    step(choose(game, game.dungeon!.pending!.options[0]!.id));
    expect(game.dungeon!.trinkets!.display).toBeUndefined();
    for (const id of displays)
      expect(
        trinketDeck(game.dungeon!.trinkets!, cards.find((c) => c.id === id)!.level)!.deck,
      ).toContain(id);
    const draw = drawTrinket(
      game.dungeon!.trinkets!,
      game.dungeon!.heroes,
      "hero-0",
      game.seed,
      game.dungeon!.cursor,
    );
    if (draw.status !== "resolved") throw new Error(draw.reason);
    expect(cards.find((c) => c.id === draw.pool.incoming!.cardId)!.level).toBe(1);
    save();
    expect(journey.game).toEqual(before);
  },
  30000,
);

it("分级价格4/6/8、出售2/3/4及Gypsy加5；弃新卡/售出只回对应级，不重复付款或出售", () => {
  const base = journeys[3].game;
  // 明示三等级牌序/金币/持牌夹具：验证所有价格，不冒称自然抽到特定已核实卡。
  for (const level of [1, 2, 3] as const)
    for (const gypsy of [false, true]) {
      const buyId = cards.find((c) => c.level === level && !c.verification.unverified)!.id;
      const owned = cards.find(
        (c) => c.level === level && c.id !== buyId && !c.verification.unverified,
      )!.id;
      let shop = ok(base, visit);
      const p = shop.dungeon!.trinkets!;
      const display = [1, 2, 3].map((l) =>
        l === level ? buyId : p.display!.find((id) => cards.find((c) => c.id === id)!.level === l)!,
      );
      const partitions = [1, 2, 3].map((l) => ({
        level: l as 1 | 2 | 3,
        deck: cards
          .filter((c) => c.level === l && !display.includes(c.id) && c.id !== owned)
          .map((c) => c.id),
        discard: [],
      }));
      const fixture: GameState = {
        ...shop,
        dungeon: {
          ...shop.dungeon!,
          gold: 8,
          hamlet: {
            ...shop.dungeon!.hamlet!,
            last: gypsy ? "hamlet_event:p009" : "hamlet_event:p005",
          },
          trinkets: {
            ...p,
            deck: partitions[0]!.deck,
            inactive: partitions.slice(1),
            display,
            held: [{ cardId: owned, heroId: "hero-0", face: "inverted" }],
          },
        },
      };
      // 重新生成合法服务待选，而非向产品注入选项。
      const fresh = {
        ...fixture,
        dungeon: {
          ...fixture.dungeon!,
          pending: null,
          hamlet: { ...fixture.dungeon!.hamlet!, visitedBuildings: [] },
        },
      };
      shop = ok(fresh, visit);
      const sold = ok(shop, choose(shop, `sell:${owned}`));
      expect(sold.dungeon!.gold).toBe(8 + level + 1 + (gypsy ? 5 : 0));
      expect(trinketDeck(sold.dungeon!.trinkets!, level)!.deck).toContain(owned);
      for (const other of [1, 2, 3].filter((l) => l !== level))
        expect(trinketDeck(sold.dungeon!.trinkets!, other)!.deck).toEqual(
          trinketDeck(shop.dungeon!.trinkets!, other)!.deck,
        );
      expect(applyCommand(sold, choose(sold, `sell:${owned}`)).state).toBe(sold);
      const paid = ok(sold, choose(sold, `buy:${buyId}`));
      expect(paid.dungeon!.gold).toBe(sold.dungeon!.gold - (2 + 2 * level));
      expect(applyCommand(paid, choose(paid, `buy:${buyId}`)).state).toBe(paid);
      const equipped = ok(paid, choose(paid, "equip:hero-0"));
      expect(equipped.dungeon!.trinkets!.held).toContainEqual({
        cardId: buyId,
        heroId: "hero-0",
        face: "upright",
      });
      const done = ok(paid, choose(paid, "discard-new"));
      const partition =
        level === 1
          ? done.dungeon!.trinkets!
          : done.dungeon!.trinkets!.inactive!.find((p) => p.level === level)!;
      expect(partition.discard).toContain(buyId);
      expect(done.dungeon!.gold).toBe(paid.dungeon!.gold);
    }
}, 30000);

it("分级耗尽Q-80、重复分区/陈列/跨级污染原子拒绝；已陈列升级后不重抽", () => {
  const b = journeys[2].game,
    shop = ok(b, visit),
    p = shop.dungeon!.trinkets!;
  const undisplayed = { ...p };
  delete undisplayed.display;
  for (const trinkets of [
    { ...p, inactive: [...p.inactive!, ...p.inactive!] },
    { ...p, display: [p.display![0]!, p.display![0]!] },
    { ...p, inactive: [{ ...p.inactive![0]!, deck: [p.display![0]!, ...p.inactive![0]!.deck!] }] },
    {
      ...undisplayed,
      inactive: [
        {
          ...p.inactive![0]!,
          deck: [],
          discard: cards.filter((c) => c.level === 2).map((c) => c.id),
        },
      ],
      deck: cards.filter((c) => c.level === 1).map((c) => c.id),
    },
  ]) {
    const bad = { ...b, dungeon: { ...b.dungeon!, trinkets } };
    expect(applyCommand(bad, visit).state).toBe(bad);
  }
  const left = ok(shop, choose(shop, "leave"));
  const next = {
    ...left,
    dungeon: {
      ...left.dungeon!,
      gold: 10,
      hamlet: { ...left.dungeon!.hamlet!, actedHeroes: [], visitedBuildings: [] },
    },
  };
  const upgraded = ok(next, { type: "upgradeHamletBuilding", building: "nomadWagon" });
  const revisited = ok(upgraded, visit);
  expect(revisited.dungeon!.trinkets).toBe(left.dungeon!.trinkets);
  expect(revisited.dungeon!.cursor).toBe(left.dungeon!.cursor);
}, 30000);

it("游商提前启用II/III牌堆后，地牢升阶沿用原牌序/弃牌和持牌，不复制或重置", () => {
  const b = journeys[3].game;
  let g = ok(b, visit);
  g = ok(g, choose(g, "leave"));
  const p = g.dungeon!.trinkets!,
    original = structuredClone(p);
  const noDisplay = {
    ...p,
    display: [],
    deck: [...p.deck!, ...p.display!.filter((id) => cards.find((c) => c.id === id)!.level === 1)],
    inactive: p.inactive!.map((part) => ({
      ...part,
      deck: [
        ...part.deck!,
        ...p.display!.filter((id) => cards.find((c) => c.id === id)!.level === part.level),
      ],
    })),
  };
  // 明示已在村庄购买/弃置II级卡的机制夹具，升级不能恢复已离开牌堆的卡。
  const reserved = noDisplay.inactive![0]!;
  const occupied = {
    ...noDisplay,
    held: [{ cardId: "trinket:p017", heroId: "hero-0", face: "upright" as const }],
    inactive: noDisplay.inactive!.map((part) =>
      part.level === 2
        ? {
            ...part,
            deck: part.deck!.filter((id) => !["trinket:p017", "trinket:p018"].includes(id)),
            discard: ["trinket:p018"],
          }
        : part,
    ),
  };
  expect(reserved.level).toBe(2);
  const switched = switchTrinketDungeonLevel(occupied, cards, 2);
  if ("reason" in switched) throw new Error(switched.reason);
  expect(switched.deck).toEqual(occupied.inactive![0]!.deck);
  expect(switched.discard).toEqual(["trinket:p018"]);
  expect(switched.held).toEqual(occupied.held);
  expect(switched.cards).toHaveLength(38);
  expect(trinketPoolProblem(switched, g.dungeon!.heroes)).toBeNull();
  expect(switched.inactive!.find((p) => p.level === 3)).toEqual(noDisplay.inactive![1]);
  expect(p).toEqual(original);
});
