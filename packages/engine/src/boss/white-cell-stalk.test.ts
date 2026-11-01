import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createBattleState, type BattleEntity } from "../battle";
import { applyCommand } from "../command";
import { finishTurn } from "../encounter";
import type { MonsterCardView } from "../monster-skill";

const cards: MonsterCardView[] = ["medium", "large"].flatMap(
  (kind) =>
    JSON.parse(
      readFileSync(
        new URL(`../../../data/normalized/corebox/monster_${kind}.json`, import.meta.url),
        "utf8",
      ),
    ).cards,
);

function setup(wounds = 20) {
  const entity = (id: string, monsterCardId: string, areaId: string): BattleEntity => ({
    id,
    monsterCardId,
    areaId,
    life: cards.find((c) => c.id === monsterCardId)!.life,
    side: "monster",
    dodge: 0,
    hero: null,
    wounds: id === "cyst" ? wounds : 3,
    skillIds: [],
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
  });
  const state = createBattleState(7, {
    entities: [
      entity("stalk", "monster_medium:p104", "A"),
      entity("cyst", "monster_large:p016", "B"),
    ],
    monsters: cards,
    areas: [
      { id: "A", elevation: "normal", capacity: 4, adjacent: ["B"] },
      { id: "B", elevation: "normal", capacity: 4, adjacent: ["A"] },
      { id: "C", elevation: "normal", capacity: 4, adjacent: [] },
    ],
    light: 4,
    skills: [],
    heroStats: [],
  });
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: {
        round: 1,
        deck: [],
        actedIds: [],
        turn: { type: "monster" as const, actorId: "stalk" },
      },
    },
  };
}
const command = {
  type: "playMonsterSkill" as const,
  actorId: "stalk",
  targetId: "cyst",
  skillSlot: 1,
};

it("Reconstitute 治疗指定 Cyst 14、Buff 2t；不耗攻击骰并结束回合，可重现且不修改输入", () => {
  const state = setup();
  const before = structuredClone(state);
  const result = applyCommand(state, command);
  expect(
    result.events.some((e) => e.type === "commandRefused"),
    JSON.stringify(result.events),
  ).toBe(false);
  expect(result.state.battle!.entities.find((e) => e.id === "cyst")).toMatchObject({
    wounds: 6,
    statusStacks: [{ kind: "buff", remaining: 2 }],
  });
  expect(result.state.battle!.entities.find((e) => e.id === "stalk")!.wounds).toBe(3);
  expect(result.state.battle!.rngCursor).toBe(
    finishTurn(state, "stalk", []).state.battle!.rngCursor,
  );
  expect(result.state.battle!.encounter).toEqual(
    finishTurn(state, "stalk", []).state.battle!.encounter,
  );
  expect(applyCommand(state, command)).toEqual(result);
  expect(state).toEqual(before);
});

it("治疗不产生负伤口", () => {
  expect(
    applyCommand(setup(3), command).state.battle!.entities.find((e) => e.id === "cyst")!.wounds,
  ).toBe(0);
});

it("错误目标、死亡目标、无通路、错误回合、已保存选招冲突均原子拒绝", () => {
  const base = setup();
  const cases = [
    {
      ...base,
      battle: {
        ...base.battle,
        entities: base.battle.entities.map((e) =>
          e.id === "cyst" ? { ...e, monsterCardId: "monster_medium:p104" } : e,
        ),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle,
        entities: base.battle.entities.map((e) => (e.id === "cyst" ? { ...e, dead: true } : e)),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle,
        entities: base.battle.entities.map((e) => (e.id === "cyst" ? { ...e, areaId: "C" } : e)),
      },
    },
    {
      ...base,
      battle: {
        ...base.battle,
        encounter: {
          ...base.battle.encounter,
          turn: { type: "monster" as const, actorId: "cyst" },
        },
      },
    },
    {
      ...base,
      battle: {
        ...base.battle,
        monsterAction: { actorId: "stalk", targetId: "cyst", skillSlot: 2, selectionRoll: null },
      },
    },
  ];
  for (const state of cases) {
    const result = applyCommand(state, command);
    expect(result.events.some((e) => e.type === "commandRefused")).toBe(true);
    expect(result.state).toBe(state);
  }
});
