import { useState } from "react";
import { cachedPrintExplorationUrl, lookupRoomCardArt } from "./resolve-exploration-art";

/**
 * Ruins room card face: Kyries-reviewed print PNG when cached; else placeholder (no TTS atlas).
 */
export function RoomCardFace({
  roomCardId,
  label,
}: {
  readonly roomCardId: string;
  readonly label?: string;
}) {
  const entry = lookupRoomCardArt(roomCardId);
  const caption = label ?? entry?.name ?? roomCardId;
  const [failed, setFailed] = useState(!entry);

  const className = [
    "card-face",
    "card-face--md",
    "room-card-face",
    failed ? "card-face--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    entry && !failed ? (
      <img
        src={cachedPrintExplorationUrl(entry)}
        alt={caption}
        className="card-face__print"
        onError={() => setFailed(true)}
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
      data-card-art={failed ? "placeholder" : "print"}
    >
      {body}
      <figcaption className="card-face__caption">{caption}</figcaption>
    </figure>
  );
}
