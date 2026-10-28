import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { ROOMS_PLAYER_AID_ID } from "../../card-art/resolve-print-player-aid-art";

/** 桌面侧「状态（Conditions）」玩家辅助卡参考面（AID-Cond / player_aid:p005 BACK）。 */
export function TabletopConditionsPlayerAid({
  size = "sm",
  testId = "tabletop-conditions-player-aid",
}: {
  readonly size?: "sm" | "md";
  readonly testId?: string;
}) {
  return (
    <div className="tt-player-aid-ref" data-testid={testId}>
      <CoreboxPrintCardFace
        deck="player_aid"
        cardId={ROOMS_PLAYER_AID_ID}
        face="back"
        label="状态参考卡"
        size={size}
        testId={`${testId}-face`}
      />
    </div>
  );
}
