import { expect, it } from "vitest";
import { applyCommand } from "./command";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { conditionPoolProblem } from "./conditions";
import { releaseDeadHeroCards } from "./hero-death-cards";
import { continueDeathEstates } from "./hero-death-estate";
import { createBattleState } from "./battle";

/** 显式持牌/牌序夹具；原子接口与公开侦察死亡分开验收，不冒充自然战役。 */
function fixture(materialized = true): GameState {
  const base = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  const d = base.dungeon!,
    pool = d.conditions!,
    negative = pool.quirks.filter((c) => c.polarity === "negative"),
    positive = pool.quirks.filter((c) => c.polarity === "positive"),
    afflictions = d.resolveCards.filter((c) => c.role === "affliction");
  const heroes = d.heroes.map((h, i) =>
    i < 2
      ? {
          ...h,
          dead: i === 0,
          diseaseId: pool.diseases[i]!.id,
          quirkIds: [negative[i]!.id, positive[i]!.id],
          resolveCardId: afflictions[i]!.id,
          resolveTested: true,
        }
      : h,
  );
  const diseaseDiscard = [pool.diseases[2]!.id];
  const quirkDiscard = [negative[2]!.id, positive[2]!.id];
  const held = heroes.flatMap((h) => h.quirkIds ?? []);
  return {
    ...base,
    dungeon: {
      ...d,
      phase: "ready",
      position: "G",
      heroes,
      conditions: {
        ...pool,
        diseaseDiscard,
        quirkDiscard,
        diseaseDeck: materialized ? pool.diseases.slice(3).map((c) => c.id) : null,
        negativeDeck: materialized
          ? negative
              .filter((c) => !held.includes(c.id) && !quirkDiscard.includes(c.id))
              .map((c) => c.id)
          : null,
        positiveDeck: materialized
          ? positive
              .filter((c) => !held.includes(c.id) && !quirkDiscard.includes(c.id))
              .map((c) => c.id)
          : null,
      },
      resolveDecks: materialized ? { affliction: afflictions.slice(2).map((c) => c.id) } : {},
    },
  };
}
function release(state: GameState) {
  const result = releaseDeadHeroCards({ state, events: [] });
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  return result;
}
it.each([true, false])(
  "即时回收全部四类持牌、保留存活者及其他弃牌，支持尚未实例化牌堆=%s",
  (materialized) => {
    const base = fixture(materialized),
      before = structuredClone(base),
      dead = base.dungeon!.heroes[0]!,
      next = release(base).state.dungeon!,
      pool = next.conditions!;
    expect(conditionPoolProblem(pool, next.heroes)).toBeNull();
    expect(pool.diseaseDeck).toContain(dead.diseaseId);
    for (const id of dead.quirkIds!) {
      const key =
        pool.quirks.find((c) => c.id === id)!.polarity === "positive"
          ? "positiveDeck"
          : "negativeDeck";
      expect(pool[key]).toContain(id);
    }
    expect(next.resolveDecks.affliction).toContain(dead.resolveCardId);
    expect(next.resolveDecks.virtue).toBeUndefined();
    expect(next.heroes[0]).toMatchObject({ dead: true, diseaseId: null, quirkIds: [] });
    expect(next.heroes[0]!.resolveCardId).toBeUndefined();
    expect(next.heroes.slice(1)).toEqual(base.dungeon!.heroes.slice(1));
    expect(next.resolveDecks.affliction).not.toContain(next.heroes[1]!.resolveCardId);
    expect(pool.diseaseDiscard).toEqual(base.dungeon!.conditions!.diseaseDiscard);
    expect(pool.quirkDiscard).toEqual(base.dungeon!.conditions!.quirkDiscard);
    expect(next.gold).toBe(base.dungeon!.gold);
    expect(next.stagecoachXp).toBe(base.dungeon!.stagecoachXp);
    expect(next.waitingHeroTokens).toBe(base.dungeon!.waitingHeroTokens);
    expect(base).toEqual(before);
    expect(release(JSON.parse(JSON.stringify(base)))).toEqual(release(base));
    expect(release(base).state).toEqual(release(base).state);
    const again = release({ ...base, dungeon: next });
    expect(again.state.dungeon).toBe(next);
    expect(again.events).toEqual([]);
  },
);
it("同次两名死者按牌堆合并洗回，存活者不抽怪癖，每个共享实例只出现一次", () => {
  const base = fixture();
  const state = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      heroes: base.dungeon!.heroes.map((h, i) => (i < 2 ? { ...h, dead: true } : h)),
    },
  };
  const next = release(state).state.dungeon!;
  expect(conditionPoolProblem(next.conditions!, next.heroes)).toBeNull();
  expect(next.resolveDecks.affliction).toHaveLength(5);
  expect(new Set(next.resolveDecks.affliction).size).toBe(5);
  expect(next.heroes.every((h) => !h.resolveCardId && !h.diseaseId && !h.quirkIds?.length)).toBe(
    true,
  );
  // 两名死者一起回到同一堆，每个受影响牌堆只洗一次；没有为每个死者重洗。
  const expectedSteps =
    next.conditions!.diseaseDeck!.length -
    1 +
    next.conditions!.negativeDeck!.length -
    1 +
    next.conditions!.positiveDeck!.length -
    1 +
    next.resolveDecks.affliction!.length -
    1;
  expect(next.cursor - state.dungeon.cursor).toBe(expectedSteps);
});
it("战斗内使用实时持牌与Battle游标，同步死者快照；原选择、存活者和饰品去向独立", () => {
  const base = fixture(),
    d = base.dungeon!;
  const battle = createBattleState(base.seed, {
    entities: d.heroes.map((h) => ({
      ...h,
      side: "hero" as const,
      hero: coreQuestSources.catalog.heroStats.find((s) => s.id === h.heroStatId)!.name,
      life: h.life!,
      areaId: "a",
      stance: h.stance!,
      skillIds: h.skillIds!,
      wounds: h.wounds!,
      dodge: 0,
      dead: h.dead ?? false,
      guard: false,
      bleed: [],
      blight: [],
      resolveTested: h.resolveTested ?? false,
      resolveCardId: h.resolveCardId ?? null,
    })),
    skills: coreQuestSources.catalog.skills,
    heroStats: coreQuestSources.catalog.heroStats,
    areas: [{ id: "a", adjacent: [], elevation: "normal", capacity: 4 }],
    light: 5,
  }).battle!;
  const choice = { id: "underlying", prompt: "原待选", options: [{ id: "resume", label: "继续" }] };
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      // Dungeon副本的同一死者仍是旧状态；不可据此漏回收或回收错卡。
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, dead: false, quirkIds: [], diseaseId: null, resolveCardId: undefined },
      ),
    },
    battle: {
      ...battle,
      rngCursor: d.cursor + 7,
      conditions: d.conditions!,
      resolveCards: d.resolveCards,
      resolveDecks: d.resolveDecks,
      trinkets: {
        ...d.trinkets!,
        held: [{ heroId: d.heroes[0]!.id, cardId: d.trinkets!.cards[0]!.id, face: "inverted" }],
      },
      pending: { type: "trinketReward", actorId: "hero-1", choice },
    },
  };
  const result = continueDeathEstates({ state, events: [] }),
    next = result.state;
  expect(result.pendingChoice).toEqual(next.dungeon!.deathTrinketChoice);
  expect(next.battle!.pending).toBe(state.battle!.pending);
  expect(next.battle!.entities[1]).toBe(state.battle!.entities[1]);
  expect(next.battle!.entities[0]).toMatchObject({ dead: true, diseaseId: null, quirkIds: [] });
  expect(next.battle!.entities[0]!.resolveCardId).toBeUndefined();
  expect(next.dungeon!.heroes[0]!.resolveCardId).toBeUndefined();
  expect(next.dungeon!.conditions).toBe(next.battle!.conditions);
  expect(next.dungeon!.resolveDecks).toBe(next.battle!.resolveDecks);
  expect(next.dungeon!.cursor).toBe(d.cursor);
  expect(next.battle!.rngCursor).toBeGreaterThan(state.battle!.rngCursor);
  expect(conditionPoolProblem(next.battle!.conditions!, next.battle!.entities)).toBeNull();
  expect(next.battle!.trinkets).toBe(state.battle!.trinkets);
});
it("公开侦察导致死亡时同条命令已完成回收；饰品待选前即可验证，取消/重复选择不重洗", () => {
  const base = fixture();
  const alive: GameState = {
    ...base,
    dungeon: {
      ...base.dungeon!,
      heroes: base.dungeon!.heroes.map((h, i) => (i ? h : { ...h, dead: false, stress: 9 })),
    },
  };
  const offered = applyCommand(alive, { type: "scoutDungeon" });
  const command: Command = {
    type: "resolveChoice",
    choiceId: offered.pendingChoice!.id,
    optionId: "agree",
  };
  const result = applyCommand(offered.state, command),
    d = result.state.dungeon!;
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(d.heroes[0]).toMatchObject({ dead: true, diseaseId: null, quirkIds: [] });
  expect(d.deadHeroNames).toContain("CRUSADER");
  expect(d.phase).toBe("awaitingReplacement");
  expect(conditionPoolProblem(d.conditions!, d.heroes)).toBeNull();
  expect(applyCommand(offered.state, command)).toEqual(result);
  expect(applyCommand(result.state, command).state).toBe(result.state);
});
it("共享池或意志持牌不守恒时原子拒绝，成功命令的日志也回滚", () => {
  const base = fixture();
  for (const bad of [
    {
      ...base,
      dungeon: {
        ...base.dungeon!,
        resolveDecks: { affliction: [base.dungeon!.heroes[0]!.resolveCardId!] },
      },
    },
    {
      ...base,
      dungeon: {
        ...base.dungeon!,
        heroes: base.dungeon!.heroes.map((h, i) =>
          i === 1 ? { ...h, resolveCardId: base.dungeon!.heroes[0]!.resolveCardId } : h,
        ),
      },
    },
    {
      ...base,
      dungeon: {
        ...base.dungeon!,
        conditions: {
          ...base.dungeon!.conditions!,
          diseaseDiscard: [base.dungeon!.heroes[0]!.diseaseId!],
        },
      },
    },
  ]) {
    const before = structuredClone(bad);
    const result = applyCommand(bad, { type: "ping", message: "不得留下半截日志" });
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(bad);
    expect(bad).toEqual(before);
  }
});
it("没有死者共享持牌时无额外状态或RNG变更；独立战斗沙盒保持原行为", () => {
  const initial = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  expect(release(initial).state).toBe(initial);
  expect(releaseDeadHeroCards({ state: { seed: 4, notes: [] }, events: [] }).events).toEqual([]);
});
it("只回收美德时只洗该堆，苦难牌序和其他牌池原样保留", () => {
  const base = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  const d = base.dungeon!,
    virtues = d.resolveCards.filter((c) => c.role === "virtue").map((c) => c.id),
    afflictions = d.resolveCards.filter((c) => c.role === "affliction").map((c) => c.id);
  const state: GameState = {
    ...base,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, dead: true, resolveCardId: virtues[0]! })),
      resolveDecks: { virtue: virtues.slice(1), affliction: afflictions },
    },
  };
  const next = release(state).state.dungeon!;
  expect(next.resolveDecks.virtue!.slice().sort()).toEqual(virtues.slice().sort());
  expect(next.resolveDecks.affliction).toBe(afflictions);
  expect(next.conditions).toBe(d.conditions);
  expect(next.cursor).toBe(d.cursor + 4);
});
