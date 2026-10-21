import type { GameState } from "@ddbg/engine";
import {
  adaptGameStateToTabletopWorld as adaptWorld,
  type TabletopWorldAdaptation,
} from "./adapt-game-state-to-tabletop-world";
import { dungeonFlowStep } from "./dungeon-flow-step";
import { resolveFlowPhase, type FlowPhaseId } from "./flow-phase";

export type { TabletopWorldAdaptation };
export { adaptWorld as adaptGameStateToTabletopWorld };

/** 将正式 `GameState` 接入桌面原型的只读桥（T1：阶段与步骤文案；世界数据后续 PR 填充）。 */
export type TabletopEngineBridge = {
  readonly game: GameState | null;
  readonly questSetupActive?: boolean;
  readonly preEmbarkPhase?: FlowPhaseId;
};

export function resolveEffectiveFlowPhase(
  bridge: TabletopEngineBridge,
  demoPhaseOverride: FlowPhaseId | null,
  mockDefaultPhase: FlowPhaseId,
): FlowPhaseId {
  if (demoPhaseOverride) return demoPhaseOverride;
  if (bridge.preEmbarkPhase) return bridge.preEmbarkPhase;
  if (bridge.questSetupActive) return "questSetup";
  if (bridge.game) return resolveFlowPhase({ game: bridge.game });
  return mockDefaultPhase;
}

export function resolveFlowStepText(
  bridge: TabletopEngineBridge,
  demoPhaseOverride: FlowPhaseId | null,
  effectivePhase: FlowPhaseId,
): string {
  if (bridge.preEmbarkPhase === "expeditionPrep" && !demoPhaseOverride) {
    return "选定任务卡并掷开局补给骰，完成后进入遗迹探索";
  }
  if (bridge.questSetupActive && !demoPhaseOverride) {
    return "选择模式与种子，为四名英雄选技能后前往出征准备";
  }
  if (bridge.game && !demoPhaseOverride) {
    return dungeonFlowStep(bridge.game);
  }
  if (demoPhaseOverride) {
    return `（mock 演示）当前阶段：${demoPhaseOverride} · 未接引擎存档`;
  }
  if (effectivePhase === "battle") {
    return "（mock）战斗原型 · 选技能 → 确认展示写死骰子";
  }
  return `（mock）${effectivePhase} 阶段占位 · 步骤文案将接 dungeonFlowStep(game)`;
}
