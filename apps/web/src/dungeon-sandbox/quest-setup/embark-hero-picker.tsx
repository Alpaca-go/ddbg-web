import { FORMAL_HERO_NAMES, type FormalHeroName } from "@ddbg/engine";
import { menuArrowUrl } from "../../card-art/resolve-assets-plus-art";
import { heroHasHeroToken, heroHeroTokenUrl } from "../../card-art/resolve-hero-token-art";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { StandeeToken } from "../../tabletop/standee-token";
import "../../tabletop/tabletop.css";

function embarkHeroTokenProps(name: FormalHeroName) {
  if (heroHasHeroToken(name)) {
    return { imageSrc: heroHeroTokenUrl(name), visual: "hero_token" as const };
  }
  const pngRel = lookupHeroStandeeArt(name)?.pngRel;
  return pngRel ? { pngRel } : {};
}

function seatHoldingHero(
  partyNames: readonly FormalHeroName[],
  hero: FormalHeroName,
  seatIndex: number,
): number | null {
  for (let i = 0; i < partyNames.length; i++) {
    if (i !== seatIndex && partyNames[i] === hero) return i + 1;
  }
  return null;
}

export function cycleEmbarkHero(
  heroName: FormalHeroName,
  direction: -1 | 1,
  partyNames: readonly FormalHeroName[],
  seatIndex: number,
): FormalHeroName {
  const names = FORMAL_HERO_NAMES;
  let i = names.indexOf(heroName);
  for (let step = 0; step < names.length; step++) {
    i = (i + direction + names.length) % names.length;
    const candidate = names[i]!;
    if (seatHoldingHero(partyNames, candidate, seatIndex) === null) return candidate;
  }
  return heroName;
}

type EmbarkHeroSeatProps = {
  readonly seatIndex: number;
  readonly heroName: FormalHeroName;
  readonly partyNames: readonly FormalHeroName[];
  readonly onSelect: (name: FormalHeroName) => void;
};

export function EmbarkHeroToken({
  seatIndex,
  heroName,
  partyNames,
  onSelect,
}: EmbarkHeroSeatProps) {
  const seatLabel = `席位 ${seatIndex + 1} 英雄`;
  const tokenProps = embarkHeroTokenProps(heroName);

  return (
    <div className="embark-seat-hero">
      <div role="group" aria-label={seatLabel}>
        <div className="embark-hero-current">
          <div className="embark-hero-cycle">
            <button
              type="button"
              className="embark-hero-cycle__btn"
              aria-label={`${seatLabel} · 上一名`}
              data-testid={`embark-hero-prev-${seatIndex}`}
              onClick={() => onSelect(cycleEmbarkHero(heroName, -1, partyNames, seatIndex))}
            >
              <img src={menuArrowUrl("left")} alt="" className="embark-hero-cycle__arrow" />
            </button>
            <StandeeToken
              label={heroName}
              {...tokenProps}
              testId={`embark-hero-current-${seatIndex}`}
            />
            <button
              type="button"
              className="embark-hero-cycle__btn"
              aria-label={`${seatLabel} · 下一名`}
              data-testid={`embark-hero-next-${seatIndex}`}
              onClick={() => onSelect(cycleEmbarkHero(heroName, 1, partyNames, seatIndex))}
            >
              <img src={menuArrowUrl("right")} alt="" className="embark-hero-cycle__arrow" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
