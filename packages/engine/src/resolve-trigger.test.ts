import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type { BattleEntity, GameState, ResolveCard, StatusStack } from "./index";
import { nextBattleRoll } from "./encounter";

const cards: ResolveCard[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/virtue_affliction.json", import.meta.url),
    "utf8",
  ),
).cards;
function ready(name: string, roll = 1, stacks: readonly StatusStack[] = []): GameState {
  const card = cards.find((card) => card.name === name)!;
  let seed = 0;
  while (nextBattleRoll(seed, 4) !== roll) seed++;
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "TEST",
      heroStatId: "test",
      heroLevel: 1,
      stance,
      life: 10,
      areaId: "a",
      skillIds: [],
      stress: 3,
      wounds: 5,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      statusStacks: index === 0 ? stacks : [],
      ...(index === 0 ? { resolveTested: true, resolveCardId: card.id } : {}),
    }),
  );
  const initial = createBattleState(seed, {
    entities: [
      ...heroes,
      {
        id: "m",
        side: "monster",
        hero: null,
        stance: "aggressive",
        stanceSlots: 1,
        areaId: "a",
        life: 100,
        wounds: 0,
        dodge: 0,
        guard: false,
        dead: false,
        skillIds: [],
        bleed: [],
        blight: [],
      },
    ],
    heroStats: [{ id: "test", name: "TEST", life: 10, attributesVerified: true }],
    resolveCards: cards,
    provisions: [],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [],
    light: 5,
  });
  const start = applyCommand(initial, { type: "startBattle" });
  expect(start.events[0]?.type).toBe("roundStarted");
  return {
    ...start.state,
    battle: {
      ...start.state.battle!,
      encounter: { ...start.state.battle!.encounter!, deck: ["hero", "monster"] },
    },
  };
}
const draw = (state: GameState) => applyCommand(state, { type: "drawInitiative" });
describe("十张真实意志卡回合开始触发（R18 / R28 / R-056 / R-057）", () => {
  it("十张都用印刷触发与数值；压力上下限、Hero Level 倍率、状态先触发后弹出", () => {
    for (const card of cards) {
      const state = ready(card.name!);
      const result = draw(state);
      expect(
        result.events.some((event) => event.type === "commandRefused"),
        card.name,
      ).toBe(false);
      expect(result.state.battle!.rngCursor).toBe(5);
      expect(result.events.find((event) => event.type === "resolveTriggered")).toMatchObject({
        entityId: "h0",
        cardId: card.id,
        roll: 1,
        triggered: true,
      });
      expect(result).toEqual(draw(state));
      const hero = result.state.battle!.entities[0]!;
      const other = result.state.battle!.entities[1]!;
      if (card.name === "Stalwart") expect(hero.stress).toBe(1);
      if (card.name === "Courageous") expect([hero.stress, other.stress]).toEqual([2, 2]);
      if (card.name === "Focused")
        expect(hero.statusStacks).toEqual([{ kind: "buff", remaining: 1 }]);
      if (card.name === "Powerful") {
        expect(hero.statusStacks).toEqual([{ kind: "buff", remaining: 1 }]);
        expect(other.statusStacks).toEqual([{ kind: "buff", remaining: 2 }]);
      }
      if (card.name === "Vigorous") expect(hero.wounds).toBe(2);
      if (card.name === "Fearful") expect(hero.stress).toBe(5);
      if (card.name === "Masochistic") expect(hero.wounds).toBe(7);
      if (card.name === "Hopeless") expect([hero.stress, other.stress]).toEqual([4, 4]);
    }
    const vigorous = ready("Vigorous");
    const level2 = {
      ...vigorous,
      battle: {
        ...vigorous.battle!,
        entities: vigorous.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, heroLevel: 2, wounds: 8 } : entity,
        ),
      },
    };
    expect(draw(level2).state.battle!.entities[0]!.wounds).toBe(2);
  });
  it("未触发只消耗一骰；Irrational 后移交换姿态不移动区域、尽头无额外效果", () => {
    const hopeless = ready("Hopeless");
    expect(
      draw({ ...hopeless, battle: { ...hopeless.battle!, light: 1 } })
        .state.battle!.entities.slice(0, 4)
        .map((hero) => hero.stress),
    ).toEqual([5, 5, 5, 5]);
    const stalwart = ready("Stalwart");
    expect(
      draw({ ...stalwart, battle: { ...stalwart.battle!, light: 1 } }).state.battle!.entities[0]!
        .stress,
    ).toBe(1);
    const miss = draw(ready("Focused", 6));
    expect(miss.state.battle!.entities[0]!.statusStacks).toEqual([]);
    expect(miss.events.find((event) => event.type === "resolveTriggered")).toMatchObject({
      cardId: cards.find((card) => card.name === "Focused")!.id,
      triggered: false,
      roll: 6,
    });
    const shifted = draw(ready("Irrational", 6));
    expect(
      shifted.state.battle!.entities.slice(0, 2).map((entity) => [entity.stance, entity.areaId]),
    ).toEqual([
      ["defensive", "a"],
      ["aggressive", "a"],
    ]);
    expect(shifted.state.battle!.encounter!.turn).toMatchObject({ actions: 2, actorId: "h0" });
    expect(draw(ready("Irrational", 1)).state.battle!.entities[0]!.stance).toBe("aggressive");
  });
  it("Selfish 选择冻结其他命令，完成选择才弹状态；不重掷、不执行普通补给效果", () => {
    const initial = ready("Selfish", 1, [{ kind: "bleed", amount: 2, remaining: 1 }]);
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        provisions: [
          { id: "food1", face: "food" as const },
          { id: "bandage1", face: "bandage" as const },
        ],
      },
    };
    const waiting = draw(state);
    expect(waiting.pendingChoice?.options).toHaveLength(2);
    expect(waiting.state.battle!.entities[0]!.wounds).toBe(5);
    expect(waiting.state.battle!.rngCursor).toBe(5);
    expect(waiting.events.find((event) => event.type === "resolveTriggered")).toMatchObject({
      cardId: cards.find((card) => card.name === "Selfish")!.id,
      triggered: true,
    });
    expect(draw(waiting.state).state).toBe(waiting.state);
    const choice = {
      type: "resolveChoice" as const,
      choiceId: waiting.pendingChoice!.id,
      optionId: "food1",
    };
    const done = applyCommand(waiting.state, choice);
    expect(done.events).toContainEqual(
      expect.objectContaining({
        type: "provisionConsumed",
        entityId: "h0",
        provisionId: "food1",
        face: "food",
        effect: "discard",
      }),
    );
    expect(done.state.battle!.provisions).toEqual([{ id: "bandage1", face: "bandage" }]);
    expect(done.state.battle!.entities[0]!.wounds).toBe(7);
    expect(done.state.battle!.entities[0]!.statusStacks).toEqual([]);
    expect(done.state.battle!.rngCursor).toBe(5);
    expect(done.events.some((event) => event.type === "resolveTriggered")).toBe(false);
    expect(done).toEqual(applyCommand(waiting.state, choice));
    expect(applyCommand(done.state, choice).state).toBe(done.state);
    expect(draw(ready("Selfish")).pendingChoice).toBeUndefined();
  });
  it("Masochistic 和 Bleed 是两个先后生命效果；心脏病先于状态，不多掷死门", () => {
    const maso = ready("Masochistic", 1, [{ kind: "bleed", amount: 1, remaining: 1 }]);
    const atDoor = {
      ...maso,
      battle: {
        ...maso.battle!,
        entities: maso.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, wounds: 8 } : entity,
        ),
      },
    };
    const wounded = draw(atDoor);
    expect(wounded.events.filter((event) => event.type === "heroHealthResolved")).toHaveLength(2);
    expect(wounded.state.battle!.rngCursor).toBe(6);
    const fearful = ready("Fearful", 1, [{ kind: "bleed", amount: 1, remaining: 1 }]);
    const doomed = {
      ...fearful,
      battle: {
        ...fearful.battle!,
        entities: fearful.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, stress: 9, wounds: 10 } : entity,
        ),
      },
    };
    const dead = draw(doomed);
    expect(dead.events.some((event) => event.type === "heartAttack")).toBe(true);
    expect(dead.events.filter((event) => event.type === "casualtyRemoved")).toHaveLength(1);
    expect(dead.state.battle!.rngCursor).toBe(5);
    expect(dead.state.battle!.encounter!.actedIds).toContain("h0");
  });
  it("缺等级 / duration / 补给池整次拒绝，不消耗先攻或触发骰", () => {
    for (const name of ["Vigorous", "Masochistic", "Focused", "Selfish"]) {
      const state = ready(name);
      const battle = structuredClone(state.battle!);
      if (name === "Focused") {
        const card = battle.resolveCards!.find((card) => card.name === name)!;
        Object.assign(card.verified_turn_start!.effect, { duration: undefined });
      } else if (name === "Selfish") Object.assign(battle, { provisions: undefined });
      else Object.assign(battle.entities[0]!, { heroLevel: undefined });
      const invalid = { ...state, battle };
      const refused = draw(invalid);
      expect(refused.events[0]?.type, name).toBe("commandRefused");
      expect(refused.state).toBe(invalid);
    }
  });
  it("Cornered 在最后行动结束仅一次，低光加一次压力并心脏病；缺压力回滚行动", () => {
    const initial = draw(ready("Stalwart")).state;
    const corner = {
      ...initial,
      battle: {
        ...initial.battle!,
        light: 1,
        areas: [{ id: "a", adjacent: [], elevation: "normal" as const, endTurnStress: 1 as const }],
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, stress: 8 } : entity,
        ),
      },
    };
    const command = {
      type: "changeStance" as const,
      actorId: "h0",
      direction: "backward" as const,
    };
    const first = applyCommand(corner, command);
    expect(first.events.some((event) => event.type === "areaStressResolved")).toBe(false);
    const second = applyCommand(first.state, { ...command, direction: "forward" });
    expect(second.events.filter((event) => event.type === "areaStressResolved")).toHaveLength(1);
    expect(second.events.filter((event) => event.type === "heartAttack")).toHaveLength(1);
    expect(second.state.battle!.rngCursor).toBe(first.state.battle!.rngCursor);
    expect(second.state.battle!.entities[0]!.dead).toBe(true);
    const bad = {
      ...first.state,
      battle: {
        ...first.state.battle!,
        entities: first.state.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, stress: NaN } : entity,
        ),
      },
    };
    expect(applyCommand(bad, { ...command, direction: "forward" }).state).toBe(bad);
  });
});

it("Unholy Aura 阻止 Vigorous 自动治疗，仍掷一次触发骰并完成回合开始（R-067）", () => {
  const initial = ready("Vigorous");
  const state = {
    ...initial,
    battle: {
      ...initial.battle!,
      areas: initial.battle!.areas.map((a) => ({ ...a, healingForbidden: true as const })),
    },
  };
  const result = draw(state);
  expect(result.events.some((e) => e.type === "commandRefused")).toBe(false);
  expect(result.events).toContainEqual(
    expect.objectContaining({ type: "healingPrevented", entityId: "h0" }),
  );
  expect(result.state.battle!.entities[0]!.wounds).toBe(5);
  expect(result.state.battle!.rngCursor).toBe(5);
  expect(result.state.battle!.encounter!.turn).toMatchObject({
    type: "hero",
    actorId: "h0",
    actions: 2,
  });
  expect(draw(state)).toEqual(result);
});
