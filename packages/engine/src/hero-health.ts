import { createRng } from "./rng";

/** 只接收已核实 Life；死门由伤口等于 Life 推导，不另存一个可能过期的布尔值。 */
export type HeroHealthState = {
  readonly life: number;
  readonly wounds: number;
  readonly dead: boolean;
};

export type DeathDoorFace = "skull" | "blank";
export type HeroHealthEffect =
  /** 一个数组是同一时刻的一批伤口；先合并，再判定一次（R20、R29）。 */
  | { readonly type: "wounds"; readonly amounts: readonly number[] }
  | { readonly type: "heal"; readonly amount: number };

export type HeroHealthResolution =
  | { readonly status: "refused"; readonly reason: string }
  | { readonly status: "needsRoll"; readonly state: HeroHealthState }
  | {
      readonly status: "resolved";
      readonly state: HeroHealthState;
      readonly enteredDeathDoor: boolean;
      readonly leftDeathDoor: boolean;
      readonly deathblow: boolean;
      readonly face: DeathDoorFace | null;
    };

/**
 * 核心规则书 R20、R29；说明书 §9.1–9.2、R-005。只处理伤口 / 治疗，不处理伤害修正。
 * 首次达到 Life 不掷骰；已在死门时再受正数伤口才请求一个骰面；亡者不能治疗复活。
 * 不给缺 Life、null 数字或状态回合数补默认值（R-048）。
 */
export function resolveHeroHealth(
  state: HeroHealthState,
  effect: HeroHealthEffect,
  face?: DeathDoorFace,
): HeroHealthResolution {
  const refuse = (reason: string): HeroHealthResolution => ({ status: "refused", reason });
  const integer = (value: number) => Number.isSafeInteger(value) && value >= 0;
  if (
    !integer(state.life) ||
    state.life === 0 ||
    !integer(state.wounds) ||
    state.wounds > state.life ||
    typeof state.dead !== "boolean"
  )
    return refuse("缺少已核实 Life 或英雄伤口 / 死亡状态无效（R-048）");
  if (state.dead) return refuse("已死亡英雄不能继续受伤或通过治疗复活（R9、R29）");
  let amount: number;
  if (effect.type === "wounds") {
    if (
      !Array.isArray(effect.amounts) ||
      !effect.amounts.length ||
      ![...effect.amounts].every(integer)
    )
      return refuse("同一时刻的伤口必须是非空的已命名非负整数数组（R-048）");
    amount = effect.amounts.reduce((sum, value) => sum + value, 0);
  } else if (effect.type === "heal") {
    amount = effect.amount;
  } else return refuse("不支持的英雄生命效果");
  if (!integer(amount)) return refuse("伤口 / 治疗数值无效或超出安全整数范围（R-048）");
  const atDoor = state.wounds === state.life;
  const needsRoll = effect.type === "wounds" && amount > 0 && atDoor;
  if (face !== undefined && (!needsRoll || (face !== "skull" && face !== "blank")))
    return refuse("死门骰面无效或本次效果不应掷死门骰（R29）");
  if (needsRoll && face === undefined) return { status: "needsRoll", state };
  // 用剩余 Life 算实际增加量，避免在封顶前做可能溢出的 wounds + amount。
  const wounds =
    effect.type === "heal"
      ? Math.max(0, state.wounds - amount)
      : state.wounds + Math.min(amount, state.life - state.wounds);
  const deathblow = needsRoll && face === "skull";
  return {
    status: "resolved",
    state: { ...state, wounds, dead: deathblow },
    enteredDeathDoor: !atDoor && wounds === state.life,
    leftDeathDoor: atDoor && wounds < state.life,
    deathblow,
    face: needsRoll ? face! : null,
  };
}

/** R-005：3 骷髅 + 7 空白。数组索引只是软件抽样顺序，不给实体骰面编印刷数字。 */
const DEATH_DOOR_FACES: readonly DeathDoorFace[] = [
  "skull",
  "skull",
  "skull",
  "blank",
  "blank",
  "blank",
  "blank",
  "blank",
  "blank",
  "blank",
];

/** 与先攻 / 技能同用 Mulberry32 游标；纯函数，拒绝、进入死门或治疗均不消耗骰序列。 */
export function resolveSeededHeroHealth(
  state: HeroHealthState,
  effect: HeroHealthEffect,
  seed: number,
  rngCursor: number,
): HeroHealthResolution & { readonly rngCursor: number } {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(rngCursor) || rngCursor < 0)
    return { status: "refused", reason: "种子 / RNG 游标无效", rngCursor };
  const result = resolveHeroHealth(state, effect);
  if (result.status !== "needsRoll") return { ...result, rngCursor };
  // 下一个游标也必须能精确表示，不能掷完才发现无法回放。
  if (rngCursor === Number.MAX_SAFE_INTEGER)
    return { status: "refused", reason: "RNG 游标超出安全整数范围", rngCursor };
  const rng = createRng(seed);
  for (let index = 0; index < rngCursor; index += 1) rng.next();
  const face = DEATH_DOOR_FACES[Math.floor(rng.next() * DEATH_DOOR_FACES.length)]!;
  return { ...resolveHeroHealth(state, effect, face), rngCursor: rngCursor + 1 };
}
