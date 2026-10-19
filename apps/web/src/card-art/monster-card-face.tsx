import { useState } from "react";
import { cachedPrintMonsterUrl, lookupPrintMonsterFace } from "./resolve-print-monster-art";

type Size = "chip" | "md";

const sizeClass: Record<Size, string> = {
  chip: "monster-card-face--chip",
  md: "monster-card-face--md",
};

/**
 * Monster card face: Kyries-reviewed print PNG when cached; else placeholder (no TTS fallback).
 */
export function MonsterCardFace({
  monsterCardId,
  label,
  size = "chip",
}: {
  readonly monsterCardId: string;
  readonly label?: string;
  readonly size?: Size;
}) {
  const printEntry = lookupPrintMonsterFace(monsterCardId);
  const caption = label ?? printEntry?.name ?? monsterCardId;
  const [failed, setFailed] = useState(!printEntry);

  const className = [
    "monster-card-face",
    sizeClass[size],
    failed ? "monster-card-face--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    printEntry && !failed ? (
      <img
        src={cachedPrintMonsterUrl(printEntry)}
        alt={caption}
        className="monster-card-face__print"
        onError={() => setFailed(true)}
      />
    ) : (
      <div className="monster-card-face__placeholder" aria-hidden="true">
        <span>无卡图</span>
      </div>
    );

  if (size === "chip") {
    return (
      <div
        className={className}
        data-testid={`monster-card-face-${monsterCardId}`}
        data-card-art={failed ? "placeholder" : "print"}
        role="img"
        aria-label={caption}
      >
        {body}
      </div>
    );
  }

  return (
    <figure
      className={className}
      data-testid={`monster-card-face-${monsterCardId}`}
      data-card-art={failed ? "placeholder" : "print"}
    >
      {body}
      <figcaption className="monster-card-face__caption">{caption}</figcaption>
    </figure>
  );
}
