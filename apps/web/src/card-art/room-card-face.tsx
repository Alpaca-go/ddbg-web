import { useState } from "react";
import {
  lookupRoomCardArt,
  roomCardSprite,
  type RoomCardArtEntry,
} from "./resolve-exploration-art";
import { cachedFaceSheetUrl } from "./resolve-card-art";

export function RoomCardFace({
  roomCardId,
  label,
}: {
  readonly roomCardId: string;
  readonly label?: string;
}) {
  const entry = lookupRoomCardArt(roomCardId);
  const caption = label ?? entry?.name ?? roomCardId;
  const [sheetUrl, setSheetUrl] = useState(() => (entry ? cachedFaceSheetUrl(entry, "png") : null));
  const [failed, setFailed] = useState(!entry);

  const className = [
    "card-face",
    "card-face--md",
    "room-card-face",
    failed || !sheetUrl ? "card-face--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    entry && sheetUrl && !failed ? (
      <AtlasCell
        entry={entry}
        sheetUrl={sheetUrl}
        alt={caption}
        onError={() => {
          if (sheetUrl.endsWith(".png")) {
            setSheetUrl(cachedFaceSheetUrl(entry, "jpg"));
            return;
          }
          setFailed(true);
        }}
      />
    ) : (
      <div className="card-face__placeholder" aria-hidden="true">
        <span>无本地卡图</span>
      </div>
    );

  return (
    <figure
      className={className}
      data-testid={`room-card-face-${roomCardId}`}
      data-card-art={failed ? "placeholder" : "cached"}
    >
      {body}
      <figcaption className="card-face__caption">{caption}</figcaption>
    </figure>
  );
}

function AtlasCell({
  entry,
  sheetUrl,
  alt,
  onError,
}: {
  readonly entry: RoomCardArtEntry;
  readonly sheetUrl: string;
  readonly alt: string;
  readonly onError: () => void;
}) {
  const sprite = roomCardSprite(entry);
  return (
    <div
      className="card-face__sprite"
      role="img"
      aria-label={alt}
      style={{
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: sprite.backgroundSize,
        backgroundPosition: sprite.backgroundPosition,
      }}
    >
      <img src={sheetUrl} alt="" className="card-face__probe" onError={onError} />
    </div>
  );
}
