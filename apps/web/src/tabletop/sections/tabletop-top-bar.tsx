import { QuestThumb } from "../quest-thumb";
import { FLOW_PHASE_BREADCRUMB, flowPhaseLabel, type FlowPhaseId } from "../phase/flow-phase";
import { planForPhase } from "../phase/phase-zone-plan";
import type { TabletopQuestMeta, TabletopBattleMeta } from "../tabletop-types";

export function TabletopTopBar({
  phase,
  stepText,
  quest,
  battle,
  onToggleLog,
  onToggleAtmosphere,
  atmosphereEnabled,
}: {
  readonly phase: FlowPhaseId;
  readonly stepText: string;
  readonly quest: TabletopQuestMeta;
  readonly battle: TabletopBattleMeta;
  readonly onToggleLog: () => void;
  readonly onToggleAtmosphere: () => void;
  readonly atmosphereEnabled: boolean;
}) {
  const plan = planForPhase(phase);

  const locationLine =
    phase === "questSetup"
      ? `战役 · ${quest.actLabel} · 难度（占位）`
      : phase === "hamlet"
        ? `${quest.actLabel} · 准备天数 1–4（占位）`
        : phase === "expeditionPrep"
          ? "2 张任务卡候选（占位）"
          : phase === "questReturn"
            ? `${quest.questLabel} · 完成目标（占位）`
            : `${quest.locationLabel} · ${quest.dungeonLevel} · ${quest.actLabel}`;

  const questTitle =
    phase === "expeditionPrep"
      ? "出征准备"
      : phase === "hamlet"
        ? "Hamlet"
        : phase === "questSetup"
          ? "开局建队"
          : quest.questLabel;

  return (
    <header className="tt-top" data-testid="tabletop-top-bar">
      <div className="tt-top__location">
        <span className="tt-top__eyebrow">{locationLine}</span>
        <strong>{questTitle}</strong>
        {phase === "dungeonExploration" || phase === "battle" ? (
          <span className="muted tt-top__xp">
            任务 {quest.xpProgress} · 已清理 {quest.roomsCleared}/{quest.roomTotal} 房间
          </span>
        ) : (
          <span className="muted tt-top__xp">{plan.topLeft}</span>
        )}
      </div>

      <div className="tt-top__nav-block">
        <nav
          className="tt-phase-nav"
          aria-label="阶段导航（仅显示）"
          data-testid="phase-breadcrumb"
        >
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
        <div className="tt-step-banner" data-testid="dungeon-checkpoint">
          <span className="tt-step-banner__phase">{flowPhaseLabel(phase)}</span>
          <span className="tt-step-banner__text">{stepText}</span>
        </div>
      </div>

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
          <div className="tt-resource muted" style={{ fontSize: "0.65rem" }}>
            补给骰 8/16 · 柴火 2
          </div>
        )}
        {phase === "battle" && (
          <div className="tt-resource">
            <span className="tt-resource__label">回合</span>
            <strong>{battle.round}/4</strong>
          </div>
        )}
        {(phase === "dungeonExploration" || phase === "battle") && (
          <QuestThumb cardId={quest.questCardId} caption={quest.questLabel} />
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
