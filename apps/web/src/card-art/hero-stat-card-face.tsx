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
  const printUrl = mapped ? cachedPrintHeroStatUrl(mapped) : undefined;
  const [failedUrl, setFailedUrl] = useState<string>();
  const failed = !printUrl || failedUrl === printUrl;

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
    printUrl && !failed ? (
      <img
        src={printUrl}
        alt={caption}
        className="card-face__print"
        onError={() => setFailedUrl(printUrl)}
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
