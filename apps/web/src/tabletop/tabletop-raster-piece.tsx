import { useState, type ReactNode } from "react";
import { PRINT_CARD_ART_PUBLIC_PREFIX } from "../card-art/resolve-print-hero-skill-art";

export type TabletopPieceAspect = "skill" | "room" | "quest" | "quest-map" | "monster" | "square";

const aspectClass: Record<TabletopPieceAspect, string> = {
  skill: "tabletop-piece--skill",
  room: "tabletop-piece--room",
  quest: "tabletop-piece--quest",
  "quest-map": "tabletop-piece--quest-map",
  monster: "tabletop-piece--monster",
  square: "tabletop-piece--square",
};

function urlFromRel(pngRel: string): string {
  const rel = pngRel.replace(/^\//, "");
  return `${PRINT_CARD_ART_PUBLIC_PREFIX}/${rel}`;
}

/**
 * 带厚度边与阴影的印刷稿块；缺图时同尺寸占位，不抛错。
 */
export function TabletopRasterPiece({
  pngRel,
  label,
  aspect = "skill",
  testId,
  footer,
}: {
  readonly pngRel?: string;
  readonly label: string;
  readonly aspect?: TabletopPieceAspect;
  readonly testId?: string;
  readonly footer?: ReactNode;
}) {
  const [failed, setFailed] = useState(!pngRel);

  const showImg = pngRel && !failed;

  return (
    <figure
      className={["tabletop-piece", aspectClass[aspect]].filter(Boolean).join(" ")}
      data-testid={testId}
      data-card-art={showImg ? "print" : "placeholder"}
    >
      <div className="tabletop-piece__shell">
        <div className="tabletop-piece__face">
          {showImg ? (
            <img
              src={urlFromRel(pngRel)}
              alt={label}
              className="tabletop-piece__img"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="tabletop-piece__placeholder" aria-hidden="true">
              <span className="tabletop-piece__placeholder-label">{label}</span>
            </div>
          )}
        </div>
      </div>
      {(footer ?? label) && (
        <figcaption className="tabletop-piece__caption">{footer ?? label}</figcaption>
      )}
    </figure>
  );
}
