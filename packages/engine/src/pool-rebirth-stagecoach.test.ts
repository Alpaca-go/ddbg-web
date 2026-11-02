import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { preparePoolRebirthPayment } from "./pool-rebirth-payment";
import { storePoolRebirthInStagecoach } from "./pool-rebirth-stagecoach";
import { stagecoachHoldingsProblem } from "./stagecoach-holdings";
import {
  conditionPoolProblem,
  gainDisease,
  gainNegativeQuirk,
  gainPositiveQuirk,
} from "./conditions";
import {
  drawTrinket,
  trinketOptions,
  trinketPoolProblem,
  switchTrinketDungeonLevel,
} from "./trinket-acquisition";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";
import rawTrinkets from "../../data/normalized/corebox/trinket.json";
import { resolveDungeonPressure } from "./dungeon-pressure";
import { grantGraveyardVirtue } from "./hamlet-graveyard";
import { releaseDeadHeroCards } from "./hero-death-cards";
import { recoverHamletPools } from "./hamlet-return-pools";
import { applyCommand } from "./command";
import { returnPoolRebirthCards } from "./pool-rebirth-card-return";
import { createBattleState } from "./battle";
import { resolveBattlePressure } from "./pressure";
import { naturalQuest } from "./test-helpers/natural-quest";

function fixture() {
  const state = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources),
    d = state.dungeon!;
  const names = d.heroes.map(
    (h) => d.battleCatalog!.heroStats.find((s) => s.id === h.heroStatId)!.name,
  );
  const stat = d.battleCatalog!.heroStats.find(
    (s) => s.level === 1 && s.attributesVerified && !names.includes(s.name),
  )!;
  const hero = {
    ...d.heroes[0]!,
    id: "fallen",
    heroStatId: stat.id,
    life: stat.life,
    dead: true,
    xp: 8,
    wounds: 3,
    stress: 5,
    resolveTested: true,
    resolveCardId: d.resolveCards.find((c) => c.role === "virtue")!.id,
    diseaseId: d.conditions!.diseases[0]!.id,
    quirkIds: (["negative", "positive"] as const).map(
      (p) => d.conditions!.quirks.find((c) => c.polarity === p)!.id,
    ),
    skillIds: d
      .battleCatalog!.skills.filter((s) => s.hero === stat.name && s.level === 1)
      .slice(0, 3)
      .map((s) => s.id),
  };
  const source = {
    ...state,
    dungeon: {
      ...d,
      phase: "ready" as const,
      pending: null,
      fallenHeroes: [
        {
          hero,
          trinkets: [
            { heroId: hero.id, cardId: d.trinkets!.cards[0]!.id, face: "inverted" as const },
          ],
        },
      ],
    },
  };
  const transaction = preparePoolRebirthPayment(source, "fallen");
  if (transaction.status !== "prepared") throw Error(transaction.reason);
  const stored = storePoolRebirthInStagecoach(transaction);
  if (stored.status !== "resolved") throw Error(stored.reason);
  return { source, transaction, d: stored.dungeon };
}

it("完整英雄进入持牌驿站，当前队伍仍四人，不增加代币，已用档案不能再次复活", () => {
  const { source, transaction, d } = fixture(),
    before = structuredClone(transaction);
  const reserve = d.stagecoachHeroes![0]!;
  expect(reserve).toMatchObject({
    ...source.dungeon.fallenHeroes[0]!.hero,
    id: reserve.id,
    dead: false,
  });
  expect(reserve.id).not.toBe(source.dungeon.fallenHeroes[0]!.hero.id);
  expect(d.heroes).toHaveLength(4);
  expect(d.waitingHeroTokens).toBe(source.dungeon.waitingHeroTokens);
  expect(d.fallenHeroes![0]!.revived).toBe(true);
  expect(preparePoolRebirthPayment({ ...source, dungeon: d }, "fallen").status).toBe("refused");
  expect(stagecoachHoldingsProblem(d)).toBeNull();
  expect(conditionPoolProblem(d.conditions!, d.heroes)).toBeNull();
  expect(trinketPoolProblem(d.trinkets!, d.heroes)).toBeNull();
  expect(d.trinkets!.held).toEqual([
    { ...source.dungeon.fallenHeroes[0]!.trinkets[0]!, heroId: reserve.id },
  ]);
  expect(storePoolRebirthInStagecoach(transaction)).toEqual({ status: "resolved", dungeon: d });
  expect(transaction).toEqual(before);
  expect(
    JSON.parse(
      JSON.stringify(storePoolRebirthInStagecoach(JSON.parse(JSON.stringify(transaction)))),
    ),
  ).toEqual(JSON.parse(JSON.stringify({ status: "resolved", dungeon: d })));
});

it("队伍抽疾病、正负怪癖与饰品都排除驿站持牌，驿站身份不是可行动接收者", () => {
  const { d } = fixture(),
    reserve = d.stagecoachHeroes![0]!,
    actor = d.heroes[0]!.id;
  for (let seed = 0; seed < 8; seed++) {
    const disease = gainDisease(d.conditions!, d.heroes, actor, seed, 0);
    expect(disease.status).toBe("resolved");
    if (disease.status === "resolved") expect(disease.diseaseId).not.toBe(reserve.diseaseId);
    for (const gain of [gainNegativeQuirk, gainPositiveQuirk]) {
      const result = gain(d.conditions!, d.heroes, actor, seed, 0);
      expect(result.status).toBe("resolved");
      if (result.status === "resolved") expect(reserve.quirkIds).not.toContain(result.quirkId);
    }
    const trinket = drawTrinket(d.trinkets!, d.heroes, actor, seed, 0);
    expect(trinket.status).toBe("resolved");
    if (trinket.status === "resolved") {
      expect(trinket.pool.incoming.cardId).not.toBe(d.trinkets!.held[0]!.cardId);
      expect(trinket.pool.deck).not.toContain(d.trinkets!.held[0]!.cardId);
      expect(trinketOptions(trinket.pool, d.heroes).some((o) => o.id.includes(reserve.id))).toBe(
        false,
      );
    }
  }
  expect(gainDisease(d.conditions!, d.heroes, reserve.id, 0, 0).status).toBe("refused");
  expect(drawTrinket(d.trinkets!, d.heroes, reserve.id, 0, 0).status).toBe("refused");
});

it("意志检定、墓地美德与死亡回收都保留驿站意志牌", () => {
  const { source, d } = fixture(),
    reserve = d.stagecoachHeroes![0]!;
  const stressed = { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 10 })) };
  const resolved = resolveDungeonPressure({ ...source, dungeon: stressed }, { settleOnly: true });
  expect(resolved.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(resolved.state.dungeon!.heroes[0]!.resolveCardId).not.toBe(reserve.resolveCardId);
  const virtue = grantGraveyardVirtue(d, d.heroes[0]!.id, 1);
  expect(virtue.status).toBe("resolved");
  if (virtue.status !== "resolved") return;
  expect(virtue.dungeon.heroes[0]!.resolveCardId).not.toBe(reserve.resolveCardId);
  const released = releaseDeadHeroCards({
    state: {
      ...source,
      dungeon: {
        ...virtue.dungeon,
        heroes: virtue.dungeon.heroes.map((h, i) => (i ? h : { ...h, dead: true })),
      },
    },
    events: [],
  });
  expect(released.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(Object.values(released.state.dungeon!.resolveDecks).flat()).not.toContain(
    reserve.resolveCardId,
  );
  expect(released.state.dungeon!.stagecoachHeroes).toEqual(d.stagecoachHeroes);
});

it("回村洗回弃牌及升幕饰品牌池切换保留驿站持牌", () => {
  const { d } = fixture(),
    reserve = d.stagecoachHeroes![0]!;
  const c = d.conditions!,
    t = d.trinkets!;
  const input = {
    ...d,
    conditions: {
      ...c,
      diseaseDiscard: [c.diseases.find((c) => c.id !== reserve.diseaseId)!.id],
      quirkDiscard: [c.quirks.find((c) => !reserve.quirkIds!.includes(c.id))!.id],
    },
    trinkets: { ...t, discard: [t.cards.find((c) => c.id !== t.held[0]!.cardId)!.id] },
  };
  const returned = recoverHamletPools(input, 4);
  expect(returned.status).toBe("resolved");
  if (returned.status !== "resolved") return;
  expect(returned.dungeon.conditions!.diseaseDeck).not.toContain(reserve.diseaseId);
  const quirkDecks = [
    ...(returned.dungeon.conditions!.negativeDeck ?? []),
    ...(returned.dungeon.conditions!.positiveDeck ?? []),
  ];
  for (const id of reserve.quirkIds!) expect(quirkDecks).not.toContain(id);
  expect(returned.dungeon.trinkets!.deck).not.toContain(t.held[0]!.cardId);
  const switched = switchTrinketDungeonLevel(
    t,
    normalizedTrinketFileSchema.parse(rawTrinkets).cards,
    2,
  );
  expect("reason" in switched).toBe(false);
  if ("reason" in switched) return;
  expect(switched.reservedHeroes).toEqual(t.reservedHeroes);
  expect(trinketPoolProblem(switched, d.heroes)).toBeNull();
});

it("R-148也能从已在驿站的英雄取回原牌，同步完整记录和持牌投影", () => {
  const { d } = fixture(),
    reserve = d.stagecoachHeroes![0]!;
  const fallen = {
    hero: { ...reserve, id: "older-death", dead: true },
    trinkets: d.trinkets!.held.map((h) => ({ ...h, heroId: "older-death" })),
  };
  const returned = returnPoolRebirthCards(fallen, d.heroes, d);
  expect(returned.status).toBe("resolved");
  if (returned.status !== "resolved") return;
  expect(returned.pools.stagecoachHeroes![0]).toMatchObject({
    diseaseId: null,
    quirkIds: [],
    resolveTested: false,
  });
  expect(returned.pools.stagecoachHeroes![0]!.resolveCardId).toBeUndefined();
  expect(stagecoachHoldingsProblem({ ...returned.pools, heroes: returned.heroes })).toBeNull();
  expect(conditionPoolProblem(returned.pools.conditions!, returned.heroes)).toBeNull();
  expect(trinketPoolProblem(returned.pools.trinkets!, returned.heroes)).toBeNull();
});

it("伪造持牌投影在公开命令前原子拒绝", () => {
  const { source, d } = fixture();
  const state = {
    ...source,
    dungeon: { ...d, conditions: { ...d.conditions!, reservedHeroes: [] } },
  };
  const before = structuredClone(state);
  const result = applyCommand(state, { type: "resolveDungeonPressure" });
  expect(result.events[0]!.type).toBe("commandRefused");
  expect(result.state).toBe(state);
  expect(state).toEqual(before);
});

it("战斗意志初始化也排除驿站意志牌", () => {
  const { source, d } = fixture(),
    reserved = d.stagecoachHeroes![0]!.resolveCardId;
  let virtueSeen = false;
  for (let seed = 0; seed < 16; seed++) {
    const battle = createBattleState(seed, {
      light: 5,
      skills: [],
      resolveCards: d.resolveCards,
      heroStats: d.battleCatalog!.heroStats,
      areas: [{ id: "A", capacity: 4, elevation: "normal", adjacent: [] }],
      entities: [
        {
          id: d.heroes[0]!.id,
          hero: "CRUSADER",
          side: "hero",
          stance: "aggressive",
          areaId: "A",
          skillIds: [],
          guard: false,
          dead: false,
          bleed: [],
          blight: [],
          wounds: 0,
          life: d.heroes[0]!.life!,
          heroStatId: d.heroes[0]!.heroStatId!,
          stress: 10,
          dodge: 0,
        },
      ],
    }).battle!;
    const result = resolveBattlePressure({
      state: { ...source, seed, dungeon: d, battle },
      events: [],
    });
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
    expect(result.state.battle!.entities[0]!.resolveCardId).not.toBe(reserved);
    const deck = result.state.battle!.resolveDecks?.virtue;
    if (deck) {
      virtueSeen = true;
      expect(deck).not.toContain(reserved);
      expect(deck).toHaveLength(3);
    }
  }
  expect(virtueSeen).toBe(true);
});

it("复活当前死者时保留原四人队伍的死亡槽，驿站英雄使用独立身份", () => {
  const { source } = fixture(),
    d = source.dungeon,
    old = d.heroes[0]!;
  const archive = d.fallenHeroes[0]!;
  const fallen = {
    ...archive,
    hero: {
      ...archive.hero,
      id: old.id,
      heroStatId: old.heroStatId!,
      life: old.life!,
      skillIds: old.skillIds!,
    },
    trinkets: archive.trinkets.map((h) => ({ ...h, heroId: old.id })),
  };
  const state = {
    ...source,
    dungeon: {
      ...d,
      fallenHeroes: [fallen],
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, dead: true })),
    },
  };
  const prepared = preparePoolRebirthPayment(state, old.id);
  expect(prepared.status).toBe("prepared");
  if (prepared.status !== "prepared") return;
  const result = storePoolRebirthInStagecoach(prepared);
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") return;
  expect(result.dungeon.heroes).toHaveLength(4);
  expect(result.dungeon.heroes[0]).toEqual(state.dungeon.heroes[0]);
  expect(result.dungeon.stagecoachHeroes![0]!.id).not.toBe(old.id);
  expect(stagecoachHoldingsProblem(result.dungeon)).toBeNull();
});

it("R-151全队付款死亡后仍把目标英雄复活入驿站，不额外扣代币", () => {
  const { source } = fixture(),
    d = source.dungeon;
  const cards = d.resolveCards.filter((c) => c.role === "affliction");
  const state = {
    ...source,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) => ({
        ...h,
        stress: 8,
        resolveTested: true,
        resolveCardId: cards[i]!.id,
      })),
    },
  };
  const prepared = preparePoolRebirthPayment(state, "fallen");
  expect(prepared.status).toBe("prepared");
  if (prepared.status !== "prepared") return;
  const result = storePoolRebirthInStagecoach(prepared);
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") return;
  expect(result.dungeon.heroes.every((h) => h.dead)).toBe(true);
  expect(result.dungeon.stagecoachHeroes![0]!.dead).toBe(false);
  expect(result.dungeon.waitingHeroTokens).toBe(d.waitingHeroTokens);
  expect(result.dungeon.campaignFailure).toBeUndefined();
});

it("自然任务结束态注入驿站后，公开回村只重置队员饰品与意志，不清除驿站持牌", () => {
  const { d } = fixture();
  const completed = naturalQuest(1, "quest:p001").state;
  const current = completed.dungeon!;
  const state = {
    ...completed,
    dungeon: {
      ...current,
      stagecoachHeroes: d.stagecoachHeroes!,
      conditions: d.conditions!,
      trinkets: d.trinkets!,
      resolveDecks: {},
      heroes: current.heroes.map((h) => ({
        ...h,
        diseaseId: null,
        quirkIds: [],
        resolveCardId: undefined,
        resolveTested: false,
        ...(h.combat
          ? {
              combat: {
                ...h.combat,
                diseaseId: null,
                quirkIds: [],
                resolveCardId: null,
                resolveTested: false,
              },
            }
          : {}),
      })),
    },
  };
  const result = applyCommand(state, { type: "beginReturnToHamlet" });
  expect(result.events.find((e) => e.type === "commandRefused")).toBeUndefined();
  expect(result.state.dungeon!.stagecoachHeroes).toEqual(d.stagecoachHeroes);
  expect(result.state.dungeon!.trinkets!.held).toEqual(d.trinkets!.held);
  expect(result.state.dungeon!.stagecoachHeroes![0]!.resolveCardId).toBe(
    d.stagecoachHeroes![0]!.resolveCardId,
  );
  expect(stagecoachHoldingsProblem(result.state.dungeon!)).toBeNull();
});
