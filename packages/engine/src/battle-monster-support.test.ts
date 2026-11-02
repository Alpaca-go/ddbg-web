import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { applyCommand, type Command, type GameState } from "./command";
import type { MonsterCardView } from "./monster-skill";
import { trinketBattle } from "./test-helpers/trinket-battle";

const cards: MonsterCardView[] = JSON.parse(
  readFileSync(
    new URL("../../data/normalized/corebox/monster_medium.json", import.meta.url),
    "utf8",
  ),
).cards;

// 明确逻辑测试夹具；不把这些姿态表或几何写入生产目录（R-048）。
function ready(id: string, slot: number): GameState {
  const base = trinketBattle([]).state;
  const card = cards.find((c) => c.id === id)!;
  return {
    ...base,
    battle: {
      ...base.battle!,
      monsters: [
        {
          ...card,
          stanceGroups: [
            { stances: ["aggressive", "defensive", "ranged", "support"], skill: slot },
          ],
        },
      ],
      areas: [
        { id: "a", adjacent: ["b", "c"], elevation: "normal", capacity: 8 },
        { id: "b", adjacent: ["a", "d", "e"], elevation: "normal", capacity: 8 },
        { id: "c", adjacent: ["a"], elevation: "normal", capacity: 8 },
        { id: "d", adjacent: ["b"], elevation: "normal", capacity: 8 },
        { id: "e", adjacent: ["b"], elevation: "normal", capacity: 8 },
      ],
      entities: base.battle!.entities.map((e) =>
        e.side === "hero"
          ? e
          : {
              ...e,
              monsterCardId: id,
              life: card.life,
              areaId: id === "monster_medium:p086" && e.id === "m2" ? "c" : "a",
              stance: e.id === "m" ? "ranged" : "aggressive",
              wounds: e.id === "m" ? 0 : 12,
            },
      ),
      encounter: {
        round: 1,
        deck: ["hero"],
        actedIds: [],
        turn: { type: "monster", actorId: "m" },
      },
    },
  };
}
function ok(state: GameState, command: Command) {
  const result = applyCommand(state, command);
  expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
  return result;
}
it.each([
  ["monster_medium:p069", 2, 3, 0],
  ["monster_medium:p086", 1, 12, 1],
] as const)("%s slot %i 从 AI 目标到实际友方效果，不消费攻击骰", (id, slot, wounds, buffs) => {
  const state = ready(id, slot),
    before = structuredClone(state);
  const selected = ok(state, { type: "prepareMonsterAction", actorId: "m" });
  expect(selected.state.battle!.monsterAction!.targetId).toBe("m2");
  const positioned = ok(selected.state, { type: "moveMonsterToRange", actorId: "m" });
  const result = ok(positioned.state, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "m2",
    skillSlot: slot,
  });
  const target = result.state.battle!.entities.find((e) => e.id === "m2")!;
  expect(target.wounds).toBe(wounds);
  expect(target.statusStacks?.length ?? 0).toBe(buffs);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
  expect(state).toEqual(before);
});
it("自身 Push 分岔前不治疗；JSON 续接后治疗一次并结束回合", () => {
  const state = ready("monster_medium:p086", 2);
  const opened = ok(state, {
    type: "playMonsterSkill",
    actorId: "m",
    targetId: "m2",
    skillSlot: 2,
  });
  expect(opened.pendingChoice).toBeDefined();
  expect(opened.state.battle!.entities.find((e) => e.id === "m2")!.wounds).toBe(12);
  let result = opened;
  while (result.pendingChoice)
    result = ok(JSON.parse(JSON.stringify(result.state)), {
      type: "resolveChoice",
      choiceId: result.pendingChoice.id,
      optionId: result.pendingChoice.options[0]!.id,
    });
  expect(result.state.battle!.entities.find((e) => e.id === "m2")!.wounds).toBe(0);
  expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  expect(result.state.battle!.shuffleContinuation).toBeNull();
  expect(result.state.battle!.encounter!.turn.type).not.toBe("monster");
});

it("错误阵营、射程与效果签名漂移均原子拒绝，不开放生产姿态表", () => {
  const state = ready("monster_medium:p086", 1);
  const command = { type: "playMonsterSkill", actorId: "m", targetId: "m2", skillSlot: 1 } as const;
  const sameArea: GameState = {
    ...state,
    battle: {
      ...state.battle!,
      entities: state.battle!.entities.map((e) => ({ ...e, areaId: "a" })),
    },
  };
  const drifted = structuredClone(state);
  Object.assign(drifted.battle!.monsters![0]!.skills[0]!.verified_monster_effects!, {
    signatures: ["bad"],
  });
  for (const [game, cmd] of [
    [state, { ...command, targetId: "h0" }],
    [sameArea, command],
    [drifted, command],
  ] as const) {
    const before = structuredClone(game);
    const result = applyCommand(game, cmd);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toEqual(before);
    expect(game).toEqual(before);
  }
  const card = cards.find((c) => c.id === "monster_medium:p086")!;
  expect(card.stanceGroups).toBeUndefined();
  expect(card.speed).toBeUndefined();
});
