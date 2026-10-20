import type { SkillStance } from "@ddbg/engine";

const STANCE_ZH: Record<SkillStance, string> = {
  aggressive: "进攻",
  defensive: "防御",
  ranged: "远程",
  support: "支援",
};

export function stanceLabelZh(stance: SkillStance): string {
  return STANCE_ZH[stance];
}
