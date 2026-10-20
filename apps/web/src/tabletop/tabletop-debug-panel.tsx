import { FLOW_PHASE_BREADCRUMB, type FlowPhaseId } from "./phase/flow-phase";
import { DebugDrawer } from "./phase/debug-drawer";

export function TabletopDebugPanel({
  demoPhaseOverride,
  onSetDemoPhase,
  defaultPhase,
}: {
  readonly demoPhaseOverride: FlowPhaseId | null;
  readonly defaultPhase: FlowPhaseId;
  readonly onSetDemoPhase: (phase: FlowPhaseId | null) => void;
}) {
  const effective = demoPhaseOverride ?? defaultPhase;

  return (
    <DebugDrawer>
      <p className="muted">mock 阶段切换（仅 `?view=tabletop` 演示，不接命令）</p>
      <label className="tt-debug-field">
        演示阶段
        <select
          data-testid="tabletop-demo-phase"
          value={demoPhaseOverride ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onSetDemoPhase(v ? (v as FlowPhaseId) : null);
          }}
        >
          <option value="">跟随默认（{defaultPhase}）</option>
          {FLOW_PHASE_BREADCRUMB.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <p className="muted" data-testid="tabletop-effective-phase">
        当前有效阶段：{effective}
      </p>
      <p className="muted">
        引擎桥接：`engineBridge.game` 为 null 时使用 mock；接存档后由 `resolveFlowPhase` 驱动。
      </p>
    </DebugDrawer>
  );
}
