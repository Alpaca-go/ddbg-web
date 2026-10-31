import { expect, it } from "vitest";
import { applyCommand, type GameState } from "./command";
import { finalPreparationFixture } from "./test-helpers/final-preparation";
import { trinketDeck, trinketPoolProblem, createTrinketPool } from "./trinket-acquisition";
import { restoreTemporarySkillUpgrades } from "./hamlet-embark";
import raw from "../../data/normalized/corebox/trinket.json";
import { normalizedTrinketFileSchema } from "../../data/src/normalize/schema";

/** 四天已完成/已付铁匠计划/游商陈列的明示机制夹具，不表示自然最暗胜利。 */
function fixture(level: 1 | 3 = 1): GameState {
  const base = finalPreparationFixture();
  const prepared = applyCommand(base, { type: "beginFinalPreparation" }).state;
  const d = prepared.dungeon!;
  const pool =
    level === 1 ? createTrinketPool(normalizedTrinketFileSchema.parse(raw).cards, 1) : d.trinkets!;
  const deck = trinketDeck(pool, level)!.deck;
  return {
    ...prepared,
    dungeon: {
      ...d,
      hamlet: { ...d.hamlet!, phase: "preparationComplete", day: 4, remainingDays: 0 },
      heroes: d.heroes.map((h, i) =>
        i
          ? h
          : {
              ...h,
              wounds: 2,
              stress: 3,
              nextQuestProvisionDice: 1,
              nextQuestSkillUpgrades: [
                { originalSkillId: "hero_skill:p001", temporarySkillId: "hero_skill:p003" },
              ],
            },
      ),
      trinkets: { ...pool, display: deck.slice(0, 2), deck: deck.slice(2) },
    },
  };
}
const command = { type: "beginFinalBattleProvisions" } as const;
it.each([1, 3] as const)(
  "等级%d饰品池：装备临时技能、仅洗回未购陈列，保留奖励和伤压历史",
  (level) => {
    const before = fixture(level),
      snapshot = structuredClone(before);
    expect(trinketPoolProblem(before.dungeon!.trinkets!, before.dungeon!.heroes)).toBeNull();
    const result = applyCommand(before, command),
      d = result.state.dungeon!;
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(before).toEqual(snapshot);
    expect(applyCommand(JSON.parse(JSON.stringify(before)), command)).toEqual(result);
    expect(d.heroes[0]).toMatchObject({ wounds: 2, stress: 3, nextQuestProvisionDice: 1 });
    expect(d.heroes[0]!.skillIds).toContain("hero_skill:p003");
    expect(d.heroes[0]!.skillIds).not.toContain("hero_skill:p001");
    expect(restoreTemporarySkillUpgrades(d.heroes)[0]!.skillIds).toContain("hero_skill:p001");
    expect(d.trinkets!.display).toBeUndefined();
    expect(d.trinkets!.held).toEqual(before.dungeon!.trinkets!.held);
    expect(d.trinkets!.discard).toEqual(before.dungeon!.trinkets!.discard);
    expect(d.trinkets!.inactive).toEqual(before.dungeon!.trinkets!.inactive);
    expect(d.trinkets!.deck).toHaveLength(level === 1 ? 14 : 12);
    expect(d.trinkets!.deck).toEqual(
      expect.arrayContaining([...before.dungeon!.trinkets!.display!]),
    );
    expect(d.cursor).toBe(before.dungeon!.cursor + (level === 1 ? 13 : 11));
    expect(trinketPoolProblem(d.trinkets!, d.heroes)).toBeNull();
    expect(d.questSummary).toEqual(before.dungeon!.questSummary);
    expect(d.rooms).toEqual(before.dungeon!.rooms);
    expect(d.gold).toBe(before.dungeon!.gold);
    expect(applyCommand(result.state, command).state).toBe(result.state);
  },
);
it("已买空陈列延用普通出征RNG；没有陈列不洗牌", () => {
  const base = fixture(),
    pool = base.dungeon!.trinkets!;
  const deck = [...pool.deck!, ...pool.display!];
  for (const display of [[], undefined]) {
    const { display: _display, ...rest } = pool;
    void _display;
    const state = {
      ...base,
      dungeon: { ...base.dungeon!, trinkets: { ...rest, deck, ...(display ? { display } : {}) } },
    };
    const result = applyCommand(state, command);
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.dungeon!.cursor).toBe(state.dungeon!.cursor + (display ? 13 : 0));
  }
});
it("坏临时卡、跨职业原卡、重复陈列或待分配饰品均原子拒绝，不消费洗牌RNG", () => {
  const base = fixture(),
    d = base.dungeon!;
  const badStates: GameState[] = [
    {
      ...base,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i
            ? h
            : {
                ...h,
                nextQuestSkillUpgrades: [
                  { originalSkillId: "hero_skill:p001", temporarySkillId: "missing" },
                ],
              },
        ),
      },
    },
    {
      ...base,
      dungeon: {
        ...d,
        heroes: d.heroes.map((h, i) =>
          i ? h : { ...h, skillIds: ["hero_skill:p211", ...h.skillIds!.slice(1)] },
        ),
      },
    },
    {
      ...base,
      dungeon: {
        ...d,
        trinkets: { ...d.trinkets!, display: [d.trinkets!.display![0]!, d.trinkets!.display![0]!] },
      },
    },
    {
      ...base,
      dungeon: {
        ...d,
        trinkets: {
          ...d.trinkets!,
          incoming: { actorId: d.heroes[0]!.id, cardId: d.trinkets!.display![0]! },
        },
      },
    },
  ];
  for (const state of badStates) {
    const snapshot = structuredClone(state);
    const result = applyCommand(state, command);
    expect(result.events[0]!.type).toBe("commandRefused");
    expect(result.state).toBe(state);
    expect(state).toEqual(snapshot);
  }
});
