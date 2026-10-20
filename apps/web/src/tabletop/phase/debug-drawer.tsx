import { useState, type ReactNode } from "react";

/** 默认收起；展开时才挂载子节点，避免占位挤入五区网格。 */
export function DebugDrawer({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <section
      className="tt-debug-drawer"
      data-testid="debug-drawer"
      data-open={open ? "true" : "false"}
    >
      <button
        type="button"
        className="tt-debug-drawer__summary"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        调试选项{open ? "（收起）" : ""}
      </button>
      {open ? (
        <div className="tt-debug-drawer__body" data-testid="debug-drawer-body">
          {children}
        </div>
      ) : null}
    </section>
  );
}
