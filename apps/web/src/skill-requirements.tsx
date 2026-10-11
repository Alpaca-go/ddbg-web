import { heroSkillUsesSelfTarget, readPrintedRange, readPrintedTargets } from "@ddbg/engine";
import type { HeroSkillCardView } from "@ddbg/engine";

/** 只展示引擎已核实的卡面要求，不另行判定所选目标能否出手。 */
export function SkillRequirements({ skill }: { readonly skill: HeroSkillCardView }) {
  const range = readPrintedRange(skill);
  const targets = readPrintedTargets(skill);
  const self = heroSkillUsesSelfTarget(skill);
  const rangeLabel =
    range.kind === "exact"
      ? `区域距离 ${range.distance}`
      : range.kind === "interval"
        ? `区域距离 ${range.min}–${range.max}`
        : "未核实";
  const targetsLabel = self
    ? "自身"
    : targets.kind === "exact"
      ? `同一区域内最多 ${targets.max} 个目标`
      : "未核实";

  return (
    <div className="muted" data-testid="skill-requirements">
      {!self && <p>卡面射程：{rangeLabel}</p>}
      <p>卡面目标：{targetsLabel}</p>
      {!self && (range.kind === "exact" || range.kind === "interval") && (
        <p>目标区域更低时，可额外选择射程上限 +1 的距离。</p>
      )}
      <p>出手仍须满足卡面目标类型、姿态与战斗条件。</p>
    </div>
  );
}
