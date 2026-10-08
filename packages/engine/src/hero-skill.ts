/**
 * 已验证英雄技能对一个已选目标的命中伤害或治疗。
 *
 * 规则书第 19–20 页（说明书 §6.5）：Crit X [n] 的 X 是暴击阈值，n 是暴击量；
 * Acc Y [m] 的 Y 是命中阈值，m 是命中量。规范化数据不把 n、m 命名成伤害
 * （见 unlabeled_numbers 的 printed_label 锚点）。这一层只在 stats_line 上有
 * 已命名的 `damage` 或 `heal` 时，才把这两个整数当成伤害或治疗。
 *
 * 不读 effect_lines，不解释 `damage_or_heal_combined_marker`。
 */

export type SkillIconRef = {
  readonly key: string | null;
  readonly naming: string;
};

export type SkillSegment =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "icon"; readonly icon: SkillIconRef };

/** 规范化英雄技能里这一层会读的字段。多出来的字段可以留在对象上。 */
export type HeroSkillCardView = {
  readonly id: string;
  readonly hero: string | null;
  readonly verification: { readonly unverified: boolean };
  readonly printed_labels: readonly { readonly label: string; readonly value: number | null }[];
  readonly unlabeled_numbers: readonly {
    readonly numeric: number | null;
    readonly anchor:
      | { readonly type: "printed_label"; readonly label: string }
      | {
          readonly type: "beside_icon";
          readonly left_icon: SkillIconRef | null;
          readonly inside_icon: SkillIconRef | null;
        };
  }[];
  readonly stats_line: readonly SkillSegment[] | null;
  readonly effect_lines: readonly (readonly SkillSegment[])[];
};

export type SkillTargetSide = "hero" | "monster";

/** 目标已经选好。姿态、射程、区域都不在这里。 */
export type SkillCombatState = {
  readonly target: {
    readonly id: string;
    readonly side: SkillTargetSide;
    readonly wounds: number;
    readonly dodge: number;
  };
};

export type SkippedSkillEffect = {
  readonly code: "effect_lines" | "damage_or_heal_combined_marker";
};

export type HeroSkillResolution = {
  readonly skillId: string;
  readonly targetId: string;
  readonly status: "resolved" | "refused";
  readonly reason: string | null;
  readonly outcome: "crit" | "hit" | "miss" | null;
  readonly effect: "damage" | "heal" | null;
  readonly printedAmount: number | null;
  readonly wounds: number;
  readonly skipped: readonly SkippedSkillEffect[];
};

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

function refuse(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  reason: string,
): HeroSkillResolution {
  return {
    skillId: skill.id,
    targetId: combat.target.id,
    status: "refused",
    reason,
    outcome: null,
    effect: null,
    printedAmount: null,
    wounds: combat.target.wounds,
    skipped: [],
  };
}

function namedKeys(segments: readonly SkillSegment[] | null): string[] {
  if (!segments) return [];
  const keys: string[] = [];
  for (const segment of segments) {
    if (segment.type !== "icon") continue;
    const key = segment.icon.key;
    if (key === null || !NAMED.has(segment.icon.naming)) continue;
    keys.push(key);
  }
  return keys;
}

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function threshold(skill: HeroSkillCardView, label: "Crit" | "Acc"): number | null {
  const found = skill.printed_labels.filter((item) => item.label === label);
  if (found.length !== 1) return null;
  const value = found[0]?.value;
  if (value === undefined || value === null || !nonNegativeInteger(value)) return null;
  return value;
}

/** 印在 Crit / Acc 标签旁边的那个整数。不是伤害字段名。 */
function amountBesideLabel(skill: HeroSkillCardView, label: "Crit" | "Acc"): number | null {
  const found: number[] = [];
  for (const item of skill.unlabeled_numbers) {
    if (item.anchor.type !== "printed_label" || item.anchor.label !== label) continue;
    if (item.numeric === null || !nonNegativeInteger(item.numeric)) continue;
    found.push(item.numeric);
  }
  if (found.length !== 1) return null;
  return found[0] ?? null;
}

function skippedEffects(skill: HeroSkillCardView, keys: readonly string[]): SkippedSkillEffect[] {
  const skipped: SkippedSkillEffect[] = [];
  if (keys.includes("damage_or_heal_combined_marker")) {
    skipped.push({ code: "damage_or_heal_combined_marker" });
  }
  if (skill.effect_lines.length > 0) skipped.push({ code: "effect_lines" });
  return skipped;
}

/**
 * 结算一张英雄技能。`roll` 是 d10 面值（1–10），由调用方用 `rollD10` 取得。
 * 未验证的卡、对不上的目标、读不出整数的 Crit / Acc，都原样留下伤口。
 */
export function resolveHeroSkill(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  roll: number,
): HeroSkillResolution {
  if (skill.hero !== null && skill.hero.trim().toLowerCase() === "musketeer") {
    return refuse(skill, combat, "Musketeer 不在首版（R-008）");
  }
  if (skill.verification.unverified) {
    return refuse(skill, combat, "未验证的技能不结算（R-048）");
  }
  if (!Number.isInteger(roll) || roll < 1 || roll > 10) {
    return refuse(skill, combat, "d10 必须是 1 到 10 的整数");
  }
  const target = combat.target;
  if (target.side !== "hero" && target.side !== "monster") {
    return refuse(skill, combat, "目标阵营必须是 hero 或 monster");
  }
  if (!nonNegativeInteger(target.wounds)) {
    return refuse(skill, combat, "伤口必须是非负整数");
  }
  if (!nonNegativeInteger(target.dodge)) {
    return refuse(skill, combat, "Dodge 必须是非负整数");
  }

  const keys = namedKeys(skill.stats_line);
  const kinds = new Set(keys.filter((key) => key === "damage" || key === "heal"));
  if (kinds.size !== 1) {
    return refuse(
      skill,
      combat,
      kinds.size > 1
        ? "stats_line 同时有已命名的 damage 和 heal"
        : "stats_line 没有已命名的 damage 或 heal",
    );
  }
  const effect = kinds.has("damage") ? "damage" : "heal";

  const targets = new Set(keys.filter((key) => key === "target_hero" || key === "target_monster"));
  if (targets.size !== 1) {
    return refuse(
      skill,
      combat,
      targets.size === 0
        ? "stats_line 没有已命名的 target_hero 或 target_monster"
        : "stats_line 同时有 target_hero 和 target_monster",
    );
  }
  const expectedSide = targets.has("target_hero") ? "hero" : "monster";
  if (target.side !== expectedSide) {
    return refuse(skill, combat, "目标阵营与技能的目标图标不一致");
  }

  const critThreshold = threshold(skill, "Crit");
  if (critThreshold === null) return refuse(skill, combat, "Crit 标签没有非负整数阈值");
  const accThreshold = threshold(skill, "Acc");
  if (accThreshold === null) return refuse(skill, combat, "Acc 标签没有非负整数阈值");
  const critAmount = amountBesideLabel(skill, "Crit");
  if (critAmount === null) return refuse(skill, combat, "Crit 旁边没有恰好一个非负整数");
  const hitAmount = amountBesideLabel(skill, "Acc");
  if (hitAmount === null) return refuse(skill, combat, "Acc 旁边没有恰好一个非负整数");

  // 规则书第 19 页：先看暴击（不减 Dodge），再看命中阈值 Acc − Dodge。
  let outcome: "crit" | "hit" | "miss";
  if (roll <= critThreshold) outcome = "crit";
  else if (roll <= accThreshold - target.dodge) outcome = "hit";
  else outcome = "miss";

  let wounds = target.wounds;
  let printedAmount: number | null = null;
  if (outcome !== "miss") {
    printedAmount = outcome === "crit" ? critAmount : hitAmount;
    wounds = effect === "damage" ? wounds + printedAmount : Math.max(0, wounds - printedAmount);
  }

  return {
    skillId: skill.id,
    targetId: target.id,
    status: "resolved",
    reason: null,
    outcome,
    effect,
    printedAmount,
    wounds,
    skipped: skippedEffects(skill, keys),
  };
}
