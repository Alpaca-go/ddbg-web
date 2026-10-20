import { CoreboxPrintCardFace } from "../card-art/corebox-print-card-face";
import { cachedPrintQuestUrl, lookupPrintQuestFace } from "../card-art/resolve-print-quest-art";
import { TabletopRasterImage } from "./tabletop-raster-image";

/** 顶栏任务卡缩略；悬停放大完整印刷稿。 */
export function QuestThumb({
  cardId,
  caption,
}: {
  readonly cardId: string;
  readonly caption: string;
}) {
  const mapped = lookupPrintQuestFace(cardId, "front");
  const thumbSrc = mapped ? cachedPrintQuestUrl(mapped.faceEntry) : undefined;

  return (
    <div className="tt-quest-thumb" data-testid="tabletop-quest-thumb">
      <div className="tt-quest-thumb__chip" title={caption}>
        <TabletopRasterImage
          {...(thumbSrc ? { src: thumbSrc } : {})}
          label={caption}
          assetType="quest"
          className="tt-quest-thumb__img"
        />
      </div>
      <div className="tt-quest-thumb__flyout" aria-hidden="true">
        <CoreboxPrintCardFace deck="quest" cardId={cardId} label={caption} size="sm" />
      </div>
    </div>
  );
}
