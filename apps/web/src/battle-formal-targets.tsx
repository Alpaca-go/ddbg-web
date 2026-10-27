import type { BattleState, HeroSkillCardView } from "@ddbg/engine";
import { printedAreaRangeReach, printedAreaRangeReachLabel } from "./battle-spatial-display";

type BattleEntity = BattleState["entities"][number];

export function BattleFormalSingleTarget({
  battle,
  actor,
  skill,
  entities,
  selectedTargetId,
  onSelect,
  entityName,
}: {
  readonly battle: BattleState;
  readonly actor: BattleEntity;
  readonly skill: HeroSkillCardView;
  readonly entities: readonly BattleEntity[];
  readonly selectedTargetId: string;
  readonly onSelect: (id: string) => void;
  readonly entityName: (id: string) => string;
}) {
  return (
    <div className="tt-battle-targets" role="radiogroup" aria-label="技能目标">
      <p className="muted tt-battle-targets__hint">
        绿框=卡面区域距离可达；红框=超出卡面射程。出手仍须满足姿态与目标类型。
      </p>
      {entities.map((entity) => {
        const reach = printedAreaRangeReach(skill, actor.areaId, entity.areaId, battle.areas);
        const selected = selectedTargetId === entity.id;
        return (
          <label
            key={entity.id}
            className={[
              "tt-battle-target",
              `tt-battle-target--${reach}`,
              selected ? "tt-battle-target--selected" : "",
              entity.side,
            ].join(" ")}
            data-testid={`formal-target-${entity.id}`}
            data-range-reach={reach}
          >
            <input
              type="radio"
              name="formal-skill-target"
              checked={selected}
              onChange={() => onSelect(entity.id)}
              aria-label={`${entityName(entity.id)}，${printedAreaRangeReachLabel(reach)}`}
            />
            <span className="tt-battle-target__name">{entityName(entity.id)}</span>
            <span className="tt-battle-target__meta muted">
              区 {entity.areaId} · 伤口 {entity.wounds}/{entity.life}
            </span>
            <span className="tt-battle-target__reach">{printedAreaRangeReachLabel(reach)}</span>
          </label>
        );
      })}
    </div>
  );
}

export function BattleFormalMultiTargetBadge({
  battle,
  actor,
  skill,
  entity,
}: {
  readonly battle: BattleState;
  readonly actor: BattleEntity;
  readonly skill: HeroSkillCardView;
  readonly entity: BattleEntity;
}) {
  const reach = printedAreaRangeReach(skill, actor.areaId, entity.areaId, battle.areas);
  return (
    <span
      className={`tt-battle-target__reach tt-battle-target__reach--inline tt-battle-target--${reach}`}
    >
      {printedAreaRangeReachLabel(reach)}
    </span>
  );
}
