import { describe, expect, it } from "vitest";
import { buildWealdCroneCatalog } from "./crone-catalog";
import { resolveMonsterSkill, readMonsterAttackView } from "../../monster-skill";
import { selectMonsterSkill } from "../../monster-stance";
import { applyCommand } from "../../command";
import { createBattleState, type BattleEntity } from "../../battle";

const card = buildWealdCroneCatalog();
const combat = (distance = 0) => ({
  actor: { id: "m", wounds: 0 },
  target: { id: "h", side: "hero" as const, wounds: 0, dodge: 0, stress: 0 },
  areaDistance: distance,
});

describe("R-253 Crone 任务例外战斗", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [8, 2],
    [9, 3],
    [10, 3],
  ])("A/D d10 %i → %i", (roll, slot) => {
    for (const stance of ["aggressive", "defensive"] as const)
      expect(selectMonsterSkill(card, [stance], roll)).toMatchObject({ skillSlot: slot });
  });
  it.each([
    [1, 1],
    [5, 1],
    [6, 3],
    [10, 3],
  ])("R/S d10 %i → %i", (roll, slot) => {
    for (const stance of ["ranged", "support"] as const)
      expect(selectMonsterSkill(card, [stance], roll)).toMatchObject({ skillSlot: slot });
  });
  it("诅咒命中给标记与减益；落空不施加", () => {
    const result = resolveMonsterSkill(card, 1, combat(2), 9);
    expect(result).toMatchObject({
      status: "resolved",
      resolution: {
        damageDealt: 2,
        targetStatusEffects: [
          expect.objectContaining({ kind: "mark", duration: 2 }),
          expect.objectContaining({ kind: "debuff", duration: 2 }),
        ],
      },
    });
    expect(resolveMonsterSkill(card, 1, combat(2), 10)).toMatchObject({
      status: "resolved",
      resolution: { outcome: "miss", targetStatusEffects: [] },
    });
  });
  it("香炉射程 0、暴击 6、腐蚀 3/2t、压力与疾病完整接入", () => {
    expect(resolveMonsterSkill(card, 2, combat(), 1)).toMatchObject({
      status: "resolved",
      resolution: {
        damageDealt: 6,
        targetStatusEffects: [expect.objectContaining({ kind: "blight", amount: 3, duration: 2 })],
        targetDisease: true,
      },
    });
    expect(resolveMonsterSkill(card, 2, combat(1), 1).status).toBe("refused");
  });
  it("无 Acc 技能：两英雄各加压力、整次光照只减 1，不消费攻击骰", () => {
    const entity = (id: string, monster: boolean): BattleEntity => ({
      id,
      side: monster ? "monster" : "hero",
      hero: monster ? null : "CRUSADER",
      areaId: monster ? "A" : "C",
      stance: monster ? "support" : id === "h1" ? "aggressive" : "defensive",
      ...(monster ? { monsterCardId: card.id, life: 12, stanceSlots: 1 } : { stress: 0 }),
      wounds: 0,
      dodge: 0,
      dead: false,
      guard: false,
      bleed: [],
      blight: [],
      skillIds: [],
    });
    const state = createBattleState(42, {
      monsters: [card],
      skills: [],
      light: 5,
      areas: [
        { id: "A", capacity: 8, elevation: "normal", adjacent: ["B"] },
        { id: "B", capacity: 8, elevation: "normal", adjacent: ["A", "C"] },
        { id: "C", capacity: 8, elevation: "normal", adjacent: ["B"] },
      ],
      entities: [entity("m", true), entity("h1", false), entity("h2", false)],
    });
    const result = applyCommand(state, {
      type: "playMonsterSkill",
      actorId: "m",
      targetId: "h1",
      skillSlot: 3,
    });
    expect(result.events.filter((e) => e.type === "commandRefused")).toEqual([]);
    expect(result.state.battle!.light).toBe(4);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(
      result.state.battle!.entities.filter((e) => e.side === "hero").map((e) => e.stress),
    ).toEqual([1, 1]);
    const attack = readMonsterAttackView(card, 3);
    expect(attack.status === "ready" && attack.view.printed_labels).toEqual([]);
    expect(
      applyCommand(state, { type: "playMonsterSkill", actorId: "m", targetId: "h1", skillSlot: 3 })
        .state,
    ).toEqual(result.state);
  });
});
