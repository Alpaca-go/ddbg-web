import { describe, expect, it } from "vitest";
import { createRng, resolveHeroHealth, resolveSeededHeroHealth, rollD10 } from "./index";
import type { HeroHealthEffect, HeroHealthResolution, HeroHealthState } from "./index";

const hero: HeroHealthState = { life: 17, wounds: 14, dead: false };
const door = { ...hero, wounds: 17 };
const wounds = (...amounts: number[]): HeroHealthEffect => ({ type: "wounds", amounts });
const heal = (amount: number): HeroHealthEffect => ({ type: "heal", amount });
function resolved(result: HeroHealthResolution) {
  expect(result.status).toBe("resolved");
  if (result.status !== "resolved") throw new Error("应已结算");
  return result;
}

describe("英雄生命 / 死门纯结算（R20、R29、R-005、R-048）", () => {
  it("伤口达到或超过 Life 封顶并首次进入死门，这一击不掷骰", () => {
    for (const amount of [3, 30, Number.MAX_SAFE_INTEGER]) {
      const result = resolved(resolveHeroHealth(hero, wounds(amount)));
      expect(result).toMatchObject({
        state: { life: 17, wounds: 17, dead: false },
        enteredDeathDoor: true,
        leftDeathDoor: false,
        deathblow: false,
        face: null,
      });
      expect(resolveSeededHeroHealth(hero, wounds(amount), 1, 9).rngCursor).toBe(9);
    }
    expect(resolved(resolveHeroHealth(hero, wounds(2))).state.wounds).toBe(16);
  });

  it("已在死门的正数伤口请求骰面；空白存活，骷髅致命，不增加伤口", () => {
    expect(resolveHeroHealth(door, wounds(1))).toEqual({ status: "needsRoll", state: door });
    for (const amount of [1, 10]) {
      expect(resolved(resolveHeroHealth(door, wounds(amount), "blank"))).toMatchObject({
        state: door,
        enteredDeathDoor: false,
        leftDeathDoor: false,
        deathblow: false,
        face: "blank",
      });
      expect(resolved(resolveHeroHealth(door, wounds(amount), "skull"))).toMatchObject({
        state: { ...door, dead: true },
        deathblow: true,
        face: "skull",
      });
    }
  });

  it("至少治好一个伤口才脱离死门；零治疗无效，超额治疗最多归零", () => {
    expect(resolved(resolveHeroHealth(door, heal(0)))).toMatchObject({
      state: door,
      leftDeathDoor: false,
    });
    expect(resolved(resolveHeroHealth(door, heal(1)))).toMatchObject({
      state: { ...door, wounds: 16 },
      leftDeathDoor: true,
    });
    expect(resolved(resolveHeroHealth(door, heal(100)))).toMatchObject({
      state: { ...door, wounds: 0 },
      leftDeathDoor: true,
    });
    expect(resolved(resolveHeroHealth(hero, heal(1))).leftDeathDoor).toBe(false);
    const treated = resolved(resolveHeroHealth(door, heal(1))).state;
    expect(resolveSeededHeroHealth(treated, wounds(1), 1, 4)).toMatchObject({
      rngCursor: 4,
      enteredDeathDoor: true,
      deathblow: false,
    });
    expect(resolveSeededHeroHealth(door, wounds(1), 1, 4).rngCursor).toBe(5);
  });

  it("G-11：同一时刻 Bleed / Blight 一批结算，只掷一次；达到 Life 的同批不补掷", () => {
    // 调用方已核实各伤口量；这里不创建 / 解释任何状态面值或 duration。
    const result = resolveSeededHeroHealth(door, wounds(1, 2), 7, 2);
    expect(result.rngCursor).toBe(3);
    expect(result).toEqual(resolveSeededHeroHealth(door, wounds(3), 7, 2));
    expect(resolveSeededHeroHealth(hero, wounds(1, 2), 7, 2)).toMatchObject({
      rngCursor: 2,
      enteredDeathDoor: true,
      deathblow: false,
    });
    const separate = resolveSeededHeroHealth(hero, wounds(3), 7, 2);
    expect(separate.status).toBe("resolved");
    if (separate.status !== "resolved") throw new Error("应已结算");
    expect(
      resolveSeededHeroHealth(separate.state, wounds(1), 7, separate.rngCursor).rngCursor,
    ).toBe(3);
  });

  it("零伤口不触发死门骰，缺值 / null / 非整数 / 非法状态拒绝且不消费 RNG", () => {
    expect(resolveSeededHeroHealth(door, wounds(0, 0), 1, 6)).toMatchObject({
      status: "resolved",
      rngCursor: 6,
      face: null,
      deathblow: false,
    });
    const effects: unknown[] = [
      { type: "wounds", amounts: new Array(1) },
      wounds(),
      wounds(-1),
      wounds(0.5),
      wounds(NaN),
      wounds(Infinity),
      wounds(Number.MAX_SAFE_INTEGER, 1),
      heal(-1),
      heal(1.5),
      { type: "wounds", amounts: [null] },
      { type: "wounds" },
      { type: "heal", amount: null },
      { type: "heal" },
      { type: "unknown" },
    ];
    for (const effect of effects)
      expect(resolveSeededHeroHealth(door, effect as HeroHealthEffect, 1, 6)).toMatchObject({
        status: "refused",
        rngCursor: 6,
      });
    for (const patch of [
      { life: undefined },
      { life: null },
      { life: 0 },
      { life: 1.5 },
      { wounds: -1 },
      { wounds: 18 },
      { wounds: NaN },
      { dead: undefined },
    ])
      expect(
        resolveSeededHeroHealth({ ...hero, ...patch } as HeroHealthState, wounds(1), 1, 6),
      ).toMatchObject({ status: "refused", rngCursor: 6 });
  });

  it("错误或多余的骰面拒绝；亡者不能通过治疗复活或再结算伤口", () => {
    for (const [state, effect, face] of [
      [hero, wounds(3), "skull"],
      [door, heal(1), "blank"],
      [door, wounds(0), "skull"],
      [door, wounds(1), "unknown"],
    ] as const)
      expect(resolveHeroHealth(state, effect, face as "skull")).toMatchObject({
        status: "refused",
      });
    for (const effect of [wounds(1), heal(1)])
      expect(resolveSeededHeroHealth({ ...door, dead: true }, effect, 1, 6)).toMatchObject({
        status: "refused",
        rngCursor: 6,
      });
  });

  it("R-005 的十个等概率抽样桶恰好对应三骷髅七空白；不采用 PvP 反转", () => {
    const faces = new Map<number, string>();
    for (let seed = 0; seed < 1000 && faces.size < 10; seed++) {
      const bucket = rollD10(createRng(seed));
      const result = resolved(resolveSeededHeroHealth(door, wounds(1), seed, 0));
      expect(result.deathblow).toBe(result.face === "skull");
      faces.set(bucket, result.face!);
    }
    expect(faces.size).toBe(10);
    expect([...faces.values()].filter((face) => face === "skull")).toHaveLength(3);
    expect([...faces.values()].filter((face) => face === "blank")).toHaveLength(7);
  });

  it("同 seed / 效果序列一致，接续共享游标，不修改输入或重复试探消费骰序列", () => {
    const effects = [wounds(3), wounds(1, 2), heal(2), wounds(2), wounds(1)];
    const before = structuredClone({ hero, effects });
    const replay = () => {
      let state = hero;
      let cursor = 4; // 模拟先攻 / 技能已消费四步，纯生命层不重置它。
      return effects.map((effect) => {
        const result = resolveSeededHeroHealth(state, effect, 7, cursor);
        if (result.status === "resolved") state = result.state;
        cursor = result.rngCursor;
        return result;
      });
    };
    expect(replay()).toEqual(replay());
    const rng = createRng(7);
    for (let i = 0; i < 4; i++) rng.next();
    const expectedFace = rollD10(rng) <= 3 ? "skull" : "blank";
    expect(resolveSeededHeroHealth(door, wounds(1), 7, 4)).toMatchObject({
      rngCursor: 5,
      face: expectedFace,
    });
    expect({ hero, effects }).toEqual(before);
  });

  it("非法种子 / 游标拒绝，不能通过默认种子或游标继续", () => {
    for (const seed of [NaN, Infinity, 1.5])
      expect(resolveSeededHeroHealth(door, wounds(1), seed, 2).status).toBe("refused");
    for (const cursor of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER])
      expect(resolveSeededHeroHealth(door, wounds(1), 1, cursor).status).toBe("refused");
  });
});
