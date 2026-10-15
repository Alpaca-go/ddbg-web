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

it("已有意志卡时拒绝结算且不抽牌、不消费RNG", () => {
  const seed = seedFor("hamlet_event:p014");
  const base = returned(seed);
  const polluted = {
    ...base.game,
    dungeon: {
      ...base.game.dungeon!,
      heroes: base.game.dungeon!.heroes.map((h, i) =>
        i === 0 ? { ...h, resolveCardId: "virtue_affliction:p001", resolveTested: true } : h,
      ),
    },
  };
  const cursor = polluted.dungeon!.cursor;
  const bad = applyCommand(polluted, { type: "drawHamletEvent" });
  expect(bad.events.some((e) => e.type === "commandRefused")).toBe(true);
  expect(bad.events[0]!.message).toMatch(/In Good Spirits|Q-79/);
  expect(bad.state.dungeon!.cursor).toBe(cursor);
  expect(bad.state.dungeon!.hamlet).toBeUndefined();
  expect(bad.state.dungeon!.heroes[0]).toMatchObject({
    resolveCardId: "virtue_affliction:p001",
    resolveTested: true,
  });
});
