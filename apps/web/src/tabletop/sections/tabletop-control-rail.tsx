import { AssetPlaceholder } from "../asset-placeholder";
import type { FlowPhaseId } from "../phase/flow-phase";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type { TabletopMockDice } from "../tabletop-types";

export function TabletopControlRail({
  phase,
  diceCaption,
  primaryActionLabel,
  mockDice,
  canConfirm,
  onConfirm,
  onDrawInitiative,
}: {
  readonly phase: FlowPhaseId;
  readonly diceCaption: string | null;
  readonly primaryActionLabel: string | null;
  readonly mockDice: TabletopMockDice | null;
  readonly canConfirm: boolean;
  readonly onConfirm: () => void;
  readonly onDrawInitiative: () => void;
}) {
  const showBattleControls = phase === "battle";

  return (
    <aside
      className="tt-controls tt-phase-surface"
      aria-label="骰子与确认"
      data-testid="tabletop-controls"
    >
      {diceCaption === null && !showBattleControls && (
        <PhasePlaceholder label="本阶段不显示掷骰托盘" testId="tabletop-dice-phase-ph" />
      )}
      {diceCaption !== null && !showBattleControls && (
        <PhasePlaceholder label={diceCaption} testId="tabletop-dice-phase-ph" />
      )}
      {showBattleControls && (
        <>
          <div className="tt-dice-tray" data-testid="tabletop-dice-tray" data-asset-type="dice_net">
            <h4>掷骰托盘</h4>
            {mockDice ? (
              <p className="tt-dice-result">{mockDice.label}</p>
            ) : (
              <AssetPlaceholder assetType="dice_net" label="d10（战斗技能）" />
            )}
          </div>
          <button
            type="button"
            className="tt-confirm"
            disabled={!canConfirm}
            onClick={onConfirm}
            data-testid="tabletop-confirm-action"
          >
            确认使用
          </button>
          <button
            type="button"
            className="tt-draw-init"
            onClick={onDrawInitiative}
            data-testid="tabletop-draw-initiative"
            title="V-01 待确认：替代 End Turn"
          >
            抽下一张先攻
          </button>
        </>
      )}
      {primaryActionLabel && !showBattleControls && (
        <button type="button" className="tt-draw-init tt-draw-init--phase" disabled>
          {primaryActionLabel}
          {phase === "hamlet" ? "（待确认）" : ""}
        </button>
      )}
    </aside>
  );
}
