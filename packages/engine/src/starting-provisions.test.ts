import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, nextProvisionFace } from "./index";
import type { BattleEntity, GameState } from "./index";
function initial(seed: number): GameState {
  const entities: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "TEST",
      heroStatId: "test",
      stance,
      areaId: "a",
      life: 10,
      wounds: 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      skillIds: [],
      bleed: [],
      blight: [],
    }),
  );
  return createBattleState(seed, {
    entities: [
      ...entities,
      {
        id: "m",
        side: "monster",
        hero: null,
        stance: "aggressive",
        stanceSlots: 1,
        areaId: "a",
        life: 10,
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
    skills: [],
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    light: 5,
    startingProvisions: true,
    provisions: [],
  });
}
describe("R12 八颗开局补给", () => {
  it("八骰一次、每英雄两颗；Wild 按对应英雄依次自选，续接不重掷", () => {
    let seed = 0;
    while (
      Array.from({ length: 8 }, (_, cursor) => nextProvisionFace(seed, cursor)).filter(
        (face) => face === "wild",
      ).length < 2
    )
      seed++;
    const fixture = initial(seed);
    let result = applyCommand(fixture, { type: "startBattle" });
    expect(result).toEqual(applyCommand(fixture, { type: "startBattle" }));
    expect(result.events.filter((event) => event.type === "provisionRolled")).toHaveLength(8);
    const expectedActors = Array.from(
      { length: 8 },
      (_, index) => `h${Math.floor(index / 2)}`,
    ).filter((_, cursor) => nextProvisionFace(seed, cursor) === "wild");
    expect(expectedActors.length).toBeGreaterThan(0);
    for (const actorId of expectedActors) {
      expect(result.pendingChoice!.actorId).toBe(actorId);
      expect(result.state.battle!.rngCursor).toBe(8);
      expect(applyCommand(result.state, { type: "startBattle" }).state).toEqual(result.state);
      const prior = result;
      const command = {
        type: "resolveChoice" as const,
        choiceId: prior.pendingChoice!.id,
        optionId: "torch",
      };
      result = applyCommand(prior.state, command);
      expect(result.events).toContainEqual(
        expect.objectContaining({
          type: "provisionSelected",
          actorId,
          face: "torch",
        }),
      );
      expect(result).toEqual(applyCommand(prior.state, command));
      expect(applyCommand(result.state, command).state).toEqual(result.state);
    }
    expect(result.state.battle!.provisions).toHaveLength(8);
    expect(result.state.battle!.rngCursor).toBe(12);
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(applyCommand(result.state, { type: "startBattle" }).state).toEqual(result.state);
  });
  it("缺空池或少英雄拒绝，不掷骰、不补数量", () => {
    const fixture = initial(5);
    const nonempty = {
      ...fixture,
      battle: { ...fixture.battle!, provisions: [{ id: "p", face: "food" as const }] },
    };
    expect(applyCommand(nonempty, { type: "startBattle" }).state).toEqual(nonempty);
    const few = {
      ...fixture,
      battle: {
        ...fixture.battle!,
        entities: fixture.battle!.entities.filter((entity) => entity.id !== "h3"),
      },
    };
    expect(applyCommand(few, { type: "startBattle" }).state).toEqual(few);
  });
});
