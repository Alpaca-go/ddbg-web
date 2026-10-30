import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "../command";
import { coreParty, coreQuestSources } from "../test-helpers/core-quest";
import { createCoreDungeonQuest } from "../dungeon-quest-entry";
import { nextBattleRoll } from "../battle-roll";
import { resolveCurioRows } from "../dungeon-curio-effects";
import { scoutRestSchema } from "../../../data/src/scout-rest";
import { trinketPoolProblem } from "../trinket-acquisition";

function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(
    result.events.filter((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toEqual([]);
  return result;
}
function hamlet(script: string) {
  const base = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources);
  const d = base.dungeon!;
  const ids = d.heroes.map((h) => h.id);
  const cursor = Array.from({ length: 100 }, (_, i) => i).find((i) => nextBattleRoll(7, i) === 3)!;
  return {
    ...base,
    dungeon: {
      ...d,
      phase: "inHamlet",
      cursor,
      gold: 30,
      activeBossThreatScriptId: script,
      ...(d.lootPool ? { lootPool: { ...d.lootPool, gold: 30 } } : {}),
      heroes: d.heroes.map((h) => ({ ...h, stress: 4, wounds: 0 })),
      hamletReturn: { phase: "complete", order: ids, resolveRoles: {}, convertedHeroIds: [] },
      hamlet: {
        phase: "heroActions",
        deck: [],
        permanentlyRemoved: [],
        last: "hamlet_event:p001",
        active: null,
        preparationDays: 2,
        remainingDays: 2,
        day: 1,
        noCaretaker: true,
        extraBlock: false,
        caretaker: null,
        blockedBuildings: [],
        visitedBuildings: [],
        heroOrder: ids,
        actedHeroes: ids.slice(0, 3),
      },
    },
  } as GameState;
}
const tavern = (state: GameState): Command => ({
  type: "visitHamletBuilding",
  actorId: state.dungeon!.heroes[3]!.id,
  serviceId: "tavern3",
  quirkIds: [],
});

it("收藏家 II：实际最后一个建筑行动触发日末偷金币；只匹配有英雄的建筑，骰面 JSON 可回放", () => {
  const state = hamlet("boss:ruins:collector:2"),
    before = structuredClone(state);
  const result = ok(state, tavern(state));
  const amount = nextBattleRoll(7, state.dungeon!.cursor + 1);
  expect(result.state.dungeon!.gold).toBe(29 - amount);
  expect(result.state.dungeon!.cursor).toBe(state.dungeon!.cursor + 2);
  expect(result.state.dungeon!.hamlet?.remainingDays).toBe(1);
  expect(state).toEqual(before);
  expect(ok(JSON.parse(JSON.stringify(state)), tavern(state))).toEqual(result);
  const empty = { ...state, dungeon: { ...state.dungeon!, cursor: state.dungeon!.cursor + 1 } };
  while (nextBattleRoll(7, empty.dungeon.cursor) === 3) empty.dungeon.cursor++;
  const absent = ok(empty, tavern(empty));
  expect(absent.state.dungeon!.cursor).toBe(empty.dungeon.cursor + 1);
  expect(absent.state.dungeon!.gold).toBe(29);
});

it("收藏家 III：Snatch 选择只弃指定英雄饰品；保留日末骰子/天数及牌池守恒", () => {
  const base = hamlet("boss:ruins:collector:3"),
    d = base.dungeon!;
  const state = {
    ...base,
    dungeon: {
      ...d,
      trinkets: {
        ...d.trinkets!,
        held: [{ cardId: "trinket:p001", heroId: d.heroes[3]!.id, face: "inverted" as const }],
      },
    },
  };
  const pending = ok(state, tavern(state));
  expect(pending.pendingChoice?.options.map((o) => o.id)).toEqual(["trinket:p001"]);
  const saved = JSON.parse(JSON.stringify(pending.state)) as GameState;
  const choose: Command = {
    type: "resolveChoice",
    choiceId: pending.pendingChoice!.id,
    optionId: "trinket:p001",
  };
  const done = ok(saved, choose);
  expect(done.state.dungeon!.trinkets!.discard).toContain("trinket:p001");
  expect(done.state.dungeon!.trinkets!.held).toEqual([]);
  expect(trinketPoolProblem(done.state.dungeon!.trinkets!, done.state.dungeon!.heroes)).toBeNull();
  expect(done.state.dungeon!.cursor).toBe(saved.dungeon!.cursor);
  expect(done.state.dungeon!.hamlet!.remainingDays).toBe(1);
  expect(applyCommand(done.state, choose).events.some((e) => e.type === "commandRefused")).toBe(
    true,
  );
  expect(applyCommand(saved, { ...choose, optionId: "trinket:p002" }).state).toBe(saved);
});

it("狂信者 II：免费/付费村庄技能共用 Stupid Acts；技能生效后 Debuff 4t", () => {
  const base = hamlet("boss:ruins:fanatic:2"),
    d = base.dungeon!;
  const state = { ...base, dungeon: { ...d, hamlet: { ...d.hamlet!, actedHeroes: [] } } };
  const done = ok(state, {
    type: "useHamletSkill",
    actorId: d.heroes[0]!.id,
    skill: "zealousSpeech",
  });
  expect(done.state.dungeon!.heroes[0]!.statusStacks).toContainEqual({
    kind: "debuff",
    remaining: 4,
  });
  expect(done.state.dungeon!.hamlet?.remainingDays).toBe(1);
  expect(done.state.dungeon!.cursor).toBe(state.dungeon.cursor);
});

it("狂信者 III：Lynch Mob 按实际日末建筑英雄等级承受伤口及压力", () => {
  const state = hamlet("boss:ruins:fanatic:3");
  const done = ok(state, tavern(state));
  expect(done.state.dungeon!.heroes[3]!.wounds).toBe(2);
  expect(done.state.dungeon!.heroes[3]!.stress).toBe(3); // Tavern 4→1，随后 +2
  expect(done.state.dungeon!.cursor).toBe(state.dungeon!.cursor + 1);
  expect(done.state.dungeon!.hamlet?.remainingDays).toBe(1);
});

it("Lynch Mob 心脏病死亡保留已经结束的准备日，补员不重掷日末", () => {
  const base = hamlet("boss:ruins:fanatic:3"),
    d = base.dungeon!;
  const cursor = Array.from({ length: 100 }, (_, i) => i).find((i) => nextBattleRoll(7, i) === 4)!;
  const state = {
    ...base,
    dungeon: {
      ...d,
      cursor,
      heroes: d.heroes.map((h, i) =>
        i === 3
          ? {
              ...h,
              stress: 9,
              resolveTested: true,
              resolveCardId: coreQuestSources.resolveCards[0]!.id,
            }
          : h,
      ),
    },
  };
  const done = ok(state, {
    type: "visitHamletBuilding",
    actorId: d.heroes[3]!.id,
    serviceId: "heal5",
    quirkIds: [],
  });
  expect(done.state.dungeon!.heroes[3]!.dead).toBe(true);
  expect(done.state.dungeon!.phase).toBe("awaitingReplacement");
  expect(done.state.dungeon!.replacementResume).toBe("hamletThreat");
  expect(done.state.dungeon!.hamlet!.remainingDays).toBe(1);
  expect(done.state.dungeon!.cursor).toBe(cursor + 5); // 日末 d10 + 回收美德牌后洗五张牌的四次 RNG
  expect(
    done.events.filter((e) => e.type === "dungeonUpdated" && e.message.startsWith("lynchMob 日末")),
  ).toHaveLength(1);
});

it("先知 II：侦察额外压力与原费用同次支付，每名英雄 +2", () => {
  const base = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources),
    d = base.dungeon!;
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      phase: "ready",
      position: d.rooms.find((r) => r.kind === "empty")!.id,
      rooms: d.rooms.map((r) => (r.kind === "empty" ? { ...r, revealed: true, cleared: true } : r)),
      activeBossThreatScriptId: "boss:ruins:prophet:2",
      heroes: d.heroes.map((h) => ({ ...h, stress: 0 })),
    },
  };
  const ask = ok(state, { type: "scoutDungeon" });
  const done = ok(ask.state, {
    type: "resolveChoice",
    choiceId: ask.pendingChoice!.id,
    optionId: "agree",
  });
  expect(done.state.dungeon!.heroes.map((h) => h.stress)).toEqual([2, 2, 2, 2]);
});

it("收藏家 II：Curio 奖励按整卡一次掷骰，截走金币；不截走其余效果", () => {
  const base = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources);
  for (const desired of [3, 8]) {
    const d = base.dungeon!,
      cursor = Array.from({ length: 100 }, (_, i) => i).find(
        (i) => nextBattleRoll(7, i) === desired,
      )!;
    const state: GameState = {
      ...base,
      dungeon: {
        ...d,
        cursor,
        phase: "awaitingCurio",
        activeBossThreatScriptId: "boss:ruins:collector:2",
        curioRoom: { roomId: d.position, heroId: d.heroes[0]!.id, guardRoll: 10, stage: "drawing" },
        curio: {
          ...d.curio!,
          deck: d.curio!.cards.filter((c) => c.id !== "curio:p004").map((c) => c.id),
          active: {
            cardId: "curio:p004",
            heroId: d.heroes[0]!.id,
            roomId: d.position,
            rollId: `room-curio:${d.position}`,
            protected: true,
          },
        },
      },
    };
    const done = resolveCurioRows(state);
    expect(done.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(done.state.dungeon!.gold - d.gold).toBe(desired <= 5 ? 0 : 5);
    expect(done.state.dungeon!.cursor).toBe(cursor + 1);
    expect(done.state.dungeon!.curio?.last?.collectorTheftRoll).toBe(desired);
    expect(done).toEqual(resolveCurioRows(JSON.parse(JSON.stringify(state))));
  }
});

it("收藏家 III：真实 Resting 固定四点，均分每人一点，完成状态通过存档 schema", () => {
  const base = createCoreDungeonQuest(7, "quest:p001", "radiant", coreParty, coreQuestSources),
    d = base.dungeon!;
  const position = d.rooms.find((r) => r.kind === "empty")!.id;
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      phase: "ready",
      position,
      activeBossThreatScriptId: "boss:ruins:collector:3",
      heroes: d.heroes.map((h) => ({ ...h, stress: 4 })),
      rooms: d.rooms.map((r) => (r.id === position ? { ...r, revealed: true, cleared: true } : r)),
    },
  };
  let result = ok(state, { type: "restDungeon" });
  result = ok(result.state, {
    type: "resolveChoice",
    choiceId: result.pendingChoice!.id,
    optionId: "equal",
  });
  for (let i = 0; i < 4; i++)
    result = ok(JSON.parse(JSON.stringify(result.state)), {
      type: "resolveChoice",
      choiceId: result.pendingChoice!.id,
      optionId: `stress:${i}`,
    });
  expect(result.state.dungeon!.rest?.used).toBe(true);
  expect(result.state.dungeon!.heroes.map((h) => h.stress)).toEqual([3, 3, 3, 3]);
  expect(scoutRestSchema.safeParse(result.state.dungeon!.rest).success).toBe(true);
});
