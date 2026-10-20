import { useState } from "react";
import { CoreboxPrintCardFace } from "../card-art/corebox-print-card-face";
import { cachedPrintQuestUrl, lookupPrintQuestFace } from "../card-art/resolve-print-quest-art";

/** 顶栏任务卡缩略；悬停放大完整印刷稿。缺图时仅显示紧凑占位，全名见 title。 */
export function QuestThumb({
  cardId,
  caption,
}: {
  readonly cardId: string;
  readonly caption: string;
}) {
  const mapped = lookupPrintQuestFace(cardId, "front");
  const thumbSrc = mapped ? cachedPrintQuestUrl(mapped.faceEntry) : undefined;
  const [failed, setFailed] = useState(!thumbSrc);
  const showImg = Boolean(thumbSrc) && !failed;

  return (
    <div className="tt-quest-thumb" data-testid="tabletop-quest-thumb" title={caption}>
      <div className="tt-quest-thumb__chip" title={caption} aria-label={`${caption}（任务卡缩略）`}>
        {showImg ? (
          <img
            src={thumbSrc}
            alt=""
            className="tt-quest-thumb__img"
            data-card-art="print"
            onError={() => setFailed(true)}
          />
        ) : (
          <span className="tt-quest-thumb__icon-ph" aria-hidden="true">
            Q
          </span>
        )}
      </div>
      <div className="tt-quest-thumb__flyout" aria-hidden="true">
        <CoreboxPrintCardFace deck="quest" cardId={cardId} label={caption} size="sm" />
      </div>
    </div>
  );
}
