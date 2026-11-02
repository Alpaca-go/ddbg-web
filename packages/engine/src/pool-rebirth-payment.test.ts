import { expect, it } from "vitest";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { coreParty, coreQuestSources } from "./test-helpers/core-quest";
import { preparePoolRebirthPayment } from "./pool-rebirth-payment";
import { conditionPoolProblem } from "./conditions";
import { trinketPoolProblem } from "./trinket-acquisition";
import type { GameState } from "./command";

function fixture(): GameState {
  const state = createCoreDungeonQuest(4, "quest:p001", "standard", coreParty, coreQuestSources);
  const d = state.dungeon!;
  const names = d.heroes.map(
    (h) => d.battleCatalog!.heroStats.find((s) => s.id === h.heroStatId)!.name,
  );
  const stat = d.battleCatalog!.heroStats.find(
    (s) => s.level === 1 && s.attributesVerified && !names.includes(s.name),
  )!;
  return {
    ...state,
    dungeon: {
      ...d,
      phase: "ready",
      pending: null,
      fallenHeroes: [
        {
          hero: {
            ...d.heroes[0]!,
            id: "fallen",
            heroStatId: stat.id,
            dead: true,
            stress: 5,
            xp: 8,
            wounds: 3,
          },
          trinkets: [],
        },
      ],
    },
  };
}

it("四人各支付一次压力4，无侦察揭示、额外RNG或输入变动；结果仅为暂存事务", () => {
  const state = fixture(),
    before = structuredClone(state);
  const result = preparePoolRebirthPayment(state, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  const party = result.dungeon.heroes.filter((h) => h.id !== result.recipientId);
  expect(party.map((h) => h.stress)).toEqual([4, 4, 4, 4]);
  expect(result.dungeon.heroes.at(-1)).toEqual(state.dungeon!.fallenHeroes![0]!.hero);
  expect(result.dungeon.cursor).toBe(state.dungeon!.cursor);
  expect(result.dungeon.rooms).toEqual(state.dungeon!.rooms);
  expect(result.dungeon.scoutBonus).toBe(state.dungeon!.scoutBonus);
  expect(result.dungeon.waitingHeroTokens).toBe(state.dungeon!.waitingHeroTokens);
  expect(state).toEqual(before);
  expect(preparePoolRebirthPayment(state, "fallen")).toEqual(result);
  expect(
    JSON.parse(
      JSON.stringify(preparePoolRebirthPayment(JSON.parse(JSON.stringify(state)), "fallen")),
    ),
  ).toEqual(JSON.parse(JSON.stringify(result)));
});

it("压力10完成意志检定后才取回原卡，并按R-149清除付款人检定标记", () => {
  let state = fixture();
  const d = state.dungeon!;
  state = {
    ...state,
    dungeon: { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 8 })) },
  };
  const first = preparePoolRebirthPayment(state, "fallen");
  expect(first.status).toBe("prepared");
  if (first.status !== "prepared") return;
  const drawn = first.dungeon.heroes[0]!.resolveCardId!;
  expect(drawn).toBeDefined();
  state = {
    ...state,
    dungeon: {
      ...state.dungeon!,
      fallenHeroes: [
        {
          ...d.fallenHeroes![0]!,
          hero: { ...d.fallenHeroes![0]!.hero, resolveCardId: drawn, resolveTested: true },
        },
      ],
    },
  };
  const result = preparePoolRebirthPayment(state, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  expect(result.events.filter((e) => e.type === "resolveTested")).toHaveLength(1);
  expect(result.paymentDungeon.heroes).toHaveLength(4);
  expect(result.paymentDungeon.heroes[0]).toMatchObject({
    resolveCardId: drawn,
    resolveTested: true,
    stress: 0,
  });
  expect(result.dungeon.heroes[0]).toMatchObject({ stress: 0, resolveTested: false });
  expect(result.dungeon.heroes[0]!.resolveCardId).toBeUndefined();
  expect(result.dungeon.heroes.at(-1)).toMatchObject({ resolveCardId: drawn, resolveTested: true });
  expect(result.dungeon.cursor).toBe(first.dungeon.cursor);
});

it("付款心脏病死亡先保存新档案再回收共享卡，不处置遗产或跳过其余队员付款", () => {
  const input = fixture(),
    d = input.dungeon!;
  const card = d.resolveCards.find((c) => c.role === "affliction")!.id;
  const disease = d.conditions!.diseases[0]!.id;
  const trinket = d.trinkets!.cards[0]!.id;
  const state = {
    ...input,
    dungeon: {
      ...d,
      heroes: d.heroes.map((h, i) =>
        i ? h : { ...h, stress: 8, resolveCardId: card, resolveTested: true, diseaseId: disease },
      ),
      trinkets: {
        ...d.trinkets!,
        held: [{ heroId: d.heroes[0]!.id, cardId: trinket, face: "upright" as const }],
      },
    },
  };
  const result = preparePoolRebirthPayment(state, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  expect(result.events.filter((e) => e.type === "heartAttack")).toHaveLength(1);
  expect(result.dungeon.heroes[0]).toMatchObject({ dead: true, diseaseId: null });
  expect(result.dungeon.heroes.slice(1, 4).map((h) => h.stress)).toEqual([4, 4, 4]);
  expect(
    result.dungeon.fallenHeroes!.find((f) => f.hero.id === d.heroes[0]!.id)!.hero,
  ).toMatchObject({ diseaseId: disease, resolveCardId: card, stress: 10 });
  expect(result.dungeon.trinkets!.held).toEqual(state.dungeon.trinkets.held);
  expect(conditionPoolProblem(result.dungeon.conditions!, result.dungeon.heroes)).toBeNull();
  expect(trinketPoolProblem(result.dungeon.trinkets!, result.dungeon.heroes)).toBeNull();
});

it("坏牌池、无效档案和支付后意志阻塞都不返回半份付款结果", () => {
  const state = fixture(),
    d = state.dungeon!;
  const cases = [
    { ...state, dungeon: { ...d, resolveCards: [] } },
    { ...state, dungeon: { ...d, fallenHeroes: [...d.fallenHeroes!, ...d.fallenHeroes!] } },
    {
      ...state,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 8, resolveTested: true })),
      },
    },
    { ...state, dungeon: { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, stress: 11 })) } },
    { ...state, dungeon: { ...d, trinkets: { ...d.trinkets!, deck: [] } } },
    { ...state, seed: -1 },
  ];
  for (const input of cases) {
    const before = structuredClone(input);
    expect(preparePoolRebirthPayment(input, "fallen").status).toBe("refused");
    expect(input).toEqual(before);
  }
});

it("付款沿用Nervous压力修正，不直接加写压力或清除历史数据", () => {
  const state = fixture(),
    d = state.dungeon!;
  const quirk = d.conditions!.quirks.find((q) => q.name === "Nervous")!.id;
  const input = {
    ...state,
    dungeon: { ...d, heroes: d.heroes.map((h, i) => (i ? h : { ...h, quirkIds: [quirk], xp: 9 })) },
  };
  const result = preparePoolRebirthPayment(input, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  expect(result.dungeon.heroes[0]).toMatchObject({ stress: 5, xp: 9, quirkIds: [quirk] });
});

it("存活者支付，已有死者不付款；低光照追加压力仍沿用被动", () => {
  const input = fixture(),
    d = input.dungeon!;
  const state = {
    ...input,
    dungeon: {
      ...d,
      explorationSetup: { ...d.explorationSetup!, light: 2 },
      heroes: d.heroes.map((h, i) => (i ? h : { ...h, dead: true, stress: 2 })),
    },
  };
  const result = preparePoolRebirthPayment(state, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  expect(result.dungeon.heroes.slice(0, 4).map((h) => h.stress)).toEqual([2, 5, 5, 5]);
});

it("四名付款者都心脏病死亡也完整记录，不自行判战役失败或执行驿站招募", () => {
  const input = fixture(),
    d = input.dungeon!;
  const cards = d.resolveCards.filter((c) => c.role === "affliction");
  const state = {
    ...input,
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
  const result = preparePoolRebirthPayment(state, "fallen");
  expect(result.status).toBe("prepared");
  if (result.status !== "prepared") return;
  expect(result.events.filter((e) => e.type === "heartAttack")).toHaveLength(4);
  expect(result.dungeon.heroes.slice(0, 4).every((h) => h.dead)).toBe(true);
  expect(result.dungeon.fallenHeroes).toHaveLength(5);
  expect(result.dungeon.waitingHeroTokens).toBe(d.waitingHeroTokens);
  expect(result.dungeon.campaignFailure).toBeUndefined();
});
