import { useState } from "react";
import { cachedPrintCurioUrl, lookupPrintCurioFace } from "./resolve-print-curio-art";
import { cachedPrintPlayerAidUrl, lookupPrintPlayerAidFace } from "./resolve-print-player-aid-art";
import { cachedPrintQuestUrl, lookupPrintQuestFace } from "./resolve-print-quest-art";
import { cachedPrintTrinketUrl, lookupPrintTrinketFace } from "./resolve-print-trinket-art";

type Deck = "curio" | "trinket" | "quest" | "player_aid";
type Face = "front" | "back";

function lookupFace(deck: Deck, cardId: string, face: Face) {
  if (deck === "curio") return lookupPrintCurioFace(cardId, face);
  if (deck === "trinket") return lookupPrintTrinketFace(cardId, face);
  if (deck === "player_aid") return lookupPrintPlayerAidFace(cardId, face);
  return lookupPrintQuestFace(cardId, face);
}

function cachedUrl(deck: Deck, pngRel: string) {
  const entry = { pngRel };
  if (deck === "curio") return cachedPrintCurioUrl(entry);
  if (deck === "trinket") return cachedPrintTrinketUrl(entry);
  if (deck === "player_aid") return cachedPrintPlayerAidUrl(entry);
  return cachedPrintQuestUrl(entry);
}

const aspectClass: Record<Deck, string> = {
  curio: "corebox-print-card-face--curio",
  trinket: "corebox-print-card-face--trinket",
  quest: "corebox-print-card-face--quest",
  player_aid: "corebox-print-card-face--player-aid",
};

/**
 * Curio / trinket / quest / player_aid print PNG when cached; placeholder keeps caption + surrounding text.
 */
export function CoreboxPrintCardFace({
  deck,
  cardId,
  face = "front",
  label,
  size = "md",
  testId,
}: {
  readonly deck: Deck;
  readonly cardId: string;
  readonly face?: Face;
  readonly label?: string;
  readonly size?: "sm" | "md";
  readonly testId?: string;
}) {
  const mapped = lookupFace(deck, cardId, face);
  const caption = label ?? mapped?.name ?? cardId;
  const [failed, setFailed] = useState(!mapped);

  const className = [
    "card-face",
    size === "sm" ? "card-face--sm" : "card-face--md",
    "corebox-print-card-face",
    aspectClass[deck],
    failed ? "card-face--placeholder" : "",
    size === "sm" ? "corebox-print-card-face--sm" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body =
    mapped && !failed ? (
      <img
        src={cachedUrl(deck, mapped.faceEntry.pngRel)}
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
      className={className}
      data-testid={testId ?? `${deck}-card-face-${cardId}-${face}`}
      data-card-art={failed ? "placeholder" : "print"}
    >
      {body}
      <figcaption className="card-face__caption">{caption}</figcaption>
    </figure>
  );
}
