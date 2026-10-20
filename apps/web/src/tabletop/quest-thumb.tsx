import { useState } from "react";
import { CoreboxPrintCardFace } from "../card-art/corebox-print-card-face";
import { cachedPrintQuestUrl, lookupPrintQuestFace } from "../card-art/resolve-print-quest-art";

/** 顶栏任务卡缩略；悬停放大完整印刷稿。 */
export function QuestThumb({
  cardId,
  caption,
}: {
  readonly cardId: string;
  readonly caption: string;
}) {
  const mapped = lookupPrintQuestFace(cardId, "front");
  const [failed, setFailed] = useState(!mapped);

  return (
    <div className="tt-quest-thumb" data-testid="tabletop-quest-thumb">
      <div className="tt-quest-thumb__chip" title={caption}>
        {mapped && !failed ? (
          <img src={cachedPrintQuestUrl(mapped.faceEntry)} alt="" onError={() => setFailed(true)} />
        ) : (
          <span className="tt-quest-thumb__fallback">任务</span>
        )}
      </div>
      <div className="tt-quest-thumb__flyout" aria-hidden="true">
        <CoreboxPrintCardFace deck="quest" cardId={cardId} label={caption} size="sm" />
      </div>
    </div>
  );
}
