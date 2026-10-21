import { QuestThumb } from "../quest-thumb";
import { FLOW_PHASE_BREADCRUMB, flowPhaseLabel, type FlowPhaseId } from "../phase/flow-phase";
import type { TabletopQuestMeta, TabletopBattleMeta } from "../tabletop-types";

function phaseContextLine(phase: FlowPhaseId, quest: TabletopQuestMeta, stepText: string): string {
  const phaseName = flowPhaseLabel(phase);
  switch (phase) {
    case "questSetup":
      return `${phaseName} · 战役 ${quest.actLabel} · 难度（占位） · ${stepText}`;
    case "hamlet":
      return `${phaseName} · ${quest.actLabel} · 准备天数 1–4（占位） · ${stepText}`;
    case "expeditionPrep":
      return `${phaseName} · 任务候选 ×2（占位） · ${stepText}`;
    case "questReturn":
      return `${phaseName} · ${quest.questLabel} · ${stepText}`;
    case "dungeonExploration":
      return `${phaseName} · ${quest.locationLabel} · ${quest.dungeonLevel} · ${quest.questLabel} · ${quest.xpProgress} · ${stepText}`;
    case "battle":
      return `${phaseName} · ${quest.locationLabel} · DL · 任务 ${quest.xpProgress} · 已清理 ${quest.roomsCleared}/${quest.roomTotal} · ${stepText}`;
    default:
      return `${phaseName} · ${stepText}`;
  }
}

export function TabletopTopBar({
  phase,
  stepText,
  quest,
  battle,
  explorationObjective,
  onToggleLog,
  onToggleAtmosphere,
  atmosphereEnabled,
  onSelectQuest,
  questDetailSelected,
}: {
  readonly phase: FlowPhaseId;
  readonly stepText: string;
  readonly quest: TabletopQuestMeta;
  readonly battle: TabletopBattleMeta;
  readonly explorationObjective?: string | null;
  readonly onToggleLog: () => void;
  readonly onToggleAtmosphere: () => void;
  readonly atmosphereEnabled: boolean;
  readonly onSelectQuest?: () => void;
  readonly questDetailSelected?: boolean;
}) {
  const contextLine = phaseContextLine(phase, quest, stepText);

  return (
    <header className="tt-top" data-testid="tabletop-top-bar">
      <p className="tt-top__context" data-testid="tabletop-flow-step" title={contextLine}>
        {contextLine}
      </p>

      <nav className="tt-phase-nav" aria-label="阶段导航（仅显示）" data-testid="phase-breadcrumb">
        <ol>
          {FLOW_PHASE_BREADCRUMB.map((item, index) => {
            const current = item.id === phase;
            return (
              <li
                key={item.id}
                data-testid={`phase-crumb-${item.id}`}
                aria-current={current ? "step" : undefined}
                className={
                  current ? "tt-phase-nav__item tt-phase-nav__item--active" : "tt-phase-nav__item"
                }
              >
                {item.label}
                {index < FLOW_PHASE_BREADCRUMB.length - 1 && (
                  <span className="tt-phase-nav__sep" aria-hidden="true">
                    ›
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="tt-top__resources">
        <div className="tt-resource" data-asset-type="punchboard_token">
          <span className="tt-resource__label">金币</span>
          <strong data-testid="tabletop-gold">{battle.gold}</strong>
        </div>
        {(phase === "dungeonExploration" || phase === "battle") && (
          <div className="tt-light" aria-label="光照 0–5">
            <span className="tt-resource__label">光照</span>
            <ol className="tt-light__track">
              {[5, 4, 3, 2, 1, 0].map((n) => (
                <li
                  key={n}
                  className={
                    n === battle.light ? "tt-light__pip tt-light__pip--on" : "tt-light__pip"
                  }
                >
                  {n}
                </li>
              ))}
            </ol>
          </div>
        )}
        {phase === "hamlet" && (
          <div className="tt-resource" data-asset-type="punchboard_token">
            <span className="tt-resource__label">驿站 XP</span>
            <strong>—</strong>
          </div>
        )}
        {phase === "expeditionPrep" && (
          <div className="tt-resource muted tt-top__resource-note">补给骰 8/16 · 柴火 2</div>
        )}
        {phase === "battle" && (
          <div className="tt-resource">
            <span className="tt-resource__label">回合</span>
            <strong>{battle.round}/4</strong>
          </div>
        )}
        {phase === "dungeonExploration" && explorationObjective && (
          <div className="tt-resource tt-top__quest-progress" data-testid="tabletop-quest-progress">
            <span className="tt-resource__label">任务进度</span>
            <strong title={explorationObjective}>{explorationObjective}</strong>
          </div>
        )}
        {(phase === "dungeonExploration" || phase === "battle") && (
          <QuestThumb
            cardId={quest.questCardId}
            caption={quest.questLabel}
            {...(onSelectQuest ? { onSelect: onSelectQuest, selected: questDetailSelected } : {})}
          />
        )}
        <button type="button" className="tt-top__btn" onClick={onToggleLog}>
          日志
        </button>
        <button
          type="button"
          className="tt-top__btn"
          onClick={onToggleAtmosphere}
          title="V-06：切换木桌烛光氛围（纯 CSS）"
        >
          氛围{atmosphereEnabled ? "开" : "关"}
        </button>
      </div>
    </header>
  );
}
