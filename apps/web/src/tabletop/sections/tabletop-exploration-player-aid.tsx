import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { PROVISION_PLAYER_AID_ID } from "../../card-art/resolve-print-player-aid-art";

/** 桌面侧「探索（Exploration）」玩家辅助卡参考面（AID-Expl / player_aid:p001 BACK）。 */
export function TabletopExplorationPlayerAid({
  size = "sm",
  testId = "tabletop-exploration-player-aid",
}: {
  readonly size?: "sm" | "md";
  readonly testId?: string;
}) {
  return (
    <div className="tt-player-aid-ref" data-testid={testId}>
      <CoreboxPrintCardFace
        deck="player_aid"
        cardId={PROVISION_PLAYER_AID_ID}
        face="back"
        label="探索参考卡"
        size={size}
        testId={`${testId}-face`}
      />
    </div>
  );
}
