import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { createRng } from "./rng";
import { nextBattleRoll } from "./encounter";
import events from "../../data/normalized/corebox/hamlet_event.json";
import { hamletEventFileSchema } from "../../data/src/hamlet-event";
import dictionary from "../../data/dictionary/icon-dictionary-v1.8.json";

const cards = hamletEventFileSchema.parse(events).cards;
const STANCES = ["aggressive", "defensive", "ranged", "support"] as const;
function firstEvent(seed: number) {
  const rng = createRng(seed);
  for (let i = 0; i < 11; i++) rng.next();
  const ids = cards.map((c) => c.id);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids[0]!;
}
const seedFor = (id: string) =>
  Array.from({ length: 300 }, (_, i) => i + 1).find((seed) => firstEvent(seed) === id)!;

function returned(seed: number) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  const commands: Command[] = [];
  const step = (c: Command) => {
    const r = applyCommand(game, c);
    if (r.events.some((e) => e.type === "commandRefused"))
      throw new Error(JSON.stringify(r.events));
    game = r.state;
    commands.push(c);
    return r;
  };
  let r = step({ type: "rollDungeonProvisions" });
  while (r.pendingChoice)
    r = step({
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = step({ type: "leaveDungeon" });
  step({ type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  step({ type: "summarizeDungeonQuest" });
  step({ type: "beginReturnToHamlet" });
  step({ type: "finishReturnToHamlet" });
  return { game, commands };
}
function ok(game: GameState, command: Command) {
  const r = applyCommand(game, command);
  expect(
    r.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBe(false);
  return r;
}
function stanceOrder(heroes: readonly { id: string; stance?: string | null }[]) {
  return [...heroes].sort(
    (a, b) =>
      STANCES.indexOf(a.stance as (typeof STANCES)[number]) -
      STANCES.indexOf(b.stance as (typeof STANCES)[number]),
  );
}

it("In Good Spirits效果图标d10已确认，运行时已接通", () => {
  const card = cards.find((c) => c.id === "hamlet_event:p014")!;
  expect(card).toMatchObject({
    name: "In Good Spirits",
    days: 3,
    runtime: "inGoodSpirits",
    effectIconIds: ["94bfa4dde4"],
  });
  expect(dictionary.icons.find((i) => i.iconId === "94bfa4dde4")).toMatchObject({
    key: "d10",
    status: "confirmed",
  });
});

it("真实seed6抽In Good Spirits：三人平手最高获美德翻红、洗回3天，存档可回放", () => {
  const seed = seedFor("hamlet_event:p014");
  expect(seed).toBe(6);
  const base = returned(seed);
  // 首次抽牌洗满16张消耗15次RNG，再按姿态顺序掷四颗d10。
  const rollCursor = base.game.dungeon!.cursor + 15;
  const order = stanceOrder(base.game.dungeon!.heroes).map((h) => h.id);
  const expectedRolls = order.map((_, i) => nextBattleRoll(seed, rollCursor + i));
  expect(expectedRolls).toEqual([7, 10, 10, 10]);
  const highest = Math.max(...expectedRolls);
  const winners = order.filter((_, i) => expectedRolls[i] === highest);
  expect(winners).toHaveLength(3);

  const drawn = ok(base.game, { type: "drawHamletEvent" });
  const d = drawn.state.dungeon!;
  expect(d.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 3,
  });
  expect(d.hamlet!.deck).toHaveLength(16);
  expect(d.hamlet!.deck).toContain("hamlet_event:p014");
  expect(drawn.events[0]!.message).toContain(`最高${highest}`);
  expect(drawn.events[0]!.message).toMatch(/hero-1→virtue_affliction:p0/);

  for (const hero of d.heroes) {
    if (winners.includes(hero.id)) {
      expect(hero.resolveTested).toBe(true);
      expect(hero.resolveCardId).toMatch(/^virtue_affliction:p0/);
      expect(d.resolveCards.find((c) => c.id === hero.resolveCardId)!.role).toBe("virtue");
      // 卡面只翻红获美德，不归零压力（与墓地同，R28/R34）。
      expect(hero.stress).toBe(base.game.dungeon!.heroes.find((h) => h.id === hero.id)!.stress);
    } else {
      expect(hero.resolveTested).toBeFalsy();
      expect(hero.resolveCardId).toBeFalsy();
    }
  }
  expect(
    d.heroes
      .filter((h) => h.resolveCardId)
      .map((h) => h.id)
      .sort(),
  ).toEqual([...winners].sort());
  expect(new Set(d.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []))).size).toBe(3);
  expect(d.resolveDecks.virtue).toHaveLength(2);

  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  expect(
    loadQuestSave(
      JSON.parse(
        JSON.stringify(
          createQuestSave(
            start,
            [...base.commands, { type: "drawHamletEvent" }],
            drawn.state,
            coreQuestSources,
          ),
        ),
      ),
      coreQuestSources,
    ).game,
  ).toEqual(drawn.state);
});

it("已有意志卡的获奖者按R-099替换洗回：旧卡回堆、获新美德、事件照常完成", () => {
  const seed = seedFor("hamlet_event:p014");
  const base = returned(seed);
  const oldId = "virtue_affliction:p001";
  const d = base.game.dungeon!;
  const virtues = d.resolveCards
    .filter((c) => c.role === "virtue" && c.id !== oldId)
    .map((c) => c.id);
  const afflictions = d.resolveCards.filter((c) => c.role === "affliction").map((c) => c.id);
  // seed6：姿态序掷点 7/10/10/10，hero-1/2/3 获奖；给 hero-1 预置旧美德验证替换。
  const withWinnerHeld: GameState = {
    ...base.game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h) =>
        h.id === "hero-1"
          ? { ...h, resolveCardId: oldId, resolveTested: true }
          : { ...h, resolveCardId: undefined, resolveTested: false },
      ),
      resolveDecks: { virtue: virtues, affliction: afflictions },
    },
  };
  const drawn = ok(withWinnerHeld, { type: "drawHamletEvent" });
  const next = drawn.state.dungeon!;
  const winner = next.heroes.find((h) => h.id === "hero-1")!;
  expect(winner.resolveTested).toBe(true);
  expect(winner.resolveCardId).toBeTruthy();
  expect(next.resolveCards.find((c) => c.id === winner.resolveCardId)!.role).toBe("virtue");
  expect(next.resolveDecks.virtue).not.toContain(winner.resolveCardId);
  expect(winner.resolveCardId === oldId || next.resolveDecks.virtue!.includes(oldId)).toBe(true);
  const held = next.heroes.flatMap((h) => (h.resolveCardId ? [h.resolveCardId] : []));
  expect(new Set(held).size).toBe(held.length);
  expect(held).toHaveLength(3);
  expect(
    next.resolveCards
      .filter((c) => c.role === "virtue")
      .every((c) => held.includes(c.id) || next.resolveDecks.virtue!.includes(c.id)),
  ).toBe(true);
  expect(next.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 3,
  });
  expect(drawn.events[0]!.message).toMatch(/R-099/);
});
