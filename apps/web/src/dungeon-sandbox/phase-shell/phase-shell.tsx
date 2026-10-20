import type { ReactNode } from "react";
import { FLOW_PHASE_BREADCRUMB, type FlowPhaseId, flowPhaseLabel } from "./flow-phase";

export function PhaseShell({
  phase,
  stepText,
  title,
  subtitle,
  headerExtra,
  player,
  table,
  decks,
  footer,
  children,
}: {
  phase: FlowPhaseId;
  stepText: string;
  title?: string;
  subtitle?: ReactNode;
  headerExtra?: ReactNode;
  player?: ReactNode;
  table?: ReactNode;
  decks?: ReactNode;
  footer?: ReactNode;
  /** 占满桌面网格（如战斗视图） */
  children?: ReactNode;
}) {
  return (
    <main className="shell phase-shell">
      <header className="phase-shell__header">
        {title && (
          <div className="phase-shell__title-block">
            <p className="eyebrow">DDBG · 战役流程</p>
            <h1>{title}</h1>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
        )}
        {headerExtra}
      </header>
      <nav className="phase-breadcrumb" aria-label="战役阶段" data-testid="phase-breadcrumb">
        <ol>
          {FLOW_PHASE_BREADCRUMB.map((item, index) => {
            const current = item.id === phase;
            return (
              <li
                key={item.id}
                data-testid={`phase-crumb-${item.id}`}
                aria-current={current ? "step" : undefined}
                className={
                  current
                    ? "phase-breadcrumb__item phase-breadcrumb__item--current"
                    : "phase-breadcrumb__item"
                }
              >
                <span className="phase-breadcrumb__label">{item.label}</span>
                {index < FLOW_PHASE_BREADCRUMB.length - 1 && (
                  <span className="phase-breadcrumb__sep" aria-hidden="true">
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="phase-step-banner" data-testid="dungeon-checkpoint">
        <span className="phase-step-banner__phase">{flowPhaseLabel(phase)}</span>
        <span className="phase-step-banner__text">{stepText}</span>
      </div>
      {children ?? (
        <div className="phase-desktop">
          <aside className="phase-zone phase-zone--player" aria-label="玩家面前">
            <p className="phase-zone__caption">玩家面前</p>
            {player}
          </aside>
          <section className="phase-zone phase-zone--table" aria-label="桌面中央">
            <p className="phase-zone__caption">桌面中央</p>
            {table}
          </section>
          <aside className="phase-zone phase-zone--decks" aria-label="牌堆与补给区">
            <p className="phase-zone__caption">牌堆区</p>
            {decks}
          </aside>
          {footer && (
            <footer className="phase-zone phase-zone--footer" aria-label="事件与日志">
              {footer}
            </footer>
          )}
        </div>
      )}
    </main>
  );
}
