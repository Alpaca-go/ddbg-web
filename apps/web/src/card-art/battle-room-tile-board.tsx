import type { ReactNode } from "react";
import { TabletopRasterImage } from "../tabletop/tabletop-raster-image";
import { resolveRoomTileFaceUrl } from "./resolve-print-room-tile-art";

/** 整块战斗区底：单张印刷 room-tile face，内层网格叠在上方（R-048：不裁分区）。 */
export function BattleRoomTileBoard({
  roomTileId,
  tileLabel,
  children,
}: {
  readonly roomTileId?: string;
  readonly tileLabel: string;
  readonly children: ReactNode;
}) {
  const faceUrl = resolveRoomTileFaceUrl(roomTileId);

  return (
    <div className="battle-room-tile-board" data-testid="battle-room-tile-board">
      <div className="battle-room-tile-board__face" aria-hidden="true">
        <TabletopRasterImage
          {...(faceUrl ? { src: faceUrl } : {})}
          label={tileLabel}
          placeholderLabel="无房间板块图"
          assetType="room_tile"
          className="battle-room-tile-board__img"
          testId="battle-room-tile-face"
        />
      </div>
      <div className="area-grid battle-room-tile-board__grid">{children}</div>
    </div>
  );
}
