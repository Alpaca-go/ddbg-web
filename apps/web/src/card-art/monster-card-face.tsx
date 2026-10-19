import { useState } from "react";
import { cachedFaceSheetUrl } from "./resolve-card-art";
import {
  lookupMonsterFace,
  monsterFaceSprite,
  type MonsterFaceArtEntry,
} from "./resolve-monster-face-art";

type Size = "chip" | "md";

const sizeClass: Record<Size, string> = {
  chip: "monster-card-face--chip",
  md: "monster-card-face--md",
};

/**
 * TTS monster card atlas cell when local cache exists; placeholder + label otherwise.
 */
export function MonsterCardFace({
  monsterCardId,
  label,
  size = "chip",
}: {
  readonly monsterCardId: string;
  readonly label?: string;
  readonly size?: Size;
}) {
  const entry = lookupMonsterFace(monsterCardId);
  const caption = label ?? entry?.name ?? monsterCardId;
  const [sheetUrl, setSheetUrl] = useState(() => (entry ? cachedFaceSheetUrl(entry, "png") : null));
  const [failed, setFailed] = useState(!entry);

  const className = [
    "monster-card-face",
    sizeClass[size],
    failed || !sheetUrl ? "monster-card-face--placeholder" : "",
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
      <div className="monster-card-face__placeholder" aria-hidden="true">
        <span>无卡图</span>
      </div>
    );

  if (size === "chip") {
    return (
      <div
        className={className}
        data-testid={`monster-card-face-${monsterCardId}`}
        data-card-art={failed ? "placeholder" : "cached"}
        role="img"
        aria-label={caption}
      >
        {body}
      </div>
    );
  }

  return (
    <figure
      className={className}
      data-testid={`monster-card-face-${monsterCardId}`}
      data-card-art={failed ? "placeholder" : "cached"}
    >
      {body}
      <figcaption className="monster-card-face__caption">{caption}</figcaption>
    </figure>
  );
}

function AtlasCell({
  entry,
  sheetUrl,
  alt,
  onError,
}: {
  readonly entry: MonsterFaceArtEntry;
  readonly sheetUrl: string;
  readonly alt: string;
  readonly onError: () => void;
}) {
  const sprite = monsterFaceSprite(entry);
  return (
    <div
      className="monster-card-face__sprite"
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
