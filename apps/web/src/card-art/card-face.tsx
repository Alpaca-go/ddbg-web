import { useState } from "react";
import { cachedPrintHeroSkillUrl, lookupPrintHeroSkillFace } from "./resolve-print-hero-skill-art";

type Size = "sm" | "md";

const sizeClass: Record<Size, string> = {
  sm: "card-face--sm",
  md: "card-face--md",
};

const LEVEL_ROMAN = ["I", "II", "III"] as const;

/**
 * Hero skill face: Kyries-reviewed print PNG when cached; else placeholder (no TTS fallback).
 */
export function CardFace({
  skillId,
  label,
  size = "md",
  selected = false,
  onSelect,
}: {
  readonly skillId: string;
  readonly label?: string;
  readonly size?: Size;
  readonly selected?: boolean;
  readonly onSelect?: () => void;
}) {
  const printEntry = lookupPrintHeroSkillFace(skillId);
  const caption =
    label ??
    (printEntry
      ? `${printEntry.name} ${LEVEL_ROMAN[printEntry.level - 1] ?? printEntry.level}`
      : skillId);
  const [failed, setFailed] = useState(!printEntry);

  const className = [
    "card-face",
    sizeClass[size],
    selected ? "card-face--selected" : "",
    failed ? "card-face--placeholder" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    printEntry && !failed ? (
      <img
        src={cachedPrintHeroSkillUrl(printEntry)}
        alt={caption}
        className="card-face__print"
        onError={() => setFailed(true)}
      />
    ) : (
      <div className="card-face__placeholder" aria-hidden="true">
        <span>无本地卡图</span>
      </div>
    );

  if (onSelect) {
    return (
      <button
        type="button"
        className={className}
        data-testid={`card-face-${skillId}`}
        data-card-art={failed ? "placeholder" : "print"}
        aria-pressed={selected}
        aria-label={caption}
        onClick={onSelect}
      >
        {body}
        <span className="card-face__caption">{caption}</span>
      </button>
    );
  }

  return (
    <figure
      className={className}
      data-testid={`card-face-${skillId}`}
      data-card-art={failed ? "placeholder" : "print"}
    >
      {body}
      <figcaption className="card-face__caption">{caption}</figcaption>
    </figure>
  );
}
