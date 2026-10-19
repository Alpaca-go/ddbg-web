import { useState } from "react";
import { cachedFaceSheetUrl } from "./resolve-card-art";
import { lookupPrintMonsterFace, cachedPrintMonsterUrl } from "./resolve-print-monster-art";
import { lookupMonsterTtsFace, monsterTtsFaceSprite } from "./resolve-monster-tts-face-art";

type Size = "chip" | "md";

const sizeClass: Record<Size, string> = {
  chip: "monster-card-face--chip",
  md: "monster-card-face--md",
};

type DisplayMode = "print" | "tts" | "placeholder";

/**
 * Monster card face: reviewed print PNG when cached; else TTS atlas (#252); else placeholder.
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
  const printEntry = lookupPrintMonsterFace(monsterCardId);
  const ttsEntry = lookupMonsterTtsFace(monsterCardId);
  const caption = label ?? printEntry?.name ?? ttsEntry?.name ?? monsterCardId;

  const [mode, setMode] = useState<DisplayMode>(() =>
    printEntry ? "print" : ttsEntry ? "tts" : "placeholder",
  );
  const [ttsSheetUrl, setTtsSheetUrl] = useState(() =>
    ttsEntry ? cachedFaceSheetUrl(ttsEntry, "png") : null,
  );

  const failed = mode === "placeholder";
  const className = [
    "monster-card-face",
    sizeClass[size],
    failed ? "monster-card-face--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    mode === "print" && printEntry ? (
      <img
        src={cachedPrintMonsterUrl(printEntry)}
        alt={caption}
        className="monster-card-face__print"
        onError={() => {
          if (ttsEntry) {
            setMode("tts");
            setTtsSheetUrl(cachedFaceSheetUrl(ttsEntry, "png"));
            return;
          }
          setMode("placeholder");
        }}
      />
    ) : mode === "tts" && ttsEntry && ttsSheetUrl ? (
      <TtsAtlasCell
        entry={ttsEntry}
        sheetUrl={ttsSheetUrl}
        alt={caption}
        onError={() => {
          if (ttsSheetUrl.endsWith(".png")) {
            setTtsSheetUrl(cachedFaceSheetUrl(ttsEntry, "jpg"));
            return;
          }
          setMode("placeholder");
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
        data-card-art={failed ? "placeholder" : mode}
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
      data-card-art={failed ? "placeholder" : mode}
    >
      {body}
      <figcaption className="monster-card-face__caption">{caption}</figcaption>
    </figure>
  );
}

function TtsAtlasCell({
  entry,
  sheetUrl,
  alt,
  onError,
}: {
  readonly entry: NonNullable<ReturnType<typeof lookupMonsterTtsFace>>;
  readonly sheetUrl: string;
  readonly alt: string;
  readonly onError: () => void;
}) {
  const sprite = monsterTtsFaceSprite(entry);
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
