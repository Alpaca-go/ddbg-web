import { describe, expect, it } from "vitest";
import { applyCommand, createBattleState, createLootState } from "./index";
import type { BattleEntity, GameState, StatusStack } from "./index";
import type { ProvisionFace } from "./loot";
function ready(face: ProvisionFace, stacks: readonly StatusStack[] = []): GameState {
  const heroes: BattleEntity[] = (["aggressive", "defensive", "ranged", "support"] as const).map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "TEST",
      heroStatId: "test",
      stance,
      areaId: "a",
      life: 10,
      wounds: index === 0 ? 10 : 0,
      stress: 3,
      dodge: 0,
      guard: false,
      dead: false,
      skillIds: [],
      bleed: [],
      blight: [],
      ...(index === 0 ? { statusStacks: stacks } : {}),
    }),
  );
  const initial = createBattleState(1, {
    entities: [
      ...heroes,
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
    areas: [{ id: "a", adjacent: [], elevation: "normal" }],
    skills: [],
    light: 4,
    provisions: [{ id: "p", face }],
    provisionWindows: true,
  });
  const state = applyCommand(initial, { type: "startBattle" }).state;
  return {
    ...state,
    battle: {
      ...state.battle!,
      encounter: { ...state.battle!.encounter!, deck: ["hero", "monster"] },
    },
  };
}
const use = (
  state: GameState,
  effect: "heal" | "clearBleed" | "clearBlight" | "reduceStress" | "raiseLight",
) => applyCommand(state, { type: "useProvision", provisionId: "p", targetId: "h0", effect });
describe("R12 / R-027 免费补给窗口", () => {
  it("治疗离开死门不掷骰、减压不额外低光修正、光照封顶；不消耗行动", () => {
    for (const [face, effect] of [
      ["food", "heal"],
      ["bandage", "heal"],
      ["potion", "reduceStress"],
      ["torch", "raiseLight"],
    ] as const) {
      const state = ready(face);
      const result = use(state, effect);
      expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
      expect(result.state.battle!.provisions).toEqual([]);
      expect(result.state.battle!.encounter).toEqual(state.battle!.encounter);
      expect(result).toEqual(use(state, effect));
      if (effect === "heal") expect(result.state.battle!.entities[0]!.wounds).toBe(9);
      if (effect === "reduceStress") expect(result.state.battle!.entities[0]!.stress).toBe(2);
      if (effect === "raiseLight") expect(result.state.battle!.light).toBe(5);
      expect(use(result.state, effect).state).toEqual(result.state);
    }
  });
  it("回合开始前清除全部流血堆，再续接状态一次；不补剩余 duration", () => {
    const state = ready("bandage", [
      { kind: "bleed", remaining: 1, amount: 1 },
      { kind: "bleed", remaining: 2, amount: 2 },
      { kind: "buff", remaining: 2 },
    ]);
    const window = applyCommand(state, { type: "drawInitiative" });
    expect(window.state.battle!.entities[0]!.statusStacks).toHaveLength(3);
    expect(window.state.battle!.pending?.type).toBe("turnStartProvision");
    expect(
      applyCommand(window.state, { type: "changeStance", actorId: "h0", direction: "forward" })
        .state,
    ).toEqual(window.state);
    const cleared = use(window.state, "clearBleed");
    expect(cleared.state.battle!.pending).toEqual(window.state.battle!.pending);
    const continued = applyCommand(cleared.state, {
      type: "resolveChoice",
      choiceId: cleared.pendingChoice!.id,
      optionId: "continue",
    });
    expect(continued.state.battle!.entities[0]!.statusStacks).toEqual([
      { kind: "buff", remaining: 1 },
    ]);
    expect(continued.state.battle!.entities[0]!.wounds).toBe(10);
    expect(continued.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
    expect(continued.state.battle!.encounter!.turn).toMatchObject({ actions: 2 });
    const blight = use(
      ready("potion", [{ kind: "blight", remaining: 3, amount: 2 }]),
      "clearBlight",
    );
    expect(blight.state.battle!.entities[0]!.statusStacks).toEqual([]);
  });
  it("怪物定位前、宝箱待选、工具与已死英雄拒绝；定位后允许免费使用", () => {
    const initial = ready("food");
    const monster = {
      ...initial,
      battle: {
        ...initial.battle!,
        encounter: {
          ...initial.battle!.encounter!,
          turn: { type: "monster" as const, actorId: "m" },
        },
      },
    };
    expect(use(monster, "heal").state).toEqual(monster);
    const positioned = {
      ...monster,
      battle: {
        ...monster.battle!,
        monsterAction: {
          actorId: "m",
          skillSlot: 1,
          targetId: "h0",
          selectionRoll: null,
          positioned: true as const,
        },
      },
    };
    expect(use(positioned, "heal").state.battle!.provisions).toHaveLength(0);
    const tool = ready("tool");
    expect(use(tool, "heal").state).toEqual(tool);
    const dead = {
      ...initial,
      battle: {
        ...initial.battle!,
        entities: initial.battle!.entities.map((entity) =>
          entity.id === "h0" ? { ...entity, dead: true } : entity,
        ),
      },
    };
    expect(use(dead, "heal").state).toEqual(dead);
  });
  it("满池先免费消耗，再拾取纯补给，不多扣行动（R-059）", () => {
    const initial = ready("food");
    const pool = createLootState();
    const token = pool.available.find((token) => token.kind === "chooseProvision")!;
    const state = {
      ...initial,
      battle: {
        ...initial.battle!,
        provisions: Array.from({ length: 16 }, (_, index) => ({
          id: index === 0 ? "p" : `p${index}`,
          face: "food" as const,
        })),
        loot: {
          ...pool,
          available: pool.available.filter((entry) => entry.id !== token.id),
          placed: [{ ...token, areaId: "a", revealed: false }],
        },
        encounter: {
          ...initial.battle!.encounter!,
          turn: { type: "hero" as const, actorId: "h0", actions: 2, usedSkillIds: [] },
        },
      },
    };
    const cleared = use(state, "heal");
    const choice = applyCommand(cleared.state, { type: "interactLoot", actorId: "h0" });
    const frozen = applyCommand(choice.state, {
      type: "useProvision",
      provisionId: "p1",
      targetId: "h0",
      effect: "heal",
    });
    expect(frozen.state).toEqual(choice.state);
    const picked = applyCommand(choice.state, {
      type: "resolveChoice",
      choiceId: choice.pendingChoice!.id,
      optionId: "food",
    });
    expect(picked.state.battle!.provisions).toHaveLength(16);
    expect(picked.state.battle!.encounter!.turn).toMatchObject({ actions: 1 });
  });
});
