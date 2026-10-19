import { useState } from "react";
import {
  cachedPrintExplorationUrl,
  cachedRasterUrl,
  type PrintExplorationArtEntry,
  type RoomTokenArtEntry,
} from "./resolve-exploration-art";

type TtsRasterEntry = Pick<RoomTokenArtEntry, "cacheName">;
type PrintRasterEntry = Pick<PrintExplorationArtEntry, "pngRel">;

function initialUrl(entry: TtsRasterEntry | PrintRasterEntry): string {
  if ("pngRel" in entry && entry.pngRel) {
    return cachedPrintExplorationUrl(entry);
  }
  return cachedRasterUrl((entry as TtsRasterEntry).cacheName, "png");
}

/**
 * Cached raster for exploration UI: print PNG (QuestMap) or TTS cache (room tokens).
 */
export function ExplorationArtImage({
  entry,
  alt,
  className = "",
  testId,
}: {
  readonly entry: TtsRasterEntry | PrintRasterEntry;
  readonly alt: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [url, setUrl] = useState(() => initialUrl(entry));
  const [failed, setFailed] = useState(false);
  const isPrint = "pngRel" in entry && Boolean(entry.pngRel);

  if (failed) {
    return (
      <div
        className={`exploration-art-placeholder ${className}`}
        data-testid={testId}
        data-card-art="placeholder"
        role="img"
        aria-label={alt}
      >
        <span>无本地卡图</span>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      data-testid={testId}
      data-card-art={isPrint ? "print" : "cached"}
      onError={() => {
        if (!isPrint && url.endsWith(".png")) {
          setUrl(cachedRasterUrl((entry as TtsRasterEntry).cacheName, "jpg"));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
