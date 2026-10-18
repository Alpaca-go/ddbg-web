import { useState } from "react";
import {
  atlasBackgroundPosition,
  atlasBackgroundSize,
  cachedFaceSheetUrl,
  lookupHeroSkillFace,
  type CardArtEntry,
} from "./resolve-card-art";

type Size = "sm" | "md";

const sizeClass: Record<Size, string> = {
  sm: "card-face--sm",
  md: "card-face--md",
};

/**
 * Show a TTS atlas cell when the gitignored local cache resolves;
 * otherwise a clear placeholder plus the skill label (text always kept).
 */
export function CardFace({
  skillId,
  label,
  size = "md",
  selected = false,
  onSelect,
}: {
  readonly skillId: string;
  readonly label?: string;
  readonly size?: Size;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
}) {
  const entry = lookupHeroSkillFace(skillId);
  const caption =
    label ?? (entry ? `${entry.name} ${["I", "II", "III"][entry.level - 1]}` : skillId);
  const [sheetUrl, setSheetUrl] = useState(() => (entry ? cachedFaceSheetUrl(entry, "png") : null));
  const [failed, setFailed] = useState(!entry);

  const className = [
    "card-face",
    sizeClass[size],
    selected ? "card-face--selected" : "",
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

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        data-testid={`card-face-${skillId}`}
        data-card-art={failed ? "placeholder" : "cached"}
        aria-pressed={selected}
        aria-label={caption}
        onClick={onSelect}
      >
        {body}
        <span className="card-face__caption">{caption}</span>
      </button>
    );
  }

  return (
    <figure
      className={className}
      data-testid={`card-face-${skillId}`}
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
  readonly entry: CardArtEntry;
  readonly sheetUrl: string;
  readonly alt: string;
  readonly onError: () => void;
}) {
  // Hidden img probes cache availability; visible face is a CSS sprite crop.
  return (
    <div
      className="card-face__sprite"
      role="img"
      aria-label={alt}
      style={{
        backgroundImage: `url(${sheetUrl})`,
        backgroundSize: atlasBackgroundSize(entry),
        backgroundPosition: atlasBackgroundPosition(entry),
      }}
    >
      <img src={sheetUrl} alt="" className="card-face__probe" onError={onError} />
    </div>
  );
}
