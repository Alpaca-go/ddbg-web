import { needsHeroSkillShuffleChoice, resolveMonsterAttackEffects } from "./hero-skill";
import type { MonsterStanceGroup } from "./monster-stance";
import type { MonsterEffectPlan } from "../../data/src/monster-effects";
import { compileMonsterEffectPlan } from "./monster-effect-plan";
import type {
  HeroSkillCardView,
  HeroSkillResolution,
  SkillActorState,
  SkillCombatState,
  SkillSegment,
  SkillTargetState,
  SkillHealthEffect,
  SkillEffectsResolution,
} from "./hero-skill";

/** 只读规范化怪物技能；不从 footer_lines 推断可用姿态、选招骰表或 AI。 */
export type MonsterSkillView = Pick<
  HeroSkillCardView,
  | "printed_labels"
  | "unlabeled_numbers"
  | "effect_lines"
  | "verified_target_stress"
  | "verified_damage_bonus"
> & {
  readonly slot: number;
  readonly name?: string;
  readonly verified_monster_effects?: MonsterEffectPlan;
  /** 规范化目标优先级文字；缺失时自动目标选择拒绝。 */
  readonly target?: string | null;
  readonly lines: readonly (readonly SkillSegment[])[];
};

export type MonsterCardView = {
  readonly type_position_tags?: readonly string[];
  readonly id: string;
  readonly life: number;
  readonly verification: { readonly unverified: boolean };
  readonly skills: readonly MonsterSkillView[];
  /** 只接收已核实分组；旧卡缺失时选招函数拒绝，不解析 footer_lines。 */
  readonly stanceGroups?: readonly MonsterStanceGroup[];
  /** 只读获批 Speed；缺失不补默认值（R-048）。 */
  readonly speed?: number;
  readonly innateProtection?: boolean;
  readonly resistances?: readonly { readonly key: string | null; readonly naming: string }[];
  readonly immunities?: readonly { readonly key: string | null; readonly naming: string }[];
};

/** 调用方已选定一个英雄目标；英雄 Life / 死门尚未接入。 */
export type MonsterCombatState = Pick<
  SkillCombatState,
  | "target"
  | "untargetedHeroesBesideTarget"
  | "shuffleChoice"
  | "targetAreaLower"
  | "light"
  | "targetsInArea"
  | "ownEffectsApplied"
  | "effectLight"
> & {
  readonly actor: Omit<SkillActorState, "stress" | "form" | "stance"> &
    Pick<SkillTargetState, "shuffleResist">;
  readonly areaDistance: number;
  readonly guardedHeroOmitted?: boolean;
};

export type MonsterSkillResolution = {
  readonly monsterId: string;
  readonly skillSlot: number;
} & (
  | { readonly status: "refused"; readonly reason: string }
  | {
      readonly status: "resolved";
      readonly actorDead: boolean;
      readonly resolution: HeroSkillResolution;
    }
);

/** 与技能结算共享已命名的位移行解析器，不从 null 数字创建选择。 */
export function needsMonsterSkillShuffleChoice(monster: MonsterCardView, slot: number): boolean {
  const skill = monster.skills.find((entry) => entry.slot === slot);
  return (
    skill !== undefined &&
    needsHeroSkillShuffleChoice({
      ...skill,
      id: `${monster.id}:skill${slot}`,
      hero: null,
      verification: monster.verification,
      stats_line: [],
    })
  );
}

function lineKey(line: readonly SkillSegment[]): string {
  return JSON.stringify(
    line.map((segment) =>
      segment.type === "text"
        ? ["text", segment.text]
        : ["icon", segment.icon.key, segment.icon.naming],
    ),
  );
}

/** 排除效果框后复用同一份攻击 / 目标图标视图，移动不另猜版面。 */
export function readMonsterAttackView(
  monster: MonsterCardView,
  skillSlot: number,
):
  | {
      readonly status: "ready";
      readonly view: HeroSkillCardView;
      readonly selfLight?: number;
      readonly targetLight?: number;
    }
  | { readonly status: "refused"; readonly reason: string } {
  const matches = monster.skills.filter((skill) => skill.slot === skillSlot);
  if (matches.length !== 1) return { status: "refused", reason: "怪物卡没有唯一对应的技能编号" };
  const skill = matches[0]!;
  const excluded = new Set<number>();
  for (const effectLine of skill.effect_lines) {
    const key = lineKey(effectLine);
    const indices = skill.lines.flatMap((line, index) => (lineKey(line) === key ? [index] : []));
    if (indices.length !== 1 || excluded.has(indices[0]!))
      return {
        status: "refused",
        reason: "怪物效果行不能唯一对应原始技能行，拒绝猜测版面（R-048）",
      };
    excluded.add(indices[0]!);
  }
  const view: HeroSkillCardView = {
    ...skill,
    id: `${monster.id}:skill${skillSlot}`,
    hero: null,
    verification: monster.verification,
    stats_line: skill.lines.flatMap((line, index) => (excluded.has(index) ? [] : [...line])),
  };
  return skill.verified_monster_effects
    ? compileMonsterEffectPlan(view, skill.verified_monster_effects)
    : { status: "ready", view };
}

/**
 * 规则书 R19–21、§6.5；R-002、R-016、R-017、R-019、R-022、R-024、R-031。
 * 已选怪物技能对一个已选英雄的纯结算。roll 由调用方的种子 RNG 提供。
 * 怪物 lines 包含效果框：逐行核对后移除 effect_lines，避免把效果里的目标图标
 * 当成攻击目标。数字仍只读规范化 numeric；null / 未核实值不补（R-048）。
 * 位移只返回意图。该结果不代表已执行 AI、完整多目标技能或英雄死亡检查。
 */
export function resolveMonsterSkill(
  monster: MonsterCardView,
  skillSlot: number,
  combat: MonsterCombatState,
  roll: number,
): MonsterSkillResolution {
  return resolveMonsterSkillInternal(monster, skillSlot, combat, roll);
}

/** 怪物技能与英雄技能输出同一种有序生命效果；仍保留全部已有拒绝门。 */
export function resolveMonsterSkillEffects(
  monster: MonsterCardView,
  skillSlot: number,
  combat: MonsterCombatState,
  roll: number,
): MonsterSkillResolution & {
  readonly healthEffects: readonly SkillHealthEffect[];
  readonly own?: SkillEffectsResolution;
} {
  const result = resolveMonsterSkillInternal(monster, skillSlot, combat, roll, true);
  return { ...result, healthEffects: result.healthEffects ?? [] };
}

function resolveMonsterSkillInternal(
  monster: MonsterCardView,
  skillSlot: number,
  combat: MonsterCombatState,
  roll: number,
  includeHealthEffects = false,
): MonsterSkillResolution & {
  readonly healthEffects?: readonly SkillHealthEffect[];
  readonly own?: SkillEffectsResolution;
} {
  const refused = (reason: string): MonsterSkillResolution => ({
    monsterId: monster.id,
    skillSlot,
    status: "refused",
    reason,
  });
  if (monster.verification.unverified) return refused("未验证的怪物卡不结算（R-048）");
  if (!Number.isInteger(monster.life) || monster.life < 1) {
    return refused("怪物 Life 必须是规范化卡上的正整数（R-048）");
  }
  if (!Number.isInteger(skillSlot) || skillSlot < 1 || skillSlot > 3) {
    return refused("怪物技能编号必须是 1 到 3 的整数");
  }
  const matches = monster.skills.filter((skill) => skill.slot === skillSlot);
  if (matches.length !== 1) return refused("怪物卡没有唯一对应的技能编号");
  if (combat.actor === undefined || "stress" in combat.actor) {
    return refused("必须提供怪物使用者，怪物没有压力轨");
  }
  if (combat.actor.wounds >= monster.life) return refused("死亡的怪物不能使用技能");
  if (combat.actor.shuffleResist !== undefined && typeof combat.actor.shuffleResist !== "boolean")
    return refused("怪物 Shuffle 抗性必须是已核实的布尔值");
  if (combat.target.side !== "hero" || combat.target.id === combat.actor.id) {
    return refused("当前怪物攻击只结算另一名英雄目标");
  }
  if (combat.areaDistance === undefined) return refused("必须提供已选目标区域的距离");
  if (combat.target.stress === undefined) return refused("必须提供英雄目标的压力");

  const attack = readMonsterAttackView(monster, skillSlot);
  if (attack.status === "refused") return refused(attack.reason);
  const view = attack.view;
  const stats = view.stats_line!;
  if (
    !stats.some(
      (segment) =>
        segment.type === "icon" &&
        segment.icon.key === "damage" &&
        ["confirmed", "confirmed_rulebook"].includes(segment.icon.naming),
    )
  ) {
    return refused("当前怪物攻击需要已命名的 damage，支援与纯状态技能尚未接入（R-048）");
  }
  const effects = resolveMonsterAttackEffects(
    view,
    {
      actor: combat.actor,
      target: combat.target,
      areaDistance: combat.areaDistance,
      targetsInArea: combat.targetsInArea ?? 1,
      ...(combat.light === undefined ? {} : { light: combat.light }),
      ...(combat.ownEffectsApplied ? { ownEffectsApplied: true as const } : {}),
      ...(combat.effectLight === undefined ? {} : { effectLight: combat.effectLight }),
      ...(combat.targetAreaLower === undefined ? {} : { targetAreaLower: combat.targetAreaLower }),
      ...(combat.guardedHeroOmitted === undefined
        ? {}
        : { guardedEnemyOmitted: combat.guardedHeroOmitted }),
      ...(combat.shuffleChoice === undefined ? {} : { shuffleChoice: combat.shuffleChoice }),
      ...(combat.untargetedHeroesBesideTarget === undefined
        ? {}
        : { untargetedHeroesBesideTarget: combat.untargetedHeroesBesideTarget }),
    },
    roll,
  );
  const baseResolution = effects.resolution;
  const resolution =
    baseResolution.status === "refused"
      ? baseResolution
      : {
          ...baseResolution,
          ...(view.verified_target_disease && baseResolution.outcome !== "miss"
            ? { targetDisease: true as const }
            : {}),
          actorLightDelta:
            (baseResolution.actorLightDelta ?? 0) +
            (combat.ownEffectsApplied ? 0 : (attack.selfLight ?? 0)),
          targetLightDelta:
            (baseResolution.targetLightDelta ?? 0) +
            (baseResolution.outcome === "miss" ? 0 : (attack.targetLight ?? 0)),
        };
  if (resolution.status === "refused") return refused(resolution.reason!);
  return {
    monsterId: monster.id,
    skillSlot,
    status: "resolved",
    actorDead: resolution.actorWounds !== null && resolution.actorWounds >= monster.life,
    ...(includeHealthEffects
      ? {
          healthEffects: effects.healthEffects,
          ...(effects.own
            ? {
                own: {
                  ...effects.own,
                  resolution: {
                    ...effects.own.resolution,
                    actorLightDelta:
                      (effects.own.resolution.actorLightDelta ?? 0) + (attack.selfLight ?? 0),
                  },
                },
              }
            : {}),
        }
      : {}),
    // R-020：只有英雄能忽略自身抗性；怪物自身位移仍少移 1。
    resolution:
      combat.actor.shuffleResist && resolution.actorShuffle
        ? {
            ...resolution,
            actorShuffle: {
              ...resolution.actorShuffle,
              distance: Math.max(0, resolution.actorShuffle.distance - 1),
            },
          }
        : resolution,
  };
}
