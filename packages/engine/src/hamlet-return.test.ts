import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { GameState, Command } from "./command";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { createConditionPool, conditionPoolProblem } from "./conditions";
import { createLootState } from "./loot";
import { createQuestSave, loadQuestSave } from "./quest-save";
import { trinketPoolProblem } from "./trinket-acquisition";
import { QUIRK_NAMES } from "./passive";

const q = (name: (typeof QUIRK_NAMES)[number]) =>
  `quirk:p${String(QUIRK_NAMES.indexOf(name) + 1).padStart(3, "0")}`;

const journey = naturalQuest(1, "quest:p001");
const begin: Command = { type: "beginReturnToHamlet" };
const finish: Command = { type: "finishReturnToHamlet" };
const ok = (s: GameState, c: Command) => {
  const r = applyCommand(s, c);
  expect(
    r.events.find((e) => e.type === "commandRefused"),
    JSON.stringify(r.events),
  ).toBeUndefined();
  return r;
};
function complete(s: GameState) {
  let r = ok(s, begin);
  const commands: Command[] = [begin];
  while (r.pendingChoice) {
    const c: Command = {
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    };
    r = ok(r.state, c);
    commands.push(c);
  }
  r = ok(r.state, finish);
  commands.push(finish);
  return { ...r, commands };
}
// 独立规则边界夹具，明确注入持牌/弃牌/压力；真实路径验收另用journey原状态。
function fixture(): GameState {
  const d = journey.state.dungeon!;
  return {
    ...journey.state,
    dungeon: {
      ...d,
      conditions: createConditionPool(d.conditions!.diseases, d.conditions!.quirks),
      resolveDecks: {},
      heroes: d.heroes.map((h) => ({
        ...h,
        stress: 4,
        wounds: 5,
        quirkIds: [],
        diseaseId: null,
        resolveCardId: undefined,
        resolveTested: false,
        ...(h.combat
          ? {
              combat: {
                ...h.combat,
                wounds: 5,
                stress: 4,
                quirkIds: [],
                diseaseId: null,
                resolveCardId: null,
                resolveTested: false,
              },
            }
          : {}),
      })),
    },
  };
}
it("真实Scout路径接完整回村、一次换金/XP并存档回放；不恢复伤口压力", () => {
  const s = journey.state,
    before = structuredClone(s),
    d = s.dungeon!;
  const r = complete(s),
    next = r.state.dungeon!;
  expect(next.phase).toBe("inHamlet");
  expect(next.gold).toBe(d.gold + d.explorationSetup!.provisions.length);
  expect(next.heroes.map((h) => [h.wounds, h.stress])).toEqual(
    d.heroes.map((h) => [h.wounds, h.stress]),
  );
  expect(next.heroes.map((h) => h.xp)).toEqual([1, 1, 1, 1]);
  expect(next.stagecoachXp).toBe(1);
  expect(next.questSummary!.awarded).toBe(true);
  expect(applyCommand(r.state, finish).state).toBe(r.state);
  expect(applyCommand(r.state, begin).state).toBe(r.state);
  const start = {
    seed: 1,
    questId: "quest:p001" as const,
    mode: "radiant" as const,
    party: naturalParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
  };
  const save = createQuestSave(
    start,
    [...journey.commands, ...r.commands],
    r.state,
    coreQuestSources,
  );
  expect(
    JSON.stringify(loadQuestSave(JSON.parse(JSON.stringify(save)), coreQuestSources).game),
  ).toBe(JSON.stringify(r.state));
  expect(s).toEqual(before);
}, 20000);
it("R32 a-c回收所有对应弃牌、持牌保留、状态清零与饰品正置，种子确定且守恒", () => {
  const s = fixture(),
    d = s.dungeon!,
    p = d.conditions!;
  const tokens = createLootState().available;
  const prepared: GameState = {
    ...s,
    dungeon: {
      ...d,
      conditions: {
        ...p,
        diseaseDiscard: [p.diseases[0]!.id],
        quirkDiscard: [p.quirks[0]!.id, p.quirks[17]!.id],
      },
      curio: {
        ...d.curio!,
        deck: d.curio!.cards.slice(1).map((c) => c.id),
        discard: [d.curio!.cards[0]!.id],
      },
      roomCards: {
        ...d.roomCards!,
        deck: d
          .roomCards!.cards.filter((c) => c.location === "ruins" && !c.boss && c.id !== "room:p001")
          .map((c) => c.id),
        discard: ["room:p001"],
      },
      lootPool: {
        ...d.lootPool!,
        available: tokens.slice(2),
        claimedIds: tokens.slice(0, 2).map((t) => t.id),
      },
      trinkets: {
        ...d.trinkets!,
        deck: null,
        held: [{ cardId: "trinket:p001", heroId: "hero-0", face: "inverted" }],
        discard: ["trinket:p002"],
      },
      explorationSetup: { ...d.explorationSetup!, light: 0 },
      heroes: d.heroes.map((h) => ({
        ...h,
        statusStacks: [{ kind: "bleed", remaining: 3, amount: 2 }],
        bleed: ["old"],
        guard: true,
      })),
    },
  };
  const r = ok(prepared, begin),
    next = r.state.dungeon!;
  expect(ok(prepared, begin)).toEqual(r);
  expect(next.curio!.discard).toEqual([]);
  expect(next.curio!.deck).toHaveLength(24);
  expect(next.roomCards!.deck).toHaveLength(9);
  expect(next.lootPool!.available).toHaveLength(10);
  expect(next.lootPool!.claimedIds).toEqual([]);
  expect(next.conditions!.quirkDiscard).toEqual([]);
  expect(next.conditions!.diseaseDiscard).toEqual([]);
  expect(conditionPoolProblem(next.conditions!, next.heroes)).toBeNull();
  expect(trinketPoolProblem(next.trinkets!, next.heroes)).toBeNull();
  expect(next.trinkets!.held[0]!.face).toBe("upright");
  expect(next.explorationSetup!.light).toBe(5);
  expect(
    next.heroes.every(
      (h) =>
        h.statusStacks!.length === 0 &&
        "guard" in h &&
        h.guard === false &&
        "bleed" in h &&
        Array.isArray(h.bleed) &&
        h.bleed.length === 0,
    ),
  ).toBe(true);
});
it("R-074当前姿态顺序分牌，第四怪癖选择冻结；选择后下一英雄继续，不重抽", () => {
  const s = fixture(),
    d = s.dungeon!,
    p = d.conditions!;
  const positive = p.quirks
    .filter((q) => q.polarity === "positive")
    .slice(0, 3)
    .map((q) => q.id);
  const virtues = d.resolveCards.filter((c) => c.role === "virtue");
  const state: GameState = {
    ...s,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => ({
        ...h,
        stance: (["support", "ranged", "defensive", "aggressive"] as const)[i]!,
        resolveCardId: i === 0 ? virtues[1]!.id : i === 3 ? virtues[0]!.id : undefined,
        resolveTested: i === 0 || i === 3,
        quirkIds: i === 3 ? positive : [],
      })),
    },
  };
  const r = ok(state, begin);
  expect(r.pendingChoice!.actorId).toBe("hero-3");
  expect(r.state.dungeon!.resolveDecks.virtue).toHaveLength(5);
  expect(r.state.dungeon!.heroes.every((h) => !h.resolveCardId)).toBe(true);
  expect(applyCommand(r.state, finish).state).toBe(r.state);
  const c: Command = {
    type: "resolveChoice",
    choiceId: r.pendingChoice!.id,
    optionId: positive[0]!,
  };
  const continued = ok(r.state, c);
  expect(continued.state.dungeon!.hamletReturn!.convertedHeroIds).toEqual([
    "hero-3",
    "hero-2",
    "hero-1",
    "hero-0",
  ]);
  expect(continued.state.dungeon!.heroes[0]!.quirkIds).toHaveLength(1);
  expect(applyCommand(continued.state, c).state).toBe(continued.state);
  expect(continued.state.dungeon!.conditions!.quirkDiscard).toEqual([positive[0]]);
});
it("第四负面发疯后等待替换，不继续发XP或推定战役失败", () => {
  const s = fixture(),
    d = s.dungeon!,
    p = d.conditions!;
  const state: GameState = {
    ...s,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              resolveCardId: d.resolveCards.find((c) => c.role === "affliction")!.id,
              resolveTested: true,
              quirkIds: p.quirks
                .filter((q) => q.polarity === "negative")
                .slice(0, 3)
                .map((q) => q.id),
            },
      ),
    },
  };
  const r = ok(state, begin);
  expect(r.state.dungeon!.heroes[0]).toMatchObject({ dead: true, deathReason: "madness" });
  expect(r.state.dungeon!.hamletReturn!.phase).toBe("awaitingReplacement");
  expect(r.state.dungeon!.questSummary!.awarded).toBe(false);
  expect(applyCommand(r.state, finish).state).toBe(r.state);
});
it("回村补给可选择真实消耗，再仅兑换剩余骰，不自动恢复或重复给钱", () => {
  const s = fixture(),
    d = s.dungeon!;
  const prepared = {
    ...s,
    dungeon: {
      ...d,
      explorationSetup: {
        ...d.explorationSetup!,
        provisions: [
          { id: "f", face: "food" as const },
          { id: "t", face: "tool" as const },
        ],
      },
    },
  };
  const entered = ok(prepared, begin).state;
  const used = ok(entered, {
    type: "useProvision",
    provisionId: "f",
    targetId: "hero-0",
    effect: "heal",
  }).state;
  expect(used.dungeon!.heroes[0]!.wounds).toBe(4);
  const r = ok(used, finish);
  expect(r.state.dungeon!.gold).toBe(d.gold + 1);
  expect(r.state.dungeon!.explorationSetup!.provisions).toEqual([]);
});
it("未离开、未摘要、不守恒牌池与陈旧选择都原子拒绝且不消耗RNG", () => {
  const s = fixture(),
    d = s.dungeon!;
  const { questSummary: _summary, ...withoutSummary } = d;
  expect(_summary).toBeDefined();
  for (const state of [
    { ...s, dungeon: { ...d, phase: "ready" as const } },
    { ...s, dungeon: withoutSummary },
    { ...s, dungeon: { ...d, questSummary: { ...d.questSummary!, awarded: true } } },
    { ...s, dungeon: { ...d, curio: { ...d.curio!, deck: [] } } },
    { ...s, dungeon: { ...d, trinkets: { ...d.trinkets!, cards: [] } } },
  ])
    expect(applyCommand(state, begin).state).toBe(state);
});
it("R-076回村恢复光照不触发Photo Mania/Nocturnal/Light Sensitive", () => {
  const s = fixture(),
    d = s.dungeon!;
  const state = {
    ...s,
    dungeon: {
      ...d,
      explorationSetup: { ...d.explorationSetup!, light: 0 },
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, quirkIds: [q("Photo Mania"), q("Nocturnal"), q("Light Sensitive")] },
      ),
    },
  };
  const r = ok(state, begin);
  expect(r.state.dungeon!.heroes[0]).toMatchObject({ stress: 4, wounds: 5 });
  expect(r.events.some((e) => e.type === "passiveTriggered")).toBe(false);
  expect(r.state.dungeon!.explorationSetup!.light).toBe(5);
});
it("真实起点领完八补给即可提前离开回村，未战斗宝箱池首次建立，0XP及8金币", () => {
  let r = ok(createCoreDungeonQuest(31, "quest:p001", "radiant", coreParty, coreQuestSources), {
    type: "rollDungeonProvisions",
  });
  while (r.pendingChoice)
    r = ok(r.state, {
      type: "resolveChoice",
      choiceId: r.pendingChoice.id,
      optionId: r.pendingChoice.options[0]!.id,
    });
  r = ok(r.state, { type: "leaveDungeon" });
  r = ok(r.state, { type: "resolveChoice", choiceId: r.pendingChoice!.id, optionId: "agree" });
  r = ok(r.state, { type: "summarizeDungeonQuest" });
  expect(r.state.dungeon!.lootPool).toBeUndefined();
  const returned = complete(r.state).state.dungeon!;
  expect(returned.gold).toBe(8);
  expect(returned.stagecoachXp).toBe(0);
  expect(returned.lootPool!.available).toHaveLength(10);
  expect(returned.heroes.map((h) => h.xp)).toEqual([0, 0, 0, 0]);
});
it("R-075回村Food令Stress Eater压力10，新意志立刻转换；补给不重付，仍在回村窗口", () => {
  const s = fixture(),
    d = s.dungeon!;
  const state = {
    ...s,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 9, quirkIds: [q("Stress Eater")] })),
      explorationSetup: {
        ...d.explorationSetup!,
        provisions: [
          { id: "f", face: "food" as const },
          { id: "t", face: "tool" as const },
        ],
      },
    },
  };
  const entered = ok(state, begin).state;
  const c: Command = { type: "useProvision", provisionId: "f", targetId: "hero-0", effect: "heal" };
  const r = ok(entered, c);
  expect(r.events.some((e) => e.type === "resolveTested")).toBe(true);
  expect(r.state.dungeon!.heroes[0]).toMatchObject({ stress: 0, resolveTested: false });
  expect(r.state.dungeon!.heroes[0]!.resolveCardId).toBeUndefined();
  expect(r.state.dungeon!.heroes[0]!.quirkIds).toHaveLength(2);
  expect(r.state.dungeon!.phase).toBe("returningToHamlet");
  expect(r.state.dungeon!.hamletReturn!.phase).toBe("provisions");
  expect(r.state.dungeon!.explorationSetup!.provisions.map((p) => p.id)).toEqual(["t"]);
  expect(applyCommand(r.state, c).state).toBe(r.state);
  expect(ok(r.state, finish).state.dungeon!.gold).toBe(d.gold + 1);
});
it("R38 returning to Hamlet clears Beast form without applying Transform effects", () => {
  const original = fixture();
  const first = original.dungeon!.heroes[0]!;
  const game = {
    ...original,
    dungeon: {
      ...original.dungeon!,
      heroes: original.dungeon!.heroes.map((h, i) =>
        i === 0
          ? {
              ...h,
              combat: {
                ...h.combat!,
                hero: "ABOMINATION",
                form: "beast" as const,
                wounds: h.wounds!,
                stress: h.stress,
              },
            }
          : h,
      ),
    },
  };
  const returned = ok(game, begin).state;
  expect(returned.dungeon!.heroes[0]!.combat?.form).toBe("human");
  expect(returned.dungeon!.heroes[0]!.wounds).toBe(first.wounds);
  expect(returned.dungeon!.heroes[0]!.stress).toBe(first.stress);
  expect(returned.dungeon!.heroes[0]!.statusStacks).toEqual([]);
});
