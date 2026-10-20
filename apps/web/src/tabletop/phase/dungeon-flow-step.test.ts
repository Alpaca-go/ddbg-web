import { describe, expect, it } from "vitest";
import type { GameState } from "@ddbg/engine";
import { dungeonFlowStep } from "./dungeon-flow-step";
import { resolveFlowPhase } from "./flow-phase";

function gameWithDungeon(
  dungeon: Record<string, unknown>,
  extra: Partial<GameState> = {},
): GameState {
  return {
    seed: 1,
    dungeon: { rooms: [], position: "S", ...dungeon } as unknown as GameState["dungeon"],
    ...extra,
  } as GameState;
}

describe("resolveFlowPhase", () => {
  it("正式开局前为建队", () => {
    expect(
      resolveFlowPhase({ questSetupActive: true, game: gameWithDungeon({ phase: "ready" }) }),
    ).toBe("questSetup");
  });

  it("开局补给阶段为出征准备", () => {
    const game = gameWithDungeon({ phase: "awaitingProvisions", startingProvisionChoices: [] });
    expect(resolveFlowPhase({ game })).toBe("expeditionPrep");
    expect(dungeonFlowStep(game)).toContain("开局补给");
  });

  it("导航就绪为地牢探索", () => {
    const game = gameWithDungeon({ phase: "ready" });
    expect(resolveFlowPhase({ game })).toBe("dungeonExploration");
  });

  it("phase exited 对应回村结算", () => {
    const game = gameWithDungeon({ phase: "exited", position: "D" });
    expect(resolveFlowPhase({ game })).toBe("questReturn");
    expect(dungeonFlowStep(game)).toContain("离开地牢");
  });

  it("村庄子状态为村庄", () => {
    const game = gameWithDungeon({
      phase: "ready",
      hamlet: {
        phase: "heroActions",
        day: 1,
        preparationDays: 3,
        deck: [],
        permanentlyRemoved: [],
      },
    });
    expect(resolveFlowPhase({ game })).toBe("hamlet");
    expect(dungeonFlowStep(game)).toContain("村庄");
  });

  it("战斗中为战斗", () => {
    const game = {
      ...gameWithDungeon({ phase: "ready" }),
      battle: { cursor: 0, entities: [], shuffleIntents: [] },
    } as unknown as GameState;
    expect(resolveFlowPhase({ game })).toBe("battle");
  });
});

describe("dungeonFlowStep", () => {
  it("走廊探索停点文案", () => {
    const game = gameWithDungeon({
      phase: "awaitingHazards",
      position: "S",
      visited: ["S"],
      exploration: { from: "S", to: "D", dicePerHero: 2, rolls: [] },
    });
    expect(dungeonFlowStep(game)).toContain("等待危险结算");
  });

  it("awaitingRoom 与 trap 房间", () => {
    const game = gameWithDungeon({
      phase: "awaitingRoom",
      position: "D",
      rooms: [{ id: "D", kind: "trap", revealed: true, cleared: false }],
    });
    expect(dungeonFlowStep(game)).toContain("Trap 分配");
  });
});
