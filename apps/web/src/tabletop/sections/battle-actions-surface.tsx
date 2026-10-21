import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTabletopFormalUi } from "../tabletop-formal-ui-context";

const tabs = [
  ["skills", "技能"],
  ["move", "移动"],
  ["stance", "换姿态"],
  ["loot", "战利品"],
  ["provisions", "补给"],
] as const;
type Tab = (typeof tabs)[number][0];

/** 控件仍由 BattleView 持有，仅将正式流程的表现放入底栏。 */
export function BattleActionsSurface({
  formal,
  actorKey,
  heroTurn,
  caption,
  children,
}: {
  readonly formal: boolean;
  readonly actorKey: string;
  readonly heroTurn: boolean;
  readonly caption: string;
  readonly children: ReactNode;
}) {
  const ui = useTabletopFormalUi();
  const [selection, setSelection] = useState<{ actorKey: string; tab: Tab } | null>(null);
  const tab = selection?.actorKey === actorKey ? selection.tab : heroTurn ? "skills" : "provisions";
  if (!formal)
    return (
      <aside className="panel actions" aria-label="行动面板">
        {children}
      </aside>
    );
  if (!ui?.battleActionHost) return null;
  return createPortal(
    <aside className="actions tt-battle-actions" aria-label="行动面板" data-active-tab={tab}>
      <div className="tt-battle-actions__header">
        <strong>{caption}</strong>
        <div role="tablist" aria-label="战斗行动分页">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              id={`battle-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="battle-action-panel"
              tabIndex={tab === id ? 0 : -1}
              disabled={!heroTurn && id !== "provisions"}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                event.preventDefault();
                const buttons = [
                  ...event.currentTarget.parentElement!.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ),
                ];
                const offset = event.key === "ArrowRight" ? 1 : -1;
                const next =
                  buttons[
                    (buttons.indexOf(event.currentTarget) + offset + buttons.length) %
                      buttons.length
                  ]!;
                next.focus();
                next.click();
              }}
              onClick={() => setSelection({ actorKey, tab: id })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div
        id="battle-action-panel"
        className="tt-battle-actions__body"
        role="tabpanel"
        aria-labelledby={`battle-tab-${tab}`}
      >
        {children}
      </div>
    </aside>,
    ui.battleActionHost,
  );
}
