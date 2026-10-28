import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { PROVISION_PLAYER_AID_ID } from "../../card-art/resolve-print-player-aid-art";

/** 桌面侧「补给（Provisions）」玩家辅助卡参考面（AID-Prov / player_aid:p001 FRONT）。 */
export function TabletopProvisionPlayerAid({
  size = "sm",
  testId = "tabletop-provision-player-aid",
}: {
  readonly size?: "sm" | "md";
  readonly testId?: string;
}) {
  return (
    <div className="tt-player-aid-ref" data-testid={testId}>
      <CoreboxPrintCardFace
        deck="player_aid"
        cardId={PROVISION_PLAYER_AID_ID}
        face="front"
        label="补给参考卡"
        size={size}
        testId={`${testId}-face`}
      />
    </div>
  );
}
