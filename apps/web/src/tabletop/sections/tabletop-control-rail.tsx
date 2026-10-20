import { AssetPlaceholder } from "../asset-placeholder";
import type { TabletopMockDice } from "../tabletop-types";

export function TabletopControlRail({
  mockDice,
  canConfirm,
  onConfirm,
  onDrawInitiative,
}: {
  readonly mockDice: TabletopMockDice | null;
  readonly canConfirm: boolean;
  readonly onConfirm: () => void;
  readonly onDrawInitiative: () => void;
}) {
  return (
    <aside className="tt-controls" aria-label="骰子与确认" data-testid="tabletop-controls">
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
    </aside>
  );
}
