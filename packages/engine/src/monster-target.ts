import type { SkillStance } from "./hero-skill";

/** 距离由区域图计算；null 明确表示不连通，不是缺值或跨墙距离。 */
export type MonsterTargetHero = {
  readonly id: string;
  readonly areaId?: string;
  readonly stance: SkillStance;
  readonly areaDistance: number | null;
  readonly wounds: number;
  readonly stress: number;
  readonly markStacks: number;
  readonly guard: boolean;
  readonly dead: boolean;
};

export type MonsterTargetCardView = {
  readonly verification: { readonly unverified: boolean };
  readonly skills: readonly {
    readonly slot: number;
    readonly target: string | null;
  }[];
};

export type MonsterTargetSelection =
  | { readonly status: "selected"; readonly targetId: string }
  | { readonly status: "noFiniteTarget" }
  | { readonly status: "refused"; readonly reason: string };

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const priorities = ["Closest", "Furthest", "Most Wounded", "Most Stressed", "Crowded"];

/**
 * 说明书 §6.10（R24）、R-024、R-048。读取规范化 target 文字，确定单目标
 * 攻击的首选英雄；平手按姿态顺序，Guard 优先，够不到也不改选其他英雄。
 * Crowded 按同区存活英雄数，平手按姿态；不掷骰、不移动、不执行攻击。
 * 支援 / 专属优先级尚未接入。
 */
export function selectMonsterTarget(
  monster: MonsterTargetCardView,
  skillSlot: number,
  heroes: readonly MonsterTargetHero[],
): MonsterTargetSelection {
  const refused = (reason: string): MonsterTargetSelection => ({ status: "refused", reason });
  if (monster.verification.unverified) return refused("未验证的怪物卡不选目标（R-048）");
  if (!Number.isInteger(skillSlot) || skillSlot < 1 || skillSlot > 3)
    return refused("怪物技能编号必须是 1 到 3 的整数");
  const skills = monster.skills.filter((entry) => entry.slot === skillSlot);
  if (skills.length !== 1) return refused("怪物卡没有唯一对应的技能编号");
  const text = skills[0]!.target;
  const marked = text?.startsWith("Marked -> ") ?? false;
  const priority = marked ? text!.slice("Marked -> ".length) : text;
  if (priority === null || !priorities.includes(priority))
    return refused("目标优先级未核实或尚不支持，拒绝猜测（R-048）");

  if (heroes.some((hero) => typeof hero.dead !== "boolean"))
    return refused("必须提供已核实的英雄死亡标记");
  const living = heroes.filter((hero) => !hero.dead);
  if (!living.length) return refused("没有存活英雄目标");
  if (priority === "Crowded" && living.some((hero) => !hero.areaId))
    return refused("Crowded 需要已核实的英雄区域（R-048）");
  if (
    new Set(living.map((hero) => hero.id)).size !== living.length ||
    new Set(living.map((hero) => hero.stance)).size !== living.length ||
    living.some(
      (hero) =>
        !hero.id ||
        !stances.includes(hero.stance) ||
        (hero.areaDistance !== null &&
          (!Number.isInteger(hero.areaDistance) || hero.areaDistance < 0)) ||
        !Number.isInteger(hero.wounds) ||
        hero.wounds < 0 ||
        !Number.isInteger(hero.stress) ||
        hero.stress < 0 ||
        hero.stress > 10 ||
        !Number.isInteger(hero.markStacks) ||
        hero.markStacks < 0 ||
        typeof hero.guard !== "boolean",
    )
  )
    return refused("英雄目标需要唯一 ID / 姿态及已核实的距离、伤口、压力、Mark、Guard");

  const guarded = living.filter((hero) => hero.guard);
  let candidates = guarded.length ? guarded : living;
  const markedHeroes = candidates.filter((hero) => hero.markStacks > 0);
  if (guarded.length) {
    // R-024：多名 Guard 直接按姿态顺序，不再用技能优先级排序。
  } else if (marked && markedHeroes.length) {
    // A -> B：找到 A 就按姿态选；只有没有 A 时才使用 B。
    candidates = markedHeroes;
  } else {
    // R-023 补充：仅 Closest / Furthest 排除不连通英雄，Guard / Mark 不换人。
    if (priority === "Closest" || priority === "Furthest") {
      candidates = candidates.filter((hero) => hero.areaDistance !== null);
      if (!candidates.length) return { status: "noFiniteTarget" };
    }
    const score = (hero: MonsterTargetHero): number => {
      switch (priority) {
        case "Closest":
          return -hero.areaDistance!;
        case "Furthest":
          return hero.areaDistance!;
        case "Most Wounded":
          return hero.wounds;
        case "Crowded":
          return living.filter((other) => other.areaId === hero.areaId).length;
        default:
          return hero.stress;
      }
    };
    const best = Math.max(...candidates.map(score));
    candidates = candidates.filter((hero) => score(hero) === best);
  }
  const selected = [...candidates].sort(
    (a, b) => stances.indexOf(a.stance) - stances.indexOf(b.stance),
  )[0]!;
  return { status: "selected", targetId: selected.id };
}
