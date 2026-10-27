import type { ReactNode } from "react";

/** 逻辑区域格：叠在整面 tile 上，无字母/格线；仅状态高亮与区内文案/单位列表。 */
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
      aria-label={`区域 ${areaId}`}
    >
      {children}
    </article>
  );
}
