import { beforeAll, expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { naturalAbbeyQuest } from "./test-helpers/abbey-quest";
import { coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { hamletActionOptions } from "./hamlet-actions";
import { resolveDungeonPressure } from "./dungeon-pressure";

let baseline: ReturnType<typeof naturalAbbeyQuest>;
beforeAll(() => {
  baseline = naturalAbbeyQuest();
}, 30000);
const visit = (actorId = "hero-0"): Command => ({
  type: "visitHamletBuilding",
  actorId,
  serviceId: "graveyardVirtue",
  quirkIds: [],
});
function ok(game: GameState, command: Command) {
  const result = applyCommand(game, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
it("真实Fundraiser seed2回村，免费访问墓地抽美德，不归零压力、不治伤、不付钱；存档回放一致", () => {
  const game = baseline.game,
    d = game.dungeon!,
    before = structuredClone(game);
  const next = ok(game, visit()),
    n = next.dungeon!,
    hero = n.heroes[0]!;
  expect(d.resolveCards.find((c) => c.id === hero.resolveCardId)!.role).toBe("virtue");
  expect(hero.resolveTested).toBe(true);
  expect(hero.combat).toMatchObject({ resolveCardId: hero.resolveCardId, resolveTested: true });
  expect(n.gold).toBe(d.gold);
  expect(n.heroes.map((h) => [h.stress, h.wounds, h.xp, h.quirkIds, h.diseaseId])).toEqual(
    d.heroes.map((h) => [h.stress, h.wounds, h.xp, h.quirkIds, h.diseaseId]),
  );
  expect(n.resolveDecks.virtue).toHaveLength(4);
  expect(n.resolveDecks.virtue).not.toContain(hero.resolveCardId);
  expect(n.cursor).toBe(d.cursor + (d.resolveDecks.virtue ? 0 : 4));
  expect(n.hamlet!.visitedBuildings).toEqual(["graveyard"]);
  expect(n.hamlet!.actedHeroes).toEqual(["hero-0"]);
  expect(n.hamlet!.remainingDays).toBe(d.hamlet!.remainingDays);
  const save = createQuestSave(
    baseline.start,
    [...baseline.commands, visit()],
    next,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(next);
  expect(ok(game, visit())).toEqual(next);
  expect(game).toEqual(before);
});
it("已洗牌堆严格取顶，不消费掷骰/洗牌游标；两个不同英雄跨日取不同美德，不复制已持卡", () => {
  const first = ok(baseline.game, visit());
  const deck = first.dungeon!.resolveDecks.virtue!;
  // 明示次日/当前英雄夹具，只测试牌池守恒；自然完整跨日另测。
  const ready: GameState = {
    ...first,
    dungeon: {
      ...first.dungeon!,
      hamlet: {
        ...first.dungeon!.hamlet!,
        visitedBuildings: [],
        actedHeroes: ["hero-0"],
        blockedBuildings: [],
      },
    },
  };
  const next = ok(ready, visit("hero-1"));
  expect(next.dungeon!.heroes[1]!.resolveCardId).toBe(deck[0]);
  expect(next.dungeon!.cursor).toBe(ready.dungeon!.cursor);
  expect(next.dungeon!.resolveDecks.virtue).toEqual(deck.slice(1));
  expect(next.dungeon!.heroes[0]).toBe(ready.dungeon!.heroes[0]);
});
it("缺钱仍可免费来访，封锁/当天占用/越序/未完成事件/坏牌池原子拒绝", () => {
  const game = baseline.game,
    d = game.dungeon!;
  const poor = { ...game, dungeon: { ...d, gold: 0 } };
  expect(ok(poor, visit()).dungeon!.gold).toBe(0);
  const blocked = {
    ...game,
    dungeon: { ...d, hamlet: { ...d.hamlet!, blockedBuildings: ["graveyard"] } },
  };
  expect(applyCommand(blocked, visit()).state).toBe(blocked);
  expect(
    hamletActionOptions(blocked).some(
      (o) => o.command.type === "visitHamletBuilding" && o.command.serviceId === "graveyardVirtue",
    ),
  ).toBe(false);
  const first = ok(game, visit());
  expect(applyCommand(first, visit("hero-1")).state).toBe(first);
  expect(applyCommand(game, visit("hero-1")).state).toBe(game);
  expect(applyCommand(game, { ...visit(), quirkIds: ["quirk:p001"] } as Command).state).toBe(game);
  for (const patch of [
    { resolveCards: d.resolveCards.slice(1) },
    {
      resolveCards: d.resolveCards.map((c, i) =>
        i === 0 ? { ...c, verification: { unverified: true } } : c,
      ),
    },
    { resolveDecks: { ...d.resolveDecks, virtue: [] } },
    { resolveDecks: { ...d.resolveDecks, virtue: ["unknown"] } },
    { cursor: -1 },
    { hamlet: { ...d.hamlet!, active: "hamlet_event:p001", phase: "eventBlocked" as const } },
  ]) {
    const bad = { ...game, dungeon: { ...d, ...patch } };
    expect(applyCommand(bad, visit()).state).toBe(bad);
  }
});
it("真实跨日美德保留；再次访问墓地按R-099替换洗回：旧卡回美德堆、抽新美德、行动与金币照常", () => {
  let game = baseline.game;
  const commands = [...baseline.commands];
  const step = (c: Command) => {
    commands.push(c);
    game = ok(game, c);
  };
  step(visit());
  const oldId = game.dungeon!.heroes[0]!.resolveCardId!;
  expect(game.dungeon!.resolveDecks.virtue).toHaveLength(4);
  expect(game.dungeon!.resolveDecks.virtue).not.toContain(oldId);
  step({ type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" });
  step({ type: "visitHamletBuilding", actorId: "hero-2", serviceId: "tavern3", quirkIds: [] });
  step({ type: "useHamletSkill", actorId: "hero-3", skill: "chant" });
  step({ type: "rollHamletCaretaker" });
  expect(game.dungeon!.heroes[0]!.resolveCardId).toBe(oldId);
  const save = createQuestSave(baseline.start, commands, game, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(game);
  // 次日看守人可能仍封锁墓地：明示解除封锁夹具只测 R-099 替换，不写入存档命令。
  const free: GameState = {
    ...game,
    dungeon: { ...game.dungeon!, hamlet: { ...game.dungeon!.hamlet!, blockedBuildings: [] } },
  };
  expect(
    hamletActionOptions(free).some(
      (o) => o.command.type === "visitHamletBuilding" && o.command.serviceId === "graveyardVirtue",
    ),
  ).toBe(true);
  const gold = free.dungeon!.gold;
  const cursorBefore = free.dungeon!.cursor;
  const replaced = ok(free, visit());
  const hero = replaced.dungeon!.heroes[0]!;
  const newId = hero.resolveCardId!;
  expect(replaced.dungeon!.resolveCards.find((c) => c.id === newId)!.role).toBe("virtue");
  expect(hero.resolveTested).toBe(true);
  expect(replaced.dungeon!.resolveDecks.virtue).toHaveLength(4);
  expect(replaced.dungeon!.resolveDecks.virtue).not.toContain(newId);
  // 洗回后再抽可能抽回同一张；旧卡要么在堆上，要么仍是当前持牌。
  expect(newId === oldId || replaced.dungeon!.resolveDecks.virtue!.includes(oldId)).toBe(true);
  const held = replaced.dungeon!.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  expect(new Set(held).size).toBe(held.length);
  expect(
    replaced
      .dungeon!.resolveCards.filter((c) => c.role === "virtue")
      .every((c) => held.includes(c.id) || replaced.dungeon!.resolveDecks.virtue!.includes(c.id)),
  ).toBe(true);
  expect(replaced.dungeon!.gold).toBe(gold);
  expect(replaced.dungeon!.cursor).toBeGreaterThan(cursorBefore);
  expect(replaced.dungeon!.hamlet!.visitedBuildings).toEqual(["graveyard"]);
  expect(replaced.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
});

it("已有苦难时访问墓地：苦难洗回苦难堆，再抽新美德（R-099牌池守恒）", () => {
  const d = baseline.game.dungeon!;
  const affliction = d.resolveCards.find((c) => c.role === "affliction")!;
  const virtues = d.resolveCards.filter((c) => c.role === "virtue").map((c) => c.id);
  const afflictions = d.resolveCards
    .filter((c) => c.role === "affliction" && c.id !== affliction.id)
    .map((c) => c.id);
  const polluted: GameState = {
    ...baseline.game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i === 0 ? { ...h, resolveCardId: affliction.id, resolveTested: true } : h,
      ),
      resolveDecks: { virtue: virtues, affliction: afflictions },
    },
  };
  const next = ok(polluted, visit());
  const hero = next.dungeon!.heroes[0]!;
  expect(hero.resolveCardId).not.toBe(affliction.id);
  expect(next.dungeon!.resolveCards.find((c) => c.id === hero.resolveCardId)!.role).toBe("virtue");
  expect(next.dungeon!.resolveDecks.affliction).toContain(affliction.id);
  expect(next.dungeon!.resolveDecks.affliction).toHaveLength(5);
  expect(next.dungeon!.resolveDecks.virtue).toHaveLength(4);
  expect(next.dungeon!.resolveDecks.virtue).not.toContain(hero.resolveCardId);
});
it("墓地真实持牌进入探索压力边界夹具：压力10直接心脏病，不掷意志/死门或再抽美德", () => {
  const held = ok(baseline.game, visit()),
    d = held.dungeon!;
  // 下一任务入口尚未开放：只布置压力边界，调用既有探索压力管线，不冒称连续出征。
  const stressed: GameState = {
    ...held,
    dungeon: {
      ...d,
      phase: "blockedPressure",
      pressureSource: "provision",
      heroes: d.heroes.map((h, i) => (i === 0 ? { ...h, stress: 10 } : h)),
    },
  };
  const result = resolveDungeonPressure(stressed),
    n = result.state.dungeon!;
  expect(n.heroes[0]!.dead).toBe(true);
  expect(n.phase).toBe("awaitingReplacement");
  expect(n.cursor).toBe(d.cursor);
  expect(n.resolveDecks).toBe(d.resolveDecks);
  expect(n.heroes[0]!.resolveCardId).toBe(d.heroes[0]!.resolveCardId);
  expect(result.events.some((e) => e.type === "heartAttack")).toBe(true);
  expect(
    result.events.some((e) => e.type === "resolveTested" || e.type === "heroHealthResolved"),
  ).toBe(false);
});
