/** 官方 R20–21、R-018 / R-033：各次施加分别成堆，Nt 不得缺省。 */
export const STATUS_KINDS = [
  "bleed",
  "blight",
  "stun",
  "buff",
  "debuff",
  "mark",
  "guard",
  "riposte",
  "protection",
] as const;
export type StatusKind = (typeof STATUS_KINDS)[number];
export type StatusStack = {
  readonly kind: StatusKind;
  readonly remaining: number;
  readonly amount?: number;
};
export type StatusEffect = Omit<StatusStack, "remaining"> & { readonly duration: number };

const nonnegative = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 0;
export function statusStackProblem(stacks: readonly StatusStack[]): string | null {
  if (!Array.isArray(stacks)) return "状态堆必须是数组";
  for (const stack of stacks) {
    if (
      !stack ||
      !STATUS_KINDS.includes(stack.kind) ||
      !nonnegative(stack.remaining) ||
      stack.remaining === 0
    )
      return "状态种类 / 持续时间无效，不能补默认值（R-048）";
    const damage = stack.kind === "bleed" || stack.kind === "blight";
    if (damage ? !nonnegative(stack.amount) : stack.amount !== undefined)
      return "Bleed / Blight 必须有明确面值，其他状态不能携带伤口面值";
  }
  return null;
}

/** defenses 只能由已核实数据提供；此层不识别、命名任何卡面抗性图标。 */
export function addStatusStack(
  stacks: readonly StatusStack[],
  effect: StatusEffect,
  scope: "self" | "target",
  defenses: {
    readonly resistances: readonly StatusKind[];
    readonly immunities: readonly StatusKind[];
  },
):
  | { readonly status: "refused"; readonly reason: string }
  | { readonly status: "resolved"; readonly stacks: readonly StatusStack[] } {
  const problem =
    statusStackProblem(stacks) ??
    statusStackProblem([
      {
        kind: effect.kind,
        remaining: effect.duration,
        ...(effect.amount === undefined ? {} : { amount: effect.amount }),
      },
    ]);
  if (problem) return { status: "refused", reason: problem };
  if (
    (scope !== "self" && scope !== "target") ||
    ![defenses.resistances, defenses.immunities].every(
      (list) => Array.isArray(list) && list.every((kind) => STATUS_KINDS.includes(kind)),
    )
  )
    return { status: "refused", reason: "状态作用范围 / 已核实抗性或免疫种类无效" };
  const duration =
    scope === "self"
      ? effect.duration
      : defenses.immunities.includes(effect.kind)
        ? 0
        : effect.duration - Number(defenses.resistances.includes(effect.kind));
  return {
    status: "resolved",
    stacks:
      duration === 0
        ? stacks.map((stack) => ({ ...stack }))
        : [
            ...stacks.map((stack) => ({ ...stack })),
            {
              kind: effect.kind,
              remaining: duration,
              ...(effect.amount === undefined ? {} : { amount: effect.amount }),
            },
          ],
  };
}

export function statusProjection(stacks: readonly StatusStack[], innateProtection = false) {
  const count = (kind: StatusKind) => stacks.filter((stack) => stack.kind === kind).length;
  return {
    bleed: stacks.flatMap((stack, index) =>
      stack.kind === "bleed" ? [`status:bleed:${index}`] : [],
    ),
    blight: stacks.flatMap((stack, index) =>
      stack.kind === "blight" ? [`status:blight:${index}`] : [],
    ),
    buffStacks: count("buff"),
    debuffStacks: count("debuff"),
    markStacks: count("mark"),
    guard: count("guard") > 0,
    riposte: count("riposte") > 0,
    protection: innateProtection || count("protection") > 0,
  };
}

export function tickStatusStacks(stacks: readonly StatusStack[]):
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly stacks: readonly StatusStack[];
      readonly woundAmounts: readonly number[];
      readonly stunned: boolean;
    } {
  const problem = statusStackProblem(stacks);
  if (problem) return { status: "refused", reason: problem };
  const woundAmounts = stacks.flatMap((stack) =>
    stack.kind === "bleed" || stack.kind === "blight" ? [stack.amount!] : [],
  );
  if (!nonnegative(woundAmounts.reduce((sum, amount) => sum + amount, 0)))
    return { status: "refused", reason: "回合开始合计伤口超出安全整数范围" };
  return {
    status: "resolved",
    stacks: stacks
      .filter((stack) => stack.remaining > 1)
      .map((stack) => ({ ...stack, remaining: stack.remaining - 1 })),
    woundAmounts,
    stunned: stacks.some((stack) => stack.kind === "stun"),
  };
}
