/**
 * 已验证英雄技能对一个已选目标的命中伤害或治疗，以及规则书已经写明的后续步骤。
 *
 * 规则书第 19–20 页（说明书 §6.5）：Crit X 的 X、Acc Y 的 Y 是阈值。规范化数据
 * 不把标签旁边的整数命名成伤害。只有 stats_line 上已命名的 `damage` 或 `heal`
 * 才把这两个整数当成伤害或治疗。暴击不减 Dodge；命中阈值是 Acc − Dodge。
 *
 * 伤害后续（R-026、R-019、R-017，说明书 §6.6）：基础值之后，目标有 Protection
 * 时攻击伤害减半，向上取整，只减一次。结果 ≥ 1 才算受到伤害。目标有 Riposte
 * 时，按减半之前的伤害向上取整一半，反弹给攻击者。反弹不是攻击：不被 Protection
 * 减半，也不再触发 Riposte。怪物的伤口 ≥ 调用方传入的 Life 则死亡。Life 来自
 * 规范化怪物卡上已命名的 `life`。
 *
 * 暴击压力（R-031，说明书 §6.5 第 8 步）：打出暴击，包括治疗暴击，使用者与同区域
 * 其他英雄的压力各 −1，一次技能只减一次。压力停在 0–10。到 10 以后的意志检定
 * 和心脏病不在这一层。
 *
 * 不读 effect_lines，不解释 `damage_or_heal_combined_marker`。姿态、射程、
 * 英雄 Life、死门骰都不在这里。
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

/** 同区域里的另一名英雄，只带这一层要改的压力。 */
export type SkillAreaHero = {
  readonly id: string;
  readonly stress: number;
};

export type SkillActorState = {
  readonly id: string;
  readonly wounds: number;
  /** 0–10。不传就不改这名英雄的压力。 */
  readonly stress?: number;
  /**
   * 攻击者自己的 Protection。反弹不是攻击，这里减半不会用到（R-017）。
   */
  readonly protection?: boolean;
  /** 攻击者自己的 Riposte。反弹不会再触发 Riposte（R-017）。 */
  readonly riposte?: boolean;
};

/** 目标已经选好。姿态、射程、区域几何都不在这里。 */
export type SkillTargetState = {
  readonly id: string;
  readonly side: SkillTargetSide;
  readonly wounds: number;
  readonly dodge: number;
  /**
   * 至少一层 Protection，或怪物卡上的内置 Protection。
   * 两种同时在场也只减半一次（R-019）。不传表示没有。
   */
  readonly protection?: boolean;
  /** 至少一层 Riposte。不传表示没有。 */
  readonly riposte?: boolean;
  /**
   * 怪物卡心形里的 Life。不传就不判断死亡。
   * 英雄的 Life 不在规范化数据里，传了会拒绝。
   */
  readonly life?: number;
  /** 英雄压力 0–10。怪物没有压力轨。 */
  readonly stress?: number;
};

export type SkillCombatState = {
  readonly target: SkillTargetState;
  /** 使用这张技能的英雄。目标有 Riposte 时必须有。 */
  readonly actor?: SkillActorState;
  /**
   * 与使用者同区域的其他英雄。打出暴击时各 −1 一次（R-031）。
   * 不要把使用者或目标放进来。
   */
  readonly heroesBesideActor?: readonly SkillAreaHero[];
  /**
   * 与目标同区域、这次没有被选为目标的英雄。
   * 只有英雄目标承受伤害暴击时各 +1 一次（R-031）。
   */
  readonly untargetedHeroesBesideTarget?: readonly SkillAreaHero[];
  /**
   * 目标英雄是不是和使用者在同一区域。
   * 为真时，打出暴击也给目标压力 −1（R-031 的「同区域其他英雄」）。
   */
  readonly targetInActorArea?: boolean;
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
  /** 卡面上 Crit / Acc 旁边的整数。还没做 Protection。 */
  readonly printedAmount: number | null;
  /** Protection 之后的伤害。只有伤害类命中或暴击才有数字；落空和治疗为 null。 */
  readonly damageDealt: number | null;
  /** 反弹给攻击者的伤害。没触发为 null。 */
  readonly riposteDamage: number | null;
  readonly wounds: number;
  /** 攻击者结算后的伤口。没传入攻击者时为 null。 */
  readonly actorWounds: number | null;
  /** 怪物伤口 ≥ Life。没传入 Life，或目标不是怪物时为 false。 */
  readonly targetDead: boolean;
  readonly actorStress: number | null;
  readonly targetStress: number | null;
  readonly besideActorStress: readonly SkillAreaHero[] | null;
  readonly untargetedBesideTargetStress: readonly SkillAreaHero[] | null;
  readonly skipped: readonly SkippedSkillEffect[];
};

const NAMED = new Set(["confirmed", "confirmed_rulebook"]);

function nonNegativeInteger(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

function positiveInteger(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

function isStress(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 10;
}

/** 减半向上取整。只用于非负整数。 */
function halfUp(value: number): number {
  return Math.ceil(value / 2);
}

function clampStress(value: number): number {
  if (value < 0) return 0;
  if (value > 10) return 10;
  return value;
}

function copyHeroes(heroes: readonly SkillAreaHero[] | null): SkillAreaHero[] | null {
  if (heroes === null) return null;
  return heroes.map((hero) => ({ id: hero.id, stress: hero.stress }));
}

function snapshotHeroes(value: readonly SkillAreaHero[] | undefined): SkillAreaHero[] | null {
  if (!Array.isArray(value)) return null;
  const heroes: SkillAreaHero[] = [];
  for (const hero of value) {
    if (typeof hero !== "object" || hero === null) continue;
    heroes.push({
      id: typeof hero.id === "string" ? hero.id : "",
      stress: typeof hero.stress === "number" ? hero.stress : 0,
    });
  }
  return heroes;
}

function refuse(
  skill: HeroSkillCardView,
  combat: SkillCombatState,
  reason: string,
): HeroSkillResolution {
  const actorWounds = typeof combat.actor?.wounds === "number" ? combat.actor.wounds : null;
  const actorStress = typeof combat.actor?.stress === "number" ? combat.actor.stress : null;
  const targetStress = typeof combat.target.stress === "number" ? combat.target.stress : null;
  return {
    skillId: skill.id,
    targetId: combat.target.id,
    status: "refused",
    reason,
    outcome: null,
    effect: null,
    printedAmount: null,
    damageDealt: null,
    riposteDamage: null,
    wounds: combat.target.wounds,
    actorWounds,
    targetDead: false,
    actorStress,
    targetStress,
    besideActorStress: snapshotHeroes(combat.heroesBesideActor),
    untargetedBesideTargetStress: snapshotHeroes(combat.untargetedHeroesBesideTarget),
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

function readAreaHeroes(
  value: readonly SkillAreaHero[] | undefined,
  label: string,
): { ok: true; heroes: SkillAreaHero[] | null } | { ok: false; reason: string } {
  if (value === undefined) return { ok: true, heroes: null };
  if (!Array.isArray(value)) return { ok: false, reason: `${label}必须是数组` };
  const seen = new Set<string>();
  const heroes: SkillAreaHero[] = [];
  for (const hero of value) {
    if (typeof hero !== "object" || hero === null) {
      return { ok: false, reason: `${label}里有空项` };
    }
    if (typeof hero.id !== "string" || hero.id.length === 0) {
      return { ok: false, reason: `${label}里的英雄缺少 id` };
    }
    if (!isStress(hero.stress)) {
      return { ok: false, reason: `${label}里的压力必须是 0 到 10 的整数` };
    }
    if (seen.has(hero.id)) return { ok: false, reason: `${label}里有重复的英雄` };
    seen.add(hero.id);
    heroes.push({ id: hero.id, stress: hero.stress });
  }
  return { ok: true, heroes };
}

function combatProblem(combat: SkillCombatState): string | null {
  const target = combat.target;
  if (target.side !== "hero" && target.side !== "monster") {
    return "目标阵营必须是 hero 或 monster";
  }
  if (!nonNegativeInteger(target.wounds)) return "伤口必须是非负整数";
  if (!nonNegativeInteger(target.dodge)) return "Dodge 必须是非负整数";
  if (target.protection !== undefined && typeof target.protection !== "boolean") {
    return "Protection 必须是布尔值";
  }
  if (target.riposte !== undefined && typeof target.riposte !== "boolean") {
    return "Riposte 必须是布尔值";
  }
  if (target.life !== undefined && !positiveInteger(target.life)) return "Life 必须是正整数";
  if (target.side === "hero" && target.life !== undefined) {
    return "英雄 Life 不在这一层结算：规范化数据没有英雄 Life，死门骰哪几面是骷髅也没有命名（R-005）";
  }
  if (target.side === "monster" && target.stress !== undefined) return "怪物没有压力轨";
  if (target.stress !== undefined && !isStress(target.stress)) {
    return "压力必须是 0 到 10 的整数";
  }
  if (combat.targetInActorArea !== undefined && typeof combat.targetInActorArea !== "boolean") {
    return "targetInActorArea 必须是布尔值";
  }
  if (combat.targetInActorArea === true && target.side !== "hero") {
    return "怪物目标不能算进使用者区域的压力（R-031）";
  }
  if (combat.targetInActorArea === true && target.stress === undefined) {
    return "目标在使用者的区域里，但没有压力（R-031）";
  }

  const actor = combat.actor;
  if (target.riposte === true && actor === undefined) {
    return "目标有 Riposte，但没有攻击者可以承受反弹（R-017）";
  }
  if (actor !== undefined) {
    if (typeof actor.id !== "string" || actor.id.length === 0) return "攻击者缺少 id";
    if (!nonNegativeInteger(actor.wounds)) return "攻击者伤口必须是非负整数";
    if (actor.stress !== undefined && !isStress(actor.stress)) {
      return "攻击者的压力必须是 0 到 10 的整数";
    }
    if (actor.protection !== undefined && typeof actor.protection !== "boolean") {
      return "攻击者的 Protection 必须是布尔值";
    }
    if (actor.riposte !== undefined && typeof actor.riposte !== "boolean") {
      return "攻击者的 Riposte 必须是布尔值";
    }
  }

  const beside = readAreaHeroes(combat.heroesBesideActor, "使用者身边的英雄");
  if (!beside.ok) return beside.reason;
  const untargeted = readAreaHeroes(combat.untargetedHeroesBesideTarget, "目标身边没被选中的英雄");
  if (!untargeted.ok) return untargeted.reason;

  if (beside.heroes !== null && beside.heroes.length > 0 && actor?.stress === undefined) {
    return "同区域英雄的暴击压力要和使用者的压力一起结算（R-031）";
  }
  if (
    beside.heroes !== null &&
    actor !== undefined &&
    beside.heroes.some((hero) => hero.id === actor.id)
  ) {
    return "使用者的压力写在 actor 上，不要放进身边名单";
  }
  if (beside.heroes !== null && beside.heroes.some((hero) => hero.id === target.id)) {
    return "目标的压力写在目标上，不要放进使用者身边的名单";
  }
  if (untargeted.heroes !== null && untargeted.heroes.some((hero) => hero.id === target.id)) {
    return "被选中的目标不在「没被选中」的名单里";
  }
  if (
    untargeted.heroes !== null &&
    actor !== undefined &&
    untargeted.heroes.some((hero) => hero.id === actor.id)
  ) {
    return "使用者的压力写在 actor 上，不要放进没被选中的名单";
  }
  if (beside.heroes !== null && untargeted.heroes !== null) {
    const besideIds = new Set(beside.heroes.map((hero) => hero.id));
    if (untargeted.heroes.some((hero) => besideIds.has(hero.id))) {
      return "同一名英雄不要同时出现在两份区域名单里";
    }
  }
  return null;
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
  const problem = combatProblem(combat);
  if (problem !== null) return refuse(skill, combat, problem);

  const target = combat.target;
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
  let damageDealt: number | null = null;
  let riposteDamage: number | null = null;
  let actorWounds = combat.actor === undefined ? null : combat.actor.wounds;

  if (outcome !== "miss") {
    printedAmount = outcome === "crit" ? critAmount : hitAmount;
    if (effect === "heal") {
      wounds = Math.max(0, wounds - printedAmount);
    } else {
      // +X vs 类型、攻击方修正、防御方加减、Hard Skinned 都不加：
      // 那些数字要么 numeric 为 null，要么不在这次调用里。
      const beforeProtection = printedAmount;
      damageDealt = target.protection === true ? halfUp(beforeProtection) : beforeProtection;
      if (damageDealt >= 1) {
        wounds += damageDealt;
        if (target.riposte === true && actorWounds !== null) {
          // 反弹量用 Protection 之前的伤害。攻击者的 Protection / Riposte 不用。
          riposteDamage = halfUp(beforeProtection);
          actorWounds += riposteDamage;
        }
      }
    }
  }

  const targetDead =
    target.side === "monster" && target.life !== undefined && wounds >= target.life;

  const dealtCrit = outcome === "crit";
  const receivedCrit = dealtCrit && effect === "damage" && target.side === "hero";
  let actorStress = combat.actor?.stress === undefined ? null : combat.actor.stress;
  let targetStress = target.stress === undefined ? null : target.stress;
  let besideActorStress = copyHeroes(
    combat.heroesBesideActor === undefined ? null : [...combat.heroesBesideActor],
  );
  let untargetedBesideTargetStress = copyHeroes(
    combat.untargetedHeroesBesideTarget === undefined
      ? null
      : [...combat.untargetedHeroesBesideTarget],
  );

  if (dealtCrit && actorStress !== null) actorStress = clampStress(actorStress - 1);
  if (dealtCrit && besideActorStress !== null) {
    besideActorStress = besideActorStress.map((hero) => ({
      id: hero.id,
      stress: clampStress(hero.stress - 1),
    }));
  }
  if (targetStress !== null) {
    let delta = 0;
    if (dealtCrit && combat.targetInActorArea === true) delta -= 1;
    if (receivedCrit) delta += 1;
    targetStress = clampStress(targetStress + delta);
  }
  if (receivedCrit && untargetedBesideTargetStress !== null) {
    untargetedBesideTargetStress = untargetedBesideTargetStress.map((hero) => ({
      id: hero.id,
      stress: clampStress(hero.stress + 1),
    }));
  }

  return {
    skillId: skill.id,
    targetId: target.id,
    status: "resolved",
    reason: null,
    outcome,
    effect,
    printedAmount,
    damageDealt,
    riposteDamage,
    wounds,
    actorWounds,
    targetDead,
    actorStress,
    targetStress,
    besideActorStress,
    untargetedBesideTargetStress,
    skipped: skippedEffects(skill, keys),
  };
}
