import { expect, it } from "vitest";
import { applyCommand, createBattleState } from "./index";
import type { BattleEntity, GameState } from "./index";

/** 合成 Small 容量场景，不是待审 Maggot 的 Speed / 技能数据。 */
function setup(actions = 1, blocked = false): GameState {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, i) => ({
      id: `h${i}`,
      side: "hero",
      hero: "fixture",
      heroStatId: "stat",
      life: 12,
      areaId: "a",
      stance,
      skillIds: [],
      wounds: 0,
      stress: 3,
      dodge: 0,
      dead: false,
      guard: false,
      bleed: [],
      blight: [],
    }),
  );
  const small: BattleEntity = {
    id: "small",
    side: "monster",
    hero: null,
    monsterCardId: "small-card",
    life: 5,
    areaId: "b",
    stance: "aggressive",
    stanceSlots: 1,
    skillIds: [],
    wounds: 0,
    dodge: 0,
    dead: false,
    guard: false,
    bleed: [],
    blight: [],
  };
  const s = createBattleState(1, {
    entities: [...heroes, small],
    skills: [],
    light: 5,
    heroStats: [{ id: "stat", name: "fixture", life: 12, speed: 1, attributesVerified: true }],
    monsters: [
      {
        id: "small-card",
        life: 5,
        skills: [],
        verification: { unverified: false },
        type_position_tags: ["Small"],
      },
    ],
    areas: [
      { id: "a", capacity: blocked ? 3 : 4, elevation: "normal", adjacent: ["b"] },
      { id: "b", capacity: 1, elevation: "normal", adjacent: ["a", "c"], endTurnStress: 1 },
      { id: "c", capacity: blocked ? 0 : 1, elevation: "normal", adjacent: ["b"] },
    ],
  });
  return {
    ...s,
    battle: {
      ...s.battle!,
      encounter: {
        round: 1,
        deck: ["monster"],
        actedIds: [],
        turn: { type: "hero", actorId: "h0", actions, usedSkillIds: [] },
      },
    },
  };
}
const move = { type: "moveHero", actorId: "h0", path: ["b"] } as const;
it("英雄最后行动可挤出Small；待选冻结、位置与Cornered只在完成选择后收尾", () => {
  const s = setup(),
    pending = applyCommand(s, move),
    b = pending.state.battle!;
  expect(b.pending?.type).toBe("smallDisplace");
  expect(b.entities.find((e) => e.id === "small")!.areaId).toBe("b");
  expect(b.entities.find((e) => e.id === "h0")!.stress).toBe(3);
  expect(applyCommand(pending.state, { type: "drawInitiative" }).state).toBe(pending.state);
  const choice = b.pending!.choice;
  const command = { type: "resolveChoice", choiceId: choice.id, optionId: "small->c" } as const;
  const result = applyCommand(pending.state, command);
  expect(result.state.battle!.entities.find((e) => e.id === "small")!.areaId).toBe("c");
  expect(result.state.battle!.entities.find((e) => e.id === "h0")!.stress).toBe(4);
  expect(result.events.map((e) => e.type)).toEqual([
    "heroMoved",
    "smallMonsterDisplaced",
    "areaStressResolved",
    "turnEnded",
  ]);
  expect(result.state.battle!.rngCursor).toBe(s.battle!.rngCursor);
  expect(result).toEqual(applyCommand(pending.state, command));
  expect(applyCommand(result.state, command).state).toBe(result.state);
});
it("Small满员落点第一行动后可换姿态，结束回合才挤出；无去处原子拒绝", () => {
  const moved = applyCommand(setup(2), move).state;
  expect(moved.battle!.encounter!.turn).toMatchObject({ actions: 1, mustMove: false });
  expect(
    applyCommand(moved, { type: "changeStance", actorId: "h0", direction: "backward" }).state
      .battle!.pending?.type,
  ).toBe("smallDisplace");
  const bad = setup(1, true);
  expect(applyCommand(bad, move).state).toBe(bad);
});
