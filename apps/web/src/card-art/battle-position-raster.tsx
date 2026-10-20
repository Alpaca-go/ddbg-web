import { useState } from "react";
import {
  cachedPrintHeroStandeeUrl,
  type HeroStandeeArtEntry,
} from "./resolve-print-hero-standee-art";

/**
 * Raster from gitignored print cache (DH punchboard hero standee).
 */
export function BattlePositionRaster({
  standee,
  alt,
  className = "",
  testId,
}: {
  readonly standee: HeroStandeeArtEntry;
  readonly alt: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = cachedPrintHeroStandeeUrl(standee);

  if (failed) {
    return (
      <div
        className={`battle-position-art-placeholder ${className}`}
        data-testid={testId}
        data-card-art="placeholder"
        role="img"
        aria-label={alt}
        title="本地无印刷立牌 PNG"
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
      onError={() => setFailed(true)}
    />
  );
}
