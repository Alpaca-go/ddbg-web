import { describe, expect, it } from "vitest";
import {
  addStatusStack,
  applyCommand,
  createBattleState,
  statusProjection,
  tickStatusStacks,
} from "./index";
import type { BattleEntity, GameState, StatusStack } from "./index";

const defenses = { resistances: [], immunities: [] };
function ready(
  side: "hero" | "monster",
  stacks: readonly StatusStack[],
  wounds = 0,
  life = 10,
): GameState {
  const entities: BattleEntity[] = ["aggressive", "defensive", "ranged", "support"].map(
    (stance, index) => ({
      id: `h${index}`,
      side: "hero",
      hero: "TEST",
      heroStatId: "test-stat",
      life,
      stance: stance as NonNullable<BattleEntity["stance"]>,
      areaId: "a",
      skillIds: [],
      wounds: side === "hero" && index === 0 ? wounds : 0,
      stress: 0,
      dodge: 0,
      guard: false,
      dead: false,
      bleed: [],
      blight: [],
      ...(side === "hero" && index === 0 ? { statusStacks: stacks } : {}),
    }),
  );
  entities.push({
    id: "m0",
    side: "monster",
    hero: null,
    life,
    stance: "aggressive",
    stanceSlots: 1,
    areaId: "a",
    skillIds: [],
    wounds: side === "monster" ? wounds : 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...(side === "monster" ? { statusStacks: stacks } : {}),
  });
  const setup = createBattleState(0, {
    entities,
    heroStats: [{ id: "test-stat", name: "TEST", life, attributesVerified: true }],
    areas: [{ id: "a", elevation: "normal", adjacent: [] }],
    skills: [],
    light: 5,
  });
  const started = applyCommand(setup, { type: "startBattle" });
  expect(started.events[0]?.type).toBe("roundStarted");
  return {
    ...started.state,
    battle: {
      ...started.state.battle!,
      encounter: {
        ...started.state.battle!.encounter!,
        deck: [side, "hero", "hero", "hero"],
        turn: { type: "awaitingInitiative" },
      },
    },
  };
}

describe("状态堆与回合开始（官方 R20–21，R-018 / R-033）", () => {
  it("G-03：Highwayman Buff 2t + Single Bleed 1t，再中 Double Bleed 2t", () => {
    const original: StatusStack[] = [
      { kind: "buff", remaining: 2 },
      { kind: "bleed", remaining: 1, amount: 1 },
    ];
    const applied = addStatusStack(
      original,
      { kind: "bleed", duration: 2, amount: 2 },
      "target",
      defenses,
    );
    expect(applied.status).toBe("resolved");
    if (applied.status !== "resolved") throw new Error(applied.reason);
    const first = tickStatusStacks(applied.stacks);
    expect(first).toEqual({
      status: "resolved",
      stacks: [
        { kind: "buff", remaining: 1 },
        { kind: "bleed", remaining: 1, amount: 2 },
      ],
      woundAmounts: [1, 2],
      stunned: false,
    });
    if (first.status !== "resolved") throw new Error(first.reason);
    expect(statusProjection(first.stacks).buffStacks).toBe(1);
    expect(tickStatusStacks(first.stacks)).toEqual({
      status: "resolved",
      stacks: [],
      woundAmounts: [2],
      stunned: false,
    });
    expect(original).toEqual([
      { kind: "buff", remaining: 2 },
      { kind: "bleed", remaining: 1, amount: 1 },
    ]);
  });

  it("抗性只减 Nt、免疫完全阻挡，自身忽略两者；每次另起一堆", () => {
    const protectedTarget = { resistances: ["bleed" as const], immunities: ["stun" as const] };
    expect(
      addStatusStack([], { kind: "bleed", duration: 2, amount: 3 }, "target", protectedTarget),
    ).toEqual({ status: "resolved", stacks: [{ kind: "bleed", remaining: 1, amount: 3 }] });
    expect(
      addStatusStack([], { kind: "bleed", duration: 1, amount: 3 }, "target", protectedTarget),
    ).toEqual({ status: "resolved", stacks: [] });
    expect(addStatusStack([], { kind: "stun", duration: 2 }, "target", protectedTarget)).toEqual({
      status: "resolved",
      stacks: [],
    });
    expect(addStatusStack([], { kind: "stun", duration: 2 }, "self", protectedTarget)).toEqual({
      status: "resolved",
      stacks: [{ kind: "stun", remaining: 2 }],
    });
    expect(
      addStatusStack(
        [{ kind: "buff", remaining: 1 }],
        { kind: "buff", duration: 3 },
        "self",
        defenses,
      ),
    ).toEqual({
      status: "resolved",
      stacks: [
        { kind: "buff", remaining: 1 },
        { kind: "buff", remaining: 3 },
      ],
    });
  });

  it("所有持续状态按堆投影，最后一枚弹出即失效，内置 Protection 保留", () => {
    const stacks: StatusStack[] = [
      "buff",
      "debuff",
      "mark",
      "guard",
      "riposte",
      "protection",
    ].flatMap((kind) => [
      { kind: kind as StatusStack["kind"], remaining: 1 },
      { kind: kind as StatusStack["kind"], remaining: 2 },
    ]);
    expect(statusProjection(stacks)).toMatchObject({
      buffStacks: 2,
      debuffStacks: 2,
      markStacks: 2,
      guard: true,
      riposte: true,
      protection: true,
    });
    const first = tickStatusStacks(stacks);
    if (first.status !== "resolved") throw new Error(first.reason);
    expect(statusProjection(first.stacks)).toMatchObject({
      buffStacks: 1,
      debuffStacks: 1,
      markStacks: 1,
    });
    const second = tickStatusStacks(first.stacks);
    if (second.status !== "resolved") throw new Error(second.reason);
    expect(statusProjection(second.stacks)).toMatchObject({
      buffStacks: 0,
      guard: false,
      riposte: false,
      protection: false,
    });
    expect(statusProjection(second.stacks, true).protection).toBe(true);
  });

  it("缺 duration、面值、非法状态或溢出全部拒绝", () => {
    for (const duration of [undefined, 0, -1, 0.5])
      expect(
        addStatusStack([], { kind: "buff", duration: duration as number }, "self", defenses).status,
      ).toBe("refused");
    expect(addStatusStack([], { kind: "bleed", duration: 2 }, "target", defenses).status).toBe(
      "refused",
    );
    expect(
      tickStatusStacks([
        { kind: "bleed", remaining: 1, amount: Number.MAX_SAFE_INTEGER },
        { kind: "blight", remaining: 1, amount: 1 },
      ]).status,
    ).toBe("refused");
    expect(
      tickStatusStacks([{ kind: "unknown" as StatusStack["kind"], remaining: 1 }]).status,
    ).toBe("refused");
  });

  it("英雄多堆 Stun 只扣一个行动，下一回合旧 Buff 已失效", () => {
    const state = ready("hero", [
      { kind: "stun", remaining: 1 },
      { kind: "stun", remaining: 2 },
      { kind: "buff", remaining: 1 },
    ]);
    const result = applyCommand(state, { type: "drawInitiative" });
    expect(result.state.battle!.encounter!.turn).toEqual({
      type: "hero",
      actorId: "h0",
      actions: 1,
      usedSkillIds: [],
    });
    expect(result.state.battle!.entities[0]).toMatchObject({
      statusStacks: [{ kind: "stun", remaining: 1 }],
      buffStacks: 0,
    });
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  });

  it("怪物多堆 Stun 跳过整个回合一次，不选择技能或掷骰", () => {
    const state = ready("monster", [
      { kind: "stun", remaining: 1 },
      { kind: "stun", remaining: 2 },
    ]);
    const result = applyCommand(state, { type: "drawInitiative" });
    expect(result.state.battle!.encounter!.turn.type).toBe("awaitingInitiative");
    expect(result.state.battle!.encounter!.actedIds).toEqual(["m0"]);
    expect(result.events.filter((event) => event.type === "turnEnded")).toHaveLength(1);
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor);
  });

  it("Bleed + Blight 同时伤口只掷一次死门，普通进入死门不掷，输入不变", () => {
    const stacks: StatusStack[] = [
      { kind: "bleed", remaining: 1, amount: 2 },
      { kind: "blight", remaining: 2, amount: 3 },
    ];
    const state = ready("hero", stacks, 10);
    const copy = structuredClone(state);
    const result = applyCommand(state, { type: "drawInitiative" });
    expect(result.state.battle!.rngCursor).toBe(state.battle!.rngCursor + 1);
    const health = result.events.filter((event) => event.type === "heroHealthResolved");
    expect(health).toHaveLength(1);
    expect(health[0]!.effect).toEqual({ type: "wounds", amounts: [2, 3] });
    expect(result).toEqual(applyCommand(state, { type: "drawInitiative" }));
    expect(state).toEqual(copy);
    const entering = ready("hero", stacks, 8);
    expect(applyCommand(entering, { type: "drawInitiative" }).state.battle!.rngCursor).toBe(
      entering.battle!.rngCursor,
    );
  });

  it("最后怪物被状态杀死立即胜利，死亡英雄补姿态位并结束回合", () => {
    const monster = ready("monster", [{ kind: "bleed", remaining: 1, amount: 2 }], 9);
    const victory = applyCommand(monster, { type: "drawInitiative" });
    expect(victory.state.battle!.encounter!.turn).toEqual({ type: "finished", outcome: "victory" });
    expect(victory.events.filter((event) => event.type === "casualtyRemoved")).toHaveLength(1);
    const hero = ready("hero", [{ kind: "bleed", remaining: 1, amount: 1 }], 10);
    // 显式选种子，覆盖状态死门死亡；不改变真实骰分布。
    let deadResult;
    for (let seed = 0; seed < 100; seed += 1) {
      const result = applyCommand({ ...hero, seed }, { type: "drawInitiative" });
      if (result.state.battle!.entities[0]!.dead) {
        deadResult = result;
        break;
      }
    }
    expect(deadResult).toBeDefined();
    expect(deadResult!.state.battle!.entities[1]!.stance).toBe("aggressive");
    expect(deadResult!.state.battle!.encounter!.actedIds).toEqual(["h0"]);
  });
});
