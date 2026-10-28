import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { ROOMS_PLAYER_AID_ID } from "../../card-art/resolve-print-player-aid-art";

/** 桌面侧「房间（Rooms）」玩家辅助卡参考面（AID-Rooms / player_aid:p005 FRONT）。 */
export function TabletopRoomsPlayerAid({
  size = "sm",
  testId = "tabletop-rooms-player-aid",
}: {
  readonly size?: "sm" | "md";
  readonly testId?: string;
}) {
  return (
    <div className="tt-player-aid-ref" data-testid={testId}>
      <CoreboxPrintCardFace
        deck="player_aid"
        cardId={ROOMS_PLAYER_AID_ID}
        face="front"
        label="房间参考卡"
        size={size}
        testId={`${testId}-face`}
      />
    </div>
  );
}
