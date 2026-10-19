import { useState } from "react";
import { cachedBattleRasterUrl } from "./resolve-battle-position-art";

/**
 * Raster from gitignored TTS cache (stance color tile or hero token).
 */
export function BattlePositionRaster({
  cacheName,
  alt,
  className = "",
  testId,
}: {
  readonly cacheName: string;
  readonly alt: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [url, setUrl] = useState(() => cachedBattleRasterUrl(cacheName, "png"));
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`battle-position-art-placeholder ${className}`}
        data-testid={testId}
        data-card-art="placeholder"
        role="img"
        aria-label={alt}
      />
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
          setUrl(cachedBattleRasterUrl(cacheName, "jpg"));
          return;
        }
        setFailed(true);
      }}
    />
  );
}
