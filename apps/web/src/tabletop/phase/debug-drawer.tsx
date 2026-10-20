import { useState, type ReactNode } from "react";

/** 默认收起；控件保持在 DOM 中供 e2e 与键盘访问（不放在 closed &lt;details&gt; 内）。 */
export function DebugDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="tt-debug-drawer" data-testid="debug-drawer">
      <button
        type="button"
        className="tt-debug-drawer__summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        调试选项{open ? "（收起）" : ""}
      </button>
      <div
        className={
          open ? "tt-debug-drawer__body" : "tt-debug-drawer__body tt-debug-drawer__body--collapsed"
        }
        hidden={false}
      >
        {children}
      </div>
    </section>
  );
}
