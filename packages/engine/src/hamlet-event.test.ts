import { expect, it } from "vitest";
import events from "../../data/normalized/corebox/hamlet_event.json";
import dictionary from "../../data/dictionary/icon-dictionary-v1.8.json";
import { hamletEventFileSchema } from "../../data/src/hamlet-event";
import { buildHamletEvents } from "../../data/src/normalize/hamlet-event";
import raw from "../../data/extract/corebox/raw/hamlet_event.json";
import { rawFileSchema } from "../../data/src/extract/raw";
import { applyCommand } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createRng } from "./rng";
import { caretakerBuilding } from "./hamlet-event";
import { createQuestSave, loadQuestSave } from "./quest-save";
import type { Command, GameState } from "./command";

const cards = hamletEventFileSchema.parse(events).cards;
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
  return { game, commands, step };
}
function firstEvent(seed: number) {
  const rng = createRng(seed);
  // 7次代币洗牌+Radiant实际4次补给掷骰，另外4颗直接自选。
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
it("完整16卡逐页原文保留；准备天数仅R-077卡面位置，occupancy不改，生成文件可复现", () => {
  expect(buildHamletEvents(rawFileSchema.parse(raw))).toEqual(events);
  expect(cards.map((c) => c.days)).toEqual([2, 2, 4, 3, 3, 3, 1, 2, 2, 1, 3, 2, 4, 3, 2, null]);
  expect(cards.filter((c) => c.permanentlyRemoved).map((c) => c.source.page)).toEqual([6, 15]);
  expect(cards.filter((c) => c.runtime !== "unimplemented").map((c) => c.source.page)).toEqual([
    2, 5, 13,
  ]);
  expect(dictionary.icons.find((c) => c.iconId === "43aaf29bbb")!.key).toBe("occupancy_pips");
  expect(hamletEventFileSchema.safeParse({ ...events, cards: cards.slice(1) }).success).toBe(false);
});
it("完整牌池抽到未实现Supply Run后保留原卡/天数停点，重复和看守人不能绕过", () => {
  const s = returned(seedFor("hamlet_event:p001"));
  const before = structuredClone(s.game),
    r = s.step({ type: "drawHamletEvent" });
  expect(r.state.dungeon!.hamlet).toMatchObject({
    phase: "eventBlocked",
    active: "hamlet_event:p001",
    preparationDays: null,
  });
  expect(r.state.dungeon!.hamlet!.deck).toHaveLength(15);
  expect(r.state.dungeon!.cursor).toBe(before.dungeon!.cursor + 15);
  for (const c of [{ type: "drawHamletEvent" }, { type: "rollHamletCaretaker" }] as Command[])
    expect(applyCommand(r.state, c).state).toBe(r.state);
  expect(before.dungeon!.hamlet).toBeUndefined();
});
it.each(["hamlet_event:p002", "hamlet_event:p005", "hamlet_event:p013"])(
  "真实回村自然抽到%s，完成后洗回16张并启动首日，存档可续接",
  (id) => {
    const seed = seedFor(id),
      s = returned(seed);
    const r = s.step({ type: "drawHamletEvent" }),
      h = r.state.dungeon!.hamlet!;
    expect(h.phase).toBe("awaitingCaretaker");
    expect(h.active).toBeNull();
    expect(h.deck).toHaveLength(16);
    const cursor = r.state.dungeon!.cursor;
    const day = s.step({ type: "rollHamletCaretaker" });
    const next = day.state.dungeon!.hamlet!;
    expect(next.phase).toBe("heroActions");
    expect(next.heroOrder).toEqual(["hero-0", "hero-1", "hero-2", "hero-3"]);
    expect(next.blockedBuildings).toHaveLength(id.endsWith("002") ? 0 : id.endsWith("013") ? 2 : 1);
    expect(new Set(next.blockedBuildings).size).toBe(next.blockedBuildings.length);
    if (id.endsWith("002")) expect(day.state.dungeon!.cursor).toBe(cursor);
    expect(applyCommand(day.state, { type: "rollHamletCaretaker" }).state).toBe(day.state);
    const start = {
      seed,
      questId: "quest:p001" as const,
      mode: "radiant" as const,
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    };
    const save = createQuestSave(start, s.commands, day.state, coreQuestSources);
    expect(
      JSON.stringify(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game),
    ).toBe(JSON.stringify(day.state));
  },
  20000,
);
it("R33建筑映射全部十面；General Repairs同建筑不同点数也重掷", () => {
  expect(Array.from({ length: 10 }, (_, i) => caretakerBuilding(i + 1))).toEqual([
    "survivalist",
    "survivalist",
    "tavern",
    "sanitarium",
    "abbey",
    "graveyard",
    "guild",
    "blacksmith",
    "nomadWagon",
    "nomadWagon",
  ]);
  expect(caretakerBuilding(0)).toBeNull();
  // 单独的日开始边界夹具，注入种子/游标；不冒充自然任务。
  const base = returned(seedFor("hamlet_event:p013"));
  const prepared = base.step({ type: "drawHamletEvent" }).state;
  const seed = Array.from({ length: 1000 }, (_, i) => i + 1).find((seed) => {
    const rng = createRng(seed),
      a = Math.floor(rng.next() * 10) + 1,
      b = Math.floor(rng.next() * 10) + 1;
    return a !== b && caretakerBuilding(a) === caretakerBuilding(b);
  })!;
  const fixture: GameState = { ...prepared, seed, dungeon: { ...prepared.dungeon!, cursor: 0 } };
  const r = applyCommand(fixture, { type: "rollHamletCaretaker" });
  expect(r.state.dungeon!.cursor).toBeGreaterThan(2);
  expect(new Set(r.state.dungeon!.hamlet!.blockedBuildings).size).toBe(2);
  expect(applyCommand(fixture, { type: "rollHamletCaretaker" })).toEqual(r);
});
