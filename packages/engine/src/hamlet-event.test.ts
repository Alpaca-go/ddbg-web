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
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
  ]);
  expect(dictionary.icons.find((c) => c.iconId === "43aaf29bbb")!.key).toBe("occupancy_pips");
  expect(hamletEventFileSchema.safeParse({ ...events, cards: cards.slice(1) }).success).toBe(false);
});
it("完整牌池抽Lost Shipment：记录下次减骰、洗回并开始四天，不重复发放", () => {
  const s = returned(seedFor("hamlet_event:p003"));
  const before = structuredClone(s.game),
    r = s.step({ type: "drawHamletEvent" });
  expect(r.state.dungeon!.hamlet).toMatchObject({
    phase: "awaitingCaretaker",
    active: null,
    preparationDays: 4,
  });
  expect(r.state.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(r.state.dungeon!.cursor).toBe(before.dungeon!.cursor + 30);
  expect(r.state.dungeon!.nextQuestLostShipment).toBe(true);
  expect(applyCommand(r.state, { type: "drawHamletEvent" }).state).toBe(r.state);
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
it("Medical Breakthrough自然回村无疾病：无待选、不掷治疗骰、不付费，洗回后开始三天且存档回放一致", () => {
  const seed = seedFor("hamlet_event:p011"),
    s = returned(seed);
  const before = structuredClone(s.game),
    r = s.step({ type: "drawHamletEvent" });
  expect(r.pendingChoice).toBeUndefined();
  expect(r.state.dungeon!.hamlet).toMatchObject({
    active: null,
    phase: "awaitingCaretaker",
    preparationDays: 3,
  });
  expect(r.state.dungeon!.hamlet!.deck).toHaveLength(16);
  expect(r.state.dungeon!.cursor).toBe(before.dungeon!.cursor + 30);
  expect(r.state.dungeon!.heroes).toEqual(before.dungeon!.heroes);
  expect(r.state.dungeon!.gold).toBe(before.dungeon!.gold);
  const start = {
    seed,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: coreParty.map((hero) => ({ ...hero, skillIds: [...hero.skillIds] })),
  };
  const save = createQuestSave(start, s.commands, r.state, coreQuestSources);
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(r.state);
  expect(s.game).toEqual(before); // helper不更新game属性，原状态不变
});
it("Medical Breakthrough疾病边界夹具：团队选择一人，仅移除选中疾病并同步投影；不治疗/收费/消耗英雄行动", () => {
  const s = returned(seedFor("hamlet_event:p011")),
    d = s.game.dungeon!,
    pool = d.conditions!;
  // 明示疾病夹具；完整实体池，不将人工持牌冒充自然任务。
  const game: GameState = {
    ...s.game,
    dungeon: {
      ...d,
      heroes: d.heroes.map((hero, i) =>
        i < 2
          ? {
              ...hero,
              diseaseId: pool.diseases[i]!.id,
              combat: {
                id: hero.id,
                side: "hero",
                areaId: "fixture",
                hero: "fixture",
                skillIds: [],
                guard: false,
                dead: false,
                bleed: [],
                blight: [],
                wounds: hero.wounds!,
                life: hero.life!,
                dodge: 0,
                diseaseId: pool.diseases[i]!.id,
              },
            }
          : hero,
      ),
    },
  };
  const before = structuredClone(game),
    r = applyCommand(game, { type: "drawHamletEvent" });
  expect(r.pendingChoice!.options.map((option) => option.id)).toEqual(["hero-0", "hero-1"]);
  expect(r.pendingChoice!.actorId).toBe("party");
  expect(r.state.dungeon!.hamlet).toMatchObject({
    active: "hamlet_event:p011",
    preparationDays: null,
    phase: "eventBlocked",
  });
  expect(r.state.dungeon!.hamlet!.deck).toHaveLength(15);
  expect(r.state.dungeon!.cursor).toBe(d.cursor + 15);
  for (const command of [
    { type: "drawHamletEvent" },
    { type: "rollHamletCaretaker" },
    { type: "upgradeHamletBuilding", building: "abbey" },
    { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" },
    { type: "resolveChoice", choiceId: "wrong", optionId: "hero-1" },
    { type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "hero-2" },
  ] as Command[])
    expect(applyCommand(r.state, command).state).toBe(r.state);
  const choice: Command = {
    type: "resolveChoice",
    choiceId: r.pendingChoice!.id,
    optionId: "hero-1",
  };
  const next = applyCommand(r.state, choice).state,
    n = next.dungeon!;
  expect(n.heroes[0]!.diseaseId).toBe(pool.diseases[0]!.id);
  expect(n.heroes[1]!.diseaseId).toBeNull();
  expect(n.heroes[1]!.combat?.diseaseId).toBeNull();
  expect(n.conditions!.diseaseDiscard).toEqual([...pool.diseaseDiscard, pool.diseases[1]!.id]);
  expect(n.heroes.map((hero) => [hero.wounds, hero.stress])).toEqual(
    d.heroes.map((hero) => [hero.wounds, hero.stress]),
  );
  expect(n.gold).toBe(d.gold);
  expect(n.hamlet).toMatchObject({
    phase: "awaitingCaretaker",
    preparationDays: 3,
    day: 1,
    heroOrder: [],
  });
  expect(n.hamlet!.deck).toHaveLength(16);
  expect(n.pending).toBeNull();
  expect(n.cursor).toBe(d.cursor + 30);
  expect(applyCommand(next, choice).state).toBe(next);
  expect(applyCommand(r.state, choice).state).toEqual(next);
  expect(game).toEqual(before);
  const corrupt: GameState = {
    ...r.state,
    dungeon: {
      ...r.state.dungeon!,
      conditions: { ...pool, diseaseDiscard: [pool.diseases[0]!.id] },
    },
  };
  expect(applyCommand(corrupt, choice).state).toBe(corrupt);
  const brokenDeck: GameState = {
    ...r.state,
    dungeon: { ...r.state.dungeon!, hamlet: { ...r.state.dungeon!.hamlet!, deck: [] } },
  };
  expect(applyCommand(brokenDeck, choice).state).toBe(brokenDeck);
});
it("Medical Breakthrough损坏疾病池在抽牌前原子拒绝，不消耗RNG或替换事件", () => {
  const s = returned(seedFor("hamlet_event:p011"));
  const { conditions, ...withoutPool } = s.game.dungeon!;
  expect(conditions).toBeDefined();
  const game = { ...s.game, dungeon: withoutPool };
  expect(applyCommand(game, { type: "drawHamletEvent" }).state).toBe(game);
});
