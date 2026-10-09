import { describe, expect, it } from "vitest";
import { createBattleState, resolveShuffle } from "./index";
import type { BattleArea, BattleEntity, ShuffleIntent, ShuffleResolution } from "./index";

function entity(id: string, overrides: Partial<BattleEntity> = {}): BattleEntity {
  return {
    id,
    side: "monster",
    hero: null,
    skillIds: [],
    areaId: "b",
    stance: "aggressive",
    stanceSlots: 1,
    life: 10,
    wounds: 0,
    dodge: 0,
    guard: false,
    dead: false,
    bleed: [],
    blight: [],
    ...overrides,
  };
}

function hero(id = "hero", overrides: Partial<BattleEntity> = {}): BattleEntity {
  const { life: _life, ...base } = entity(id);
  void _life;
  return {
    ...base,
    side: "hero",
    hero: "CRUSADER",
    stress: 0,
    areaId: "a",
    ...overrides,
  };
}

function area(id: string, adjacent: string[], capacity = 4): BattleArea {
  return { id, adjacent, capacity, elevation: "normal" };
}
const line = [area("a", ["b"]), area("b", ["a", "c"]), area("c", ["b", "d"]), area("d", ["c"])];
const intent = (distance = 1, direction: "push" | "pull" = "push"): ShuffleIntent => ({
  entityId: "target",
  relativeToId: "hero",
  move: { direction, distance },
});
function resolved(result: ShuffleResolution) {
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw new Error("位移未结算");
  return result;
}

describe("Push / Pull 位置纯结算（R21/R24、R-020、R-021、Q-19）", () => {
  it("Push 改棋子区域和姿态，同阵营顺移；保持确定性与入参不变", () => {
    const setup = {
      areas: line,
      entities: [hero(), entity("target"), entity("other", { stance: "defensive" })],
    };
    const snapshot = structuredClone(setup);
    const result = resolved(resolveShuffle(setup, intent()));
    expect(result.entities).toMatchObject([
      { id: "hero", areaId: "a", stance: "aggressive" },
      { id: "target", areaId: "c", stance: "defensive" },
      { id: "other", areaId: "b", stance: "aggressive" },
    ]);
    expect(result).toMatchObject({ path: ["c"], areaSteps: 1, stanceSteps: 1 });
    expect(resolveShuffle(setup, intent())).toEqual(result);
    expect(setup).toEqual(snapshot);
  });

  it("R22 / G-04：Bone Defender 自身 Pull 1 靠近英雄并把 Arbalist 推后", () => {
    const setup = {
      areas: line,
      entities: [hero(), entity("arbalist"), entity("defender", { stance: "defensive" })],
    };
    const result = resolved(resolveShuffle(setup, { ...intent(1, "pull"), entityId: "defender" }));
    expect(result.entities).toMatchObject([
      { id: "hero", areaId: "a" },
      { id: "arbalist", areaId: "b", stance: "defensive" },
      { id: "defender", areaId: "a", stance: "aggressive" },
    ]);
  });

  it("同区 Pull 不动区域但仍前移姿态；Push 第一步离开同区", () => {
    const setup = {
      areas: line,
      entities: [hero(), entity("target", { areaId: "a", stance: "defensive" })],
    };
    expect(resolved(resolveShuffle(setup, intent(1, "pull")))).toMatchObject({
      path: [],
      areaSteps: 0,
      stanceSteps: 1,
    });
    expect(resolved(resolveShuffle(setup, intent()))).toMatchObject({ path: ["b"] });
  });

  it("满员截断区域，不穿过满员区域；姿态照常移到轨道末尾", () => {
    const setup = {
      areas: line.map((entry) => (entry.id === "c" ? { ...entry, capacity: 1 } : entry)),
      entities: [hero(), entity("target"), entity("blocker", { areaId: "c", stance: "defensive" })],
    };
    const result = resolved(resolveShuffle(setup, intent(20)));
    expect(result).toMatchObject({ path: [], areaSteps: 0, stanceSteps: 3 });
    expect(result.entities[1]).toMatchObject({ areaId: "b", stance: "support" });
    expect(resolveShuffle(setup, intent(), ["c"]).status).toBe("refused");
  });

  it("姿态到轨道边缘不妨碍区域继续移动；死人不占容量", () => {
    const setup = {
      areas: line.map((entry) => ({ ...entry, capacity: 1 })),
      entities: [
        hero(),
        entity("target", { stance: "support" }),
        entity("dead", { areaId: "c", dead: true }),
      ],
    };
    expect(resolved(resolveShuffle(setup, intent(2)))).toMatchObject({
      path: ["c", "d"],
      stanceSteps: 0,
    });
  });

  it("大型怪整体移动两格，其他角色各顺移两格且棋子不动", () => {
    const setup = {
      areas: line,
      entities: [
        hero(),
        entity("target", { stanceSlots: 2 }),
        entity("one", { stance: "ranged" }),
        entity("two", { stance: "support" }),
      ],
    };
    const result = resolved(resolveShuffle(setup, intent(3)));
    expect(result.entities.slice(1)).toMatchObject([
      { areaId: "d", stance: "ranged", stanceSlots: 2 },
      { areaId: "b", stance: "aggressive" },
      { areaId: "b", stance: "defensive" },
    ]);
    expect(result.stanceSteps).toBe(2);
  });

  it("大型怪按两格计算区域容量，不触发自主移动的挤占例外", () => {
    const setup = {
      areas: line.map((entry) => ({ ...entry, capacity: 2 })),
      entities: [
        hero(),
        entity("target", { stanceSlots: 2 }),
        hero("blocker", { areaId: "c", stance: "defensive" }),
      ],
    };
    expect(resolved(resolveShuffle(setup, intent()))).toMatchObject({ path: [], stanceSteps: 1 });
  });

  it("多步分岔返回落点选项；每一步遵守距参照区域 ±1", () => {
    const setup = {
      areas: [
        area("a", ["b", "c"]),
        area("b", ["a", "d", "e"]),
        area("c", ["a", "d"]),
        area("d", ["b", "c"]),
        area("e", ["b"]),
      ],
      entities: [hero(), entity("target", { areaId: "a" })],
    };
    expect(resolveShuffle(setup, intent(2))).toEqual({
      status: "needsChoice",
      path: [],
      options: ["b", "c"],
    });
    expect(resolveShuffle(setup, intent(2), ["b"])).toEqual({
      status: "needsChoice",
      path: ["b"],
      options: ["d", "e"],
    });
    expect(resolved(resolveShuffle(setup, intent(2), ["b", "e"])).path).toEqual(["b", "e"]);
    expect(resolveShuffle(setup, intent(2), ["b", "a"]).status).toBe("refused");
    expect(resolveShuffle(setup, intent(1), ["b", "e"]).status).toBe("refused");
  });

  it("候选区域满员时只给可容纳的落点；容量零截断", () => {
    const setup = {
      areas: [area("a", ["b", "c"]), area("b", ["a"], 0), area("c", ["a"])],
      entities: [hero(), entity("target", { areaId: "a" })],
    };
    expect(resolved(resolveShuffle(setup, intent())).path).toEqual(["c"]);
  });

  it("接收技能层已扣抗性的距离，不重复减距；零距离保持位置", () => {
    const setup = { areas: line, entities: [hero(), entity("target", { shuffleResist: true })] };
    expect(resolved(resolveShuffle(setup, intent())).areaSteps).toBe(1);
    expect(resolved(resolveShuffle(setup, intent(0))).entities).toBe(setup.entities);
  });

  it("大型怪不能被另一角色的位移终点拆开，保留 Q-19", () => {
    const setup = {
      areas: line,
      entities: [
        hero(),
        entity("target"),
        entity("large", { stance: "defensive", stanceSlots: 2 }),
      ],
    };
    expect(resolveShuffle(setup, intent())).toMatchObject({
      status: "refused",
      reason: expect.stringContaining("Q-19"),
    });
    expect(resolved(resolveShuffle(setup, intent(2))).entities.slice(1)).toMatchObject([
      { stance: "ranged" },
      { stance: "aggressive", stanceSlots: 2 },
    ]);
  });

  it("拒绝未核实容量 / 占格、非法轨道、断图及无效意图", () => {
    const setup = { areas: line, entities: [hero(), entity("target")] };
    expect(
      resolveShuffle(
        {
          ...setup,
          areas: line.map(({ id, adjacent, elevation }) => ({ id, adjacent, elevation })),
        },
        intent(),
      ).status,
    ).toBe("refused");
    const { stanceSlots: _slots, ...unknownWidth } = entity("target");
    void _slots;
    expect(resolveShuffle({ ...setup, entities: [hero(), unknownWidth] }, intent()).status).toBe(
      "refused",
    );
    expect(
      resolveShuffle({ ...setup, entities: [...setup.entities, entity("overlap")] }, intent())
        .status,
    ).toBe("refused");
    expect(
      resolveShuffle({ ...setup, areas: [area("a", []), area("b", [])] }, intent()).status,
    ).toBe("refused");
    expect(resolveShuffle(setup, intent(-1)).status).toBe("refused");
    expect(resolveShuffle(setup, { ...intent(), relativeToId: "missing" }).status).toBe("refused");
    expect(resolveShuffle(setup, intent(0), ["b"]).status).toBe("refused");
  });

  it("沙盒容量可缺省以兼容旧夹具，但已提供的非法容量拒绝", () => {
    const setup = { areas: [area("a", [], -1)], entities: [hero()], skills: [], light: 5 };
    expect(() => createBattleState(1, setup)).toThrow();
  });
});
