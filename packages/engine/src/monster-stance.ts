import type { SkillStance } from "./hero-skill";

export type MonsterStanceGroup = {
  readonly stances: readonly SkillStance[];
  readonly unavailable?: true;
} & (
  | { readonly unavailable: true; readonly skill?: never; readonly rollTable?: never }
  | { readonly skill: number; readonly rollTable?: never }
  | {
      readonly skill?: never;
      readonly rollTable: readonly {
        readonly min: number;
        readonly max: number;
        readonly skill: number;
      }[];
    }
);

export type MonsterStanceCardView = {
  readonly verification: { readonly unverified: boolean };
  readonly skills: readonly { readonly slot: number }[];
  readonly stanceGroups?: readonly MonsterStanceGroup[];
};

export type MonsterSkillSelection =
  | { readonly status: "selected"; readonly skillSlot: number; readonly roll: number | null }
  | { readonly status: "needsRoll"; readonly stance: SkillStance }
  | { readonly status: "refused"; readonly reason: string };

const stances: readonly SkillStance[] = ["aggressive", "defensive", "ranged", "support"];
const slotValid = (value: number) => Number.isInteger(value) && value >= 1 && value <= 3;

/**
 * R-015、说明书 §6.2 / §6.10（R17、R22、R24）。只读取已核实的分组，
 * 不解析 footer_lines。大型怪使用两格中优先级较高的姿态。
 * 骰表先返回 needsRoll，由调用方的种子 RNG 提供骰面；固定技能不需要骰。
 */
export function selectMonsterSkill(
  monster: MonsterStanceCardView,
  occupiedStances: readonly SkillStance[],
  roll?: number,
): MonsterSkillSelection {
  const refused = (reason: string): MonsterSkillSelection => ({ status: "refused", reason });
  if (monster.verification.unverified) return refused("未验证的怪物卡不选招（R-048）");
  const groups = monster.stanceGroups;
  if (!groups?.length) return refused("缺少已核实的姿态选招分组（R-015、R-048）");
  const occupied = occupiedStances.map((stance) => stances.indexOf(stance)).sort((a, b) => a - b);
  if (
    occupied.length < 1 ||
    occupied.length > 2 ||
    occupied.some((position) => position < 0) ||
    (occupied.length === 2 && occupied[1] !== occupied[0]! + 1)
  )
    return refused("怪物必须占据一个姿态或相邻的两个姿态（R17）");
  if (roll !== undefined && (!Number.isInteger(roll) || roll < 1 || roll > 10))
    return refused("选招骰必须是 1–10 的整数");

  const seen = new Set<SkillStance>();
  const skillExists = (slot: number) =>
    slotValid(slot) && monster.skills.filter((skill) => skill.slot === slot).length === 1;
  for (const group of groups) {
    const positions = group.stances.map((stance) => stances.indexOf(stance)).sort((a, b) => a - b);
    if (
      !positions.length ||
      positions.some((position) => position < 0) ||
      group.stances.some((stance) => seen.has(stance)) ||
      positions.some((position, i) => i > 0 && position !== positions[i - 1]! + 1)
    )
      return refused("姿态分组必须相邻且不能重复（R-015）");
    group.stances.forEach((stance) => seen.add(stance));
    if (group.unavailable === true) {
      if (group.skill !== undefined || group.rollTable !== undefined)
        return refused("不可选姿态不得同时指定技能或骰表");
      continue;
    }
    if (group.skill !== undefined) {
      if (group.rollTable !== undefined || !skillExists(group.skill))
        return refused("固定选招必须只引用一个卡上唯一存在的技能");
    } else {
      if (!group.rollTable?.length) return refused("选招分组缺少固定技能或骰表（R-048）");
      const faces = new Set<number>();
      for (const row of group.rollTable) {
        if (
          !Number.isInteger(row.min) ||
          !Number.isInteger(row.max) ||
          row.min < 1 ||
          row.max > 10 ||
          row.min > row.max ||
          !skillExists(row.skill)
        )
          return refused("骰表必须使用合法 d10 区间及卡上唯一存在的技能");
        for (let face = row.min; face <= row.max; face++) {
          if (faces.has(face)) return refused("选招骰表区间不能重叠");
          faces.add(face);
        }
      }
      if (faces.size !== 10) return refused("选招骰表必须完整覆盖 1–10，不补默认技能");
    }
  }
  if (seen.size !== 4) return refused("姿态分组必须完整覆盖四种姿态（R-048）");
  const stance = stances[occupied[0]!]!;
  const group = groups.find((entry) => entry.stances.includes(stance))!;
  if (group.unavailable === true) return refused("当前印刷姿态没有可用技能（R-142）");
  if (group.skill !== undefined) return { status: "selected", skillSlot: group.skill, roll: null };
  if (roll === undefined) return { status: "needsRoll", stance };
  const row = group.rollTable!.find((entry) => roll >= entry.min && roll <= entry.max)!;
  return { status: "selected", skillSlot: row.skill, roll };
}
