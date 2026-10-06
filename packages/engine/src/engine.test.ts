import { describe, expect, it } from "vitest";
import { applyCommand, createInitialState, createRng } from "./index";

function uints(seed: number, count: number): number[] {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => Math.round(rng.next() * 4294967296));
}

describe("createRng", () => {
  it("同一种子得到同一序列", () => {
    expect(uints(1, 8)).toEqual(uints(1, 8));
    expect(uints(0, 8)).toEqual(uints(0, 8));
  });

  it("不同种子的序列不同", () => {
    expect(uints(1, 4)).not.toEqual(uints(2, 4));
  });

  it("序列与固定样本一致", () => {
    expect(uints(1, 4)).toEqual([2693262067, 11749833, 2265367787, 4213581821]);
  });
});

describe("applyCommand", () => {
  it("相同输入得到相同输出，且不改入参", () => {
    const notes: string[] = [];
    const state = { seed: 7, notes };
    const command = { type: "ping" as const, message: "hello" };

    const first = applyCommand(state, command);
    const second = applyCommand(state, command);

    expect(second).toEqual(first);
    expect(notes).toEqual([]);
    expect(state).toEqual({ seed: 7, notes: [] });
    expect(first.state).toEqual({ seed: 7, notes: ["hello"] });
    expect(first.events).toEqual([{ type: "pong", message: "hello" }]);
    expect(first.pendingChoice).toBeUndefined();
    expect(first.state).not.toBe(state);
  });

  it("空状态也能创建", () => {
    expect(createInitialState(3)).toEqual({ seed: 3, notes: [] });
  });
});
