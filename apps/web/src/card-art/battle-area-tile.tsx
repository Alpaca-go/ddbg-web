import type { ReactNode } from "react";

/** 战斗区网格单格：透明叠在整面 tile 底图上，仅角标编号 + 元数据/单位列表。 */
export function BattleAreaCell({
  areaId,
  className = "",
  active,
  choice,
  testId,
  children,
}: {
  readonly areaId: string;
  readonly className?: string;
  readonly active?: boolean;
  readonly choice?: boolean;
  readonly testId?: string;
  readonly children: ReactNode;
}) {
  return (
    <article
      className={[
        "battle-area-cell",
        "area",
        active ? "active-area" : "",
        choice ? "choice-area" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
    >
      <span className="battle-area-cell__badge" aria-hidden="true">
        {areaId}
      </span>
      <div className="battle-area-cell__body">{children}</div>
    </article>
  );
}
