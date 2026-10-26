import { describe, expect, it } from "vitest";
import forwardCamps from "../../data/normalized/corebox/forward_camps_distribution.json";
import layout from "../../data/normalized/corebox/dungeon_layout_p001.json";
import scoutDistribution from "../../data/normalized/corebox/scout_ahead_distribution.json";
import { forwardCampsQuestSummarySchema } from "../../data/src/quest-summary";
import { roomDistributionSchema } from "../../data/src/dungeon-layout";
import { applyCommand } from "./command";
import type { GameState } from "./command";
import { canSetupForwardCamp, setupForwardCamp } from "./dungeon-forward-camp";
import { createDungeonSandbox } from "./dungeon";
import { expandRoomDistributionForEmbark } from "./room-distribution-expand";

function forwardCampsReady(position = "G"): GameState {
  const template = roomDistributionSchema.parse(forwardCamps);
  const { distribution } = expandRoomDistributionForEmbark(template, 42, 0);
  const base = createDungeonSandbox(
    42,
    layout,
    distribution,
    "radiant",
    position,
    [
      { id: "hero-0", stress: 0 },
      { id: "hero-1", stress: 0 },
      { id: "hero-2", stress: 0 },
      { id: "hero-3", stress: 0 },
    ],
    [],
    {
      dungeonLevel: 3,
      light: 4,
      provisions: [
        { id: "torch-1", face: "torch" },
        { id: "tool-1", face: "tool" },
        { id: "food-1", face: "food" },
      ],
    },
  );
  const emptyId =
    base.dungeon!.rooms.find((r) => r.kind === "empty")?.id ?? base.dungeon!.rooms[0]!.id;
  return {
    ...base,
    dungeon: {
      ...base.dungeon!,
      position: emptyId,
      phase: "ready",
      rooms: base.dungeon!.rooms.map((r) =>
        r.id === emptyId ? { ...r, revealed: true, cleared: true, kind: "empty" } : r,
      ),
    },
  };
}

const choose = (state: GameState, optionId: string) =>
  applyCommand(state, {
    type: "resolveChoice",
    choiceId: state.dungeon!.pending!.id,
    optionId,
  }).state;

describe("Forward Camps III 设营 SPECIAL（R-113）", () => {
  it("已清理 Empty + Torch/Shovel 可设营；同房多次；消耗补给", () => {
    let state = forwardCampsReady();
    expect(canSetupForwardCamp(state)).toBe(true);
    const roomId = state.dungeon!.position;
    const first = setupForwardCamp(state, { type: "setupForwardCamp", provisionId: "torch-1" });
    expect(first.events[0]).toMatchObject({ type: "dungeonUpdated" });
    state = first.state;
    expect(state.dungeon!.forwardCampSetups).toBe(1);
    expect(state.dungeon!.explorationSetup!.provisions.map((p) => p.id)).toEqual([
      "tool-1",
      "food-1",
    ]);
    expect(state.dungeon!.rooms.find((r) => r.id === roomId)).toMatchObject({
      kind: "empty",
      cleared: true,
    });
    expect(canSetupForwardCamp(state)).toBe(true);
    state = setupForwardCamp(state, {
      type: "setupForwardCamp",
      provisionId: "tool-1",
    }).state;
    expect(state.dungeon!.forwardCampSetups).toBe(2);
    expect(canSetupForwardCamp(state)).toBe(false);
  });

  it("非 p012、未清理 Empty、无 Torch/Tool 或流程停点拒绝设营", () => {
    const state = forwardCampsReady();
    const scout = createDungeonSandbox(1, layout, scoutDistribution, "radiant", "G");
    expect(canSetupForwardCamp(scout)).toBe(false);
    const uncleared = {
      ...state,
      dungeon: {
        ...state.dungeon!,
        rooms: state.dungeon!.rooms.map((r) =>
          r.id === state.dungeon!.position ? { ...r, cleared: false } : r,
        ),
      },
    };
    expect(
      setupForwardCamp(uncleared, { type: "setupForwardCamp", provisionId: "torch-1" }).events[0],
    ).toMatchObject({
      type: "commandRefused",
    });
    const pending = {
      ...state,
      dungeon: { ...state.dungeon!, pending: { id: "x", prompt: "", options: [] } },
    };
    expect(canSetupForwardCamp(pending)).toBe(false);
  });

  it.each([0, 1, 2, 3, 4, 5])("设营 %i 次：摘要 XP min(3,n)，R-038 封顶", (setups) => {
    const provisions = Array.from({ length: setups }, (_, i) => ({
      id: `torch-${i}`,
      face: "torch" as const,
    }));
    let state: GameState = {
      ...forwardCampsReady(),
      dungeon: {
        ...forwardCampsReady().dungeon!,
        forwardCampSetups: setups,
        explorationSetup: {
          dungeonLevel: 3,
          light: 4,
          provisions,
        },
      },
    };
    state = choose(applyCommand(state, { type: "leaveDungeon" }).state, "agree");
    const result = applyCommand(state, { type: "summarizeDungeonQuest" });
    const summary = result.state.dungeon!.questSummary!;
    const xp = Math.min(3, setups);
    expect(summary).toMatchObject({
      questId: "quest:p012",
      forwardCampSetups: setups,
      xpPerHero: xp,
      stagecoachXp: xp,
      awarded: false,
    });
    expect(forwardCampsQuestSummarySchema.safeParse(summary).success).toBe(true);
  });
});
