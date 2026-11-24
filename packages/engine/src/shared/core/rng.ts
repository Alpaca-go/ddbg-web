export type Rng = {
  /** 均匀分布，区间 [0, 1)。 */
  next(): number;
};

/**
 * Mulberry32，状态每步收成 32 位。同一种子得到同一序列。
 * 骰子和洗牌都走这里，不要用 Math.random。
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next() {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}

/** 规则书 d10 的面值，1–10。 */
export function rollD10(rng: Rng): number {
  return Math.floor(rng.next() * 10) + 1;
}
