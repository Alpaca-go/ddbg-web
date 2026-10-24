import { useState } from "react";
import { cachedPrintHeroStatUrl, lookupPrintHeroStatFace } from "./resolve-print-hero-stat-art";

/**
 * 英雄属性卡：优先 Kyries 印刷 map（无 TTS 回退）。
 */
export function HeroStatCardFace({
  heroStatId,
  label,
  className = "",
  testId,
  size = "md",
}: {
  readonly heroStatId?: string;
  readonly label: string;
  readonly className?: string;
  readonly testId?: string;
  readonly size?: "sm" | "md";
}) {
  const mapped = heroStatId ? lookupPrintHeroStatFace(heroStatId) : undefined;
  const caption = label;
  const [failed, setFailed] = useState(!mapped);

  const classNameMerged = [
    "card-face",
    size === "sm" ? "card-face--sm" : "card-face--md",
    "hero-stat-card-face",
    failed ? "card-face--placeholder" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    mapped && !failed ? (
      <img
        src={cachedPrintHeroStatUrl(mapped)}
        alt={caption}
        className="card-face__print"
        onError={() => setFailed(true)}
      />
    ) : (
      <div className="card-face__placeholder" aria-hidden="true">
        <span>无本地卡图</span>
      </div>
    );

  return (
    <figure
      className={classNameMerged}
      {...(testId ? { "data-testid": testId } : {})}
      data-card-art={failed ? "placeholder" : "print"}
      {...(mapped?.dataStatus ? { "data-hero-stat-status": mapped.dataStatus } : {})}
    >
      {body}
      <figcaption className="card-face__caption">{caption}</figcaption>
    </figure>
  );
}
