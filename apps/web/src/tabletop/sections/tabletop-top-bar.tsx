import { QuestThumb } from "../quest-thumb";
import type { TabletopPhase, TabletopQuestMeta, TabletopBattleMeta } from "../tabletop-types";

const PHASES: readonly { readonly id: TabletopPhase; readonly label: string }[] = [
  { id: "roster", label: "开局建队" },
  { id: "hamlet", label: "村庄" },
  { id: "embark", label: "出征准备" },
  { id: "dungeon", label: "地牢探索" },
  { id: "battle", label: "战斗" },
  { id: "return", label: "回村结算" },
];

export function TabletopTopBar({
  phase,
  quest,
  battle,
  onToggleLog,
  onToggleAtmosphere,
  atmosphereEnabled,
}: {
  readonly phase: TabletopPhase;
  readonly quest: TabletopQuestMeta;
  readonly battle: TabletopBattleMeta;
  readonly onToggleLog: () => void;
  readonly onToggleAtmosphere: () => void;
  readonly atmosphereEnabled: boolean;
}) {
  return (
    <header className="tt-top" data-testid="tabletop-top-bar">
      <div className="tt-top__location">
        <span className="tt-top__eyebrow">
          {quest.locationLabel} · {quest.dungeonLevel} · {quest.actLabel}
        </span>
        <strong>{quest.questLabel}</strong>
        <span className="muted tt-top__xp">
          任务 {quest.xpProgress} · 已清理 {quest.roomsCleared}/{quest.roomTotal} 房间
        </span>
      </div>

      <nav className="tt-phase-nav" aria-label="阶段导航（仅显示）">
        <ol>
          {PHASES.map((p) => (
            <li
              key={p.id}
              className={
                p.id === phase
                  ? "tt-phase-nav__item tt-phase-nav__item--active"
                  : "tt-phase-nav__item"
              }
              aria-current={p.id === phase ? "step" : undefined}
            >
              {p.label}
            </li>
          ))}
        </ol>
      </nav>

      <div className="tt-top__resources">
        <div className="tt-resource" data-asset-type="punchboard_token">
          <span className="tt-resource__label">金币</span>
          <strong data-testid="tabletop-gold">{battle.gold}</strong>
        </div>
        <div className="tt-light" aria-label="光照 0–5">
          <span className="tt-resource__label">光照</span>
          <ol className="tt-light__track">
            {[5, 4, 3, 2, 1, 0].map((n) => (
              <li
                key={n}
                className={n === battle.light ? "tt-light__pip tt-light__pip--on" : "tt-light__pip"}
              >
                {n}
              </li>
            ))}
          </ol>
        </div>
        <QuestThumb cardId={quest.questCardId} caption={quest.questLabel} />
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
