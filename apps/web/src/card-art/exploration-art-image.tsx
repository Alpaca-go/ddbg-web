import { useState } from "react";
import {
  cachedPrintExplorationUrl,
  type PrintExplorationArtEntry,
  type RoomTokenArtEntry,
} from "./resolve-exploration-art";

type PrintRasterEntry =
  Pick<PrintExplorationArtEntry, "pngRel"> | Pick<RoomTokenArtEntry, "pngRel">;

function initialUrl(entry: PrintRasterEntry): string {
  return cachedPrintExplorationUrl(entry);
}

/**
 * Cached raster for exploration UI: print PNG (QuestMap, room cards, room tokens).
 */
export function ExplorationArtImage({
  entry,
  alt,
  className = "",
  testId,
}: {
  readonly entry: PrintRasterEntry;
  readonly alt: string;
  readonly className?: string;
  readonly testId?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed || !entry.pngRel) {
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
      src={initialUrl(entry)}
      alt={alt}
      className={className}
      data-testid={testId}
      data-card-art="print"
      onError={() => setFailed(true)}
    />
  );
}
