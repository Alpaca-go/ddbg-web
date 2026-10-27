import { useState, type ReactNode } from "react";
import { TabletopRasterImage } from "../tabletop/tabletop-raster-image";
import { resolveRoomTileAreaArtSources } from "./resolve-print-room-tile-art";

/**
 * Battle adjacency cell: print room-tile raster under a letter badge (same stack as formal room map picks).
 */
export function BattleAreaTile({
  areaId,
  roomTileId,
  className = "",
  active,
  choice,
  testId,
  children,
}: {
  readonly areaId: string;
  readonly roomTileId?: string;
  readonly className?: string;
  readonly active?: boolean;
  readonly choice?: boolean;
  readonly testId?: string;
  readonly children: ReactNode;
}) {
  const sources = resolveRoomTileAreaArtSources(roomTileId, areaId);
  const [useFaceFallback, setUseFaceFallback] = useState(false);
  const src =
    !useFaceFallback && sources.areaUrl ? sources.areaUrl : (sources.faceUrl ?? sources.areaUrl);
  const placeholderLabel = roomTileId ? `区域 ${areaId}` : `区域 ${areaId} · 无板块图`;

  return (
    <article
      className={[
        "battle-area-tile",
        "area",
        active ? "active-area" : "",
        choice ? "choice-area" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      data-testid={testId}
    >
      <div className="battle-area-tile__plate">
        <TabletopRasterImage
          key={src ?? "missing"}
          {...(src ? { src } : {})}
          label={`${areaId} 区域`}
          placeholderLabel={placeholderLabel}
          assetType="room_tile"
          className="battle-area-tile__img"
          {...(testId ? { testId: `${testId}-art` } : {})}
          onLoadError={() => {
            if (!useFaceFallback && sources.faceUrl && src === sources.areaUrl) {
              setUseFaceFallback(true);
            }
          }}
        />
        <span className="battle-area-tile__badge" aria-hidden="true">
          {areaId}
        </span>
      </div>
      <div className="battle-area-tile__meta">{children}</div>
    </article>
  );
}
