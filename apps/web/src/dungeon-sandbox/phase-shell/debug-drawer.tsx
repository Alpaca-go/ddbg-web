import type { ReactNode } from "react";

export function DebugDrawer({ children }: { children: ReactNode }) {
  return (
    <details className="debug-drawer" data-testid="debug-drawer">
      <summary className="debug-drawer__summary">调试选项</summary>
      <div className="debug-drawer__body panel">{children}</div>
    </details>
  );
}
