import { useState } from "react";
import {
  cachedRasterUrl,
  type QuestMapArtEntry,
  type RoomTokenArtEntry,
} from "./resolve-exploration-art";

type RasterEntry = Pick<QuestMapArtEntry | RoomTokenArtEntry, "cacheName">;

/**
 * Full-bleed TTS image (quest map page or room token) from gitignored cache.
 */
export function ExplorationArtImage({
  entry,
  alt,
  className = "",
  testId,
}: {
  readonly entry: RasterEntry;
  readonly alt: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [url, setUrl] = useState(() => cachedRasterUrl(entry.cacheName, "png"));
  const [failed, setFailed] = useState(false);

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
      data-card-art="cached"
      onError={() => {
        if (url.endsWith(".png")) {
          setUrl(cachedRasterUrl(entry.cacheName, "jpg"));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
