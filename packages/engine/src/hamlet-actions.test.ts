import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { currentHamletHero, hamletActionOptions } from "./hamlet-actions";
import { conditionPoolProblem } from "./conditions";

function journey(seed = 40) {
  let game = createCoreDungeonQuest(seed, "quest:p001", "radiant", coreParty, coreQuestSources);
  const commands: Command[] = [];
  const step = (command: Command) => {
    const r = applyCommand(game, command);
    expect(
      r.events.some((e) => e.type === "commandRefused"),
      JSON.stringify(r.events),
    ).toBe(false);
    game = r.state;
    commands.push(command);
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
  for (const type of [
    "summarizeDungeonQuest",
    "beginReturnToHamlet",
    "finishReturnToHamlet",
    "drawHamletEvent",
    "rollHamletCaretaker",
  ] as const)
    step({ type });
  return {
    get game() {
      return game;
    },
    commands,
    step,
  };
}
const speech: Command = { type: "useHamletSkill", actorId: "hero-0", skill: "zealousSpeech" };
const visit = (
  actorId: string,
  serviceId: "tavern3" | "tavern6" | "heal5" | "heal10" | "cureDisease" | "removeQuirks",
  quirkIds: string[] = [],
): Command => ({ type: "visitHamletBuilding", actorId, serviceId, quirkIds });
const intimidate: Command = { type: "useHamletSkill", actorId: "hero-1", skill: "intimidate" };
function fixture() {
  const s = journey().game,
    d = s.dungeon!;
  // 服务边界夹具：不冒充自然任务获得的怪癖/疾病/金币。
  return {
    ...s,
    dungeon: {
      ...d,
      gold: 20,
      hamlet: { ...d.hamlet!, blockedBuildings: ["sanitarium", "guild"], caretaker: "sanitarium" },
      heroes: d.heroes.map((h, i) => ({
        ...h,
        stress: 7,
        wounds: 12,
        ...(i === 2 ? { diseaseId: "disease:p001", quirkIds: ["quirk:p003"] } : {}),
        ...(i === 3 ? { quirkIds: ["quirk:p001", "quirk:p018"] } : {}),
      })),
    },
  } satisfies GameState;
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result.state;
}
it("真实seed40回村General Repairs，连续四天Zealous Speech每次只减一天，完整存档回放", () => {
  const s = journey(),
    before = structuredClone(s.game);
  for (let day = 1; day <= 4; day++) {
    const cursor = s.game.dungeon!.cursor,
      gold = s.game.dungeon!.gold;
    s.step(speech);
    expect(s.game.dungeon!.cursor).toBe(cursor);
    expect(s.game.dungeon!.gold).toBe(gold);
    expect(s.game.dungeon!.hamlet!.remainingDays).toBe(4 - day);
    expect(applyCommand(s.game, speech).state).toBe(s.game);
    if (day < 4) s.step({ type: "rollHamletCaretaker" });
  }
  expect(s.game.dungeon!.hamlet!.phase).toBe("preparationComplete");
  expect(applyCommand(s.game, { type: "rollHamletCaretaker" }).state).toBe(s.game);
  const save = createQuestSave(
    {
      seed: 40,
      questId: "quest:p001",
      mode: "radiant",
      party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
    },
    s.commands,
    s.game,
    coreQuestSources,
  );
  expect(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game).toEqual(s.game);
  expect(before.dungeon!.hamlet!.day).toBe(1);
});
it("访问只对当前英雄生效并占用；Intimidate仅解当天看守人；四人完成才减天和清当天占用", () => {
  const s = fixture(),
    before = structuredClone(s);
  let game = ok(s, visit("hero-0", "tavern3"));
  expect(game.dungeon!.heroes[0]!.stress).toBe(4);
  expect(game.dungeon!.gold).toBe(19);
  expect(game.dungeon!.hamlet!.remainingDays).toBeUndefined();
  expect(currentHamletHero(game)!.id).toBe("hero-1");
  expect(applyCommand(game, visit("hero-1", "tavern6")).state).toBe(game);
  expect(applyCommand(game, visit("hero-1", "heal5")).state).toBe(game);
  game = ok(game, intimidate);
  expect(game.dungeon!.hamlet!.blockedBuildings).toEqual(["guild"]);
  expect(game.dungeon!.hamlet!.visitedBuildings).toEqual(["tavern"]);
  game = ok(game, visit("hero-2", "heal5"));
  expect(game.dungeon!.heroes[2]!.wounds).toBe(6); // Fast Healer I: 5+1
  expect(game.dungeon!.heroes[2]!.diseaseId).toBe("disease:p001");
  game = ok(game, visit("hero-3", "removeQuirks", ["quirk:p001", "quirk:p018"]));
  expect(game.dungeon!.gold).toBe(13);
  expect(game.dungeon!.conditions!.quirkDiscard).toEqual(["quirk:p001", "quirk:p018"]);
  expect(conditionPoolProblem(game.dungeon!.conditions!, game.dungeon!.heroes)).toBeNull();
  expect(game.dungeon!.hamlet).toMatchObject({
    phase: "awaitingCaretaker",
    day: 2,
    remainingDays: 3,
    actedHeroes: [],
    visitedBuildings: [],
    blockedBuildings: [],
  });
  const cursor = game.dungeon!.cursor;
  game = ok(game, { type: "rollHamletCaretaker" });
  expect(game.dungeon!.cursor).toBeGreaterThan(cursor);
  expect(game.dungeon!.hamlet!.blockedBuildings).toHaveLength(2);
  expect(currentHamletHero(game)!.id).toBe("hero-0");
  expect(s).toEqual(before);
});
it("疗养院移除疾病进入弃牌，不能附带治疗；治疗在死门恢复不掷骰，Infirm减治疗", () => {
  let s: GameState = fixture();
  const d = s.dungeon!;
  s = {
    ...s,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        caretaker: null,
        blockedBuildings: [],
        heroOrder: ["hero-2", "hero-0", "hero-1", "hero-3"],
      },
    },
  };
  let game = ok(s, visit("hero-2", "cureDisease"));
  expect(game.dungeon!.heroes[2]!.diseaseId).toBeNull();
  expect(game.dungeon!.heroes[2]!.wounds).toBe(12);
  expect(game.dungeon!.conditions!.diseaseDiscard).toEqual(["disease:p001"]);
  expect(conditionPoolProblem(game.dungeon!.conditions!, game.dungeon!.heroes)).toBeNull();
  const heal: GameState = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      heroes: s.dungeon!.heroes.map((h) =>
        h.id === "hero-2" ? { ...h, wounds: h.life!, quirkIds: ["quirk:p022"] } : h,
      ),
    },
  };
  game = ok(heal, visit("hero-2", "heal10"));
  expect(game.dungeon!.heroes[2]!.wounds).toBe(heal.dungeon!.heroes[2]!.life! - 9);
  expect(game.dungeon!.cursor).toBe(heal.dungeon!.cursor);
});
it("拒绝越序、冒用技能、重复行动、无持牌、金币不足、缺Life及坏牌池，不改变任何资源", () => {
  const s = fixture();
  for (const command of [
    visit("hero-1", "tavern3"),
    { ...intimidate, actorId: "hero-0" },
    visit("hero-0", "removeQuirks", ["quirk:p001"]),
    visit("hero-0", "tavern3", ["quirk:p001"]),
  ])
    expect(applyCommand(s, command).state).toBe(s);
  const game = ok(s, visit("hero-0", "tavern3"));
  expect(applyCommand(game, speech).state).toBe(game);
  for (const state of [
    { ...s, dungeon: { ...s.dungeon!, gold: 0 } },
    {
      ...s,
      dungeon: {
        ...s.dungeon!,
        heroes: s.dungeon!.heroes.map((h) => ({ ...h, attributesVerified: false })),
        hamlet: { ...s.dungeon!.hamlet!, blockedBuildings: [] },
      },
    },
  ])
    expect(applyCommand(state, visit("hero-0", "heal5")).state).toBe(state);
  const broken: GameState = {
    ...s,
    dungeon: {
      ...s.dungeon!,
      conditions: { ...s.dungeon!.conditions!, quirkDiscard: ["quirk:p001"] },
      hamlet: { ...s.dungeon!.hamlet!, heroOrder: ["hero-3", "hero-0", "hero-1", "hero-2"] },
    },
  };
  expect(applyCommand(broken, visit("hero-3", "removeQuirks", ["quirk:p001"])).state).toBe(broken);
  expect(
    hamletActionOptions(s).some(
      (o) => o.command.type === "visitHamletBuilding" && o.command.serviceId === "heal5",
    ),
  ).toBe(false);
});
it("Zealous Speech非首个行动原子拒绝；Busy Week逐日仍不掷骰且全体减压不低于零", () => {
  const s = fixture(),
    d = s.dungeon!;
  const ordered: GameState = {
    ...s,
    dungeon: {
      ...d,
      hamlet: { ...d.hamlet!, heroOrder: ["hero-1", "hero-0", "hero-2", "hero-3"] },
    },
  };
  const after = ok(ordered, intimidate);
  expect(applyCommand(after, speech).state).toBe(after);
  const busy: GameState = {
    ...s,
    dungeon: {
      ...d,
      hamlet: {
        ...d.hamlet!,
        noCaretaker: true,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        preparationDays: 2,
      },
    },
  };
  let game = ok(busy, speech);
  expect(game.dungeon!.heroes.map((h) => h.stress)).toEqual([2, 2, 2, 2]);
  game = ok(game, { type: "rollHamletCaretaker" });
  expect(game.dungeon!.cursor).toBe(busy.dungeon!.cursor);
  expect(game.dungeon!.hamlet!.blockedBuildings).toEqual([]);
  game = ok(game, speech);
  expect(game.dungeon!.heroes.map((h) => h.stress)).toEqual([0, 0, 0, 0]);
  expect(game.dungeon!.hamlet!.remainingDays).toBe(0);
});

import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { coreTrinketFreeProblem } from "./core-trinket-free";
import { prepareTestReplacement } from "./test-helpers/replacement";
const trinketCards = normalizedTrinketFileSchema.parse(rawTrinkets).cards;
function withTrinket(id: string, face: "upright" | "inverted" = "upright"): GameState {
  const initial = fixture(),
    d = initial.dungeon!,
    pool = d.trinkets!;
  const card = trinketCards.find((c) => c.id === id)!;
  return {
    ...initial,
    dungeon: {
      ...d,
      trinkets: {
        ...pool,
        cards: [
          ...pool.cards,
          ...trinketCards.filter(
            (c) => c.level === card.level && !pool.cards.some((old) => old.id === c.id),
          ),
        ],
        ...(card.level !== pool.level
          ? {
              inactive: [
                ...(pool.inactive ?? []),
                { level: card.level as 1 | 2 | 3, deck: null, discard: [] },
              ],
            }
          : {}),
        held: [{ cardId: id, heroId: "hero-0", face }],
      },
    },
  };
}
it("R-133村庄免费治疗不占行动，光照与Food能力不可使用", () => {
  const initial = withTrinket("trinket:p030"),
    before = initial.dungeon!.hamlet;
  const result = ok(initial, { type: "useCoreTrinket", actorId: "hero-0", cardId: "trinket:p030" });
  expect(result.dungeon!.heroes[0]!.wounds).toBe(3);
  expect(result.dungeon!.phase).toBe("inHamlet");
  expect(result.dungeon!.hamlet).toEqual(before);
  for (const [id, face] of [
    ["trinket:p028", "upright"],
    ["trinket:p035", "upright"],
    ["trinket:p015", "upright"],
    ["trinket:p029", "inverted"],
    ["trinket:p037", "inverted"],
  ] as const)
    expect(coreTrinketFreeProblem(withTrinket(id, face), "hero-0", id)).toContain("村庄");
});
it("R-133村庄饰品压力检定后保留准备阶段与当天行动", () => {
  const initial = withTrinket("trinket:p030", "inverted");
  const state = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      heroes: initial.dungeon!.heroes.map((h, i) => (i ? h : { ...h, stress: 8 })),
    },
  };
  const result = ok(state, { type: "useCoreTrinket", actorId: "hero-0", cardId: "trinket:p030" });
  expect(result.dungeon!.heroes[0]!.resolveTested).toBe(true);
  expect(result.dungeon!.phase).toBe("inHamlet");
  expect(result.dungeon!.hamlet).toEqual(initial.dungeon!.hamlet);
  expect(result.dungeon!.freeTrinketResume).toBeUndefined();
});
it("R-133建筑治疗提供Bloodcourse Necklace，选择前不扣金币或行动", () => {
  const initial = withTrinket("trinket:p023");
  const state = {
    ...initial,
    dungeon: {
      ...initial.dungeon!,
      hamlet: { ...initial.dungeon!.hamlet!, blockedBuildings: [], caretaker: null },
    },
  };
  const open = applyCommand(state, { ...visit("hero-0", "heal5"), allTrinkets: true });
  expect(open.pendingChoice?.options.some((o) => o.id === "trinket:p023")).toBe(true);
  expect(open.state.dungeon!.gold).toBe(state.dungeon!.gold);
  const paid = applyCommand(open.state, {
    type: "resolveChoice",
    choiceId: open.pendingChoice!.id,
    optionId: "trinket:p023",
    allTrinkets: true,
  });
  expect(paid.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(paid.state.dungeon!.heroes[0]!.wounds).toBe(3);
  expect(paid.state.dungeon!.hamlet!.actedHeroes).toEqual(["hero-0"]);
});
it.each([false, true])("R-134村庄死亡替补继承原行动使用状态=%s，天数不变", (acted) => {
  const initial = withTrinket("trinket:p030", "inverted"),
    d = initial.dungeon!;
  const state = {
    ...initial,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, stress: 8, resolveTested: true, resolveCardId: d.resolveCards[0]!.id },
      ),
      hamlet: { ...d.hamlet!, actedHeroes: acted ? ["hero-0"] : [] },
    },
  };
  const dead = ok(state, { type: "useCoreTrinket", actorId: "hero-0", cardId: "trinket:p030" });
  expect(dead.dungeon!.replacementResume).toBe("hamletTrinket");
  expect(dead.dungeon!.hamletReturn!.phase).toBe("awaitingReplacement");
  const prepared = prepareTestReplacement(dead),
    newId = prepared.dungeon!.preparedReplacements![0]!.hero.id;
  const joined = ok(prepared, { type: "joinPreparedReplacements" });
  expect(joined.dungeon!.hamlet!.heroOrder[0]).toBe(newId);
  expect(joined.dungeon!.hamlet!.actedHeroes).toEqual(acted ? [newId] : []);
  expect(joined.dungeon!.hamlet!.day).toBe(d.hamlet!.day);
  expect(joined.dungeon!.hamlet!.remainingDays).toBe(d.hamlet!.remainingDays);
  expect(joined.dungeon!.phase).toBe("inHamlet");
});
