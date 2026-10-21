import { FORMAL_HERO_NAMES, type FormalHeroName } from "@ddbg/engine";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { StandeeToken } from "../../tabletop/standee-token";
import "../../tabletop/tabletop.css";

function standeePng(name: FormalHeroName) {
  return lookupHeroStandeeArt(name)?.pngRel;
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

export function EmbarkHeroPicker({
  seatIndex,
  heroName,
  partyNames,
  onSelect,
}: {
  readonly seatIndex: number;
  readonly heroName: FormalHeroName;
  readonly partyNames: readonly FormalHeroName[];
  readonly onSelect: (name: FormalHeroName) => void;
}) {
  const seatLabel = `席位 ${seatIndex + 1} 英雄`;
  const currentPng = standeePng(heroName);

  return (
    <div className="embark-seat-hero">
      <div role="group" aria-label={seatLabel}>
        <p className="embark-hero-label" id={`embark-hero-seat-${seatIndex}-label`}>
          英雄
        </p>
        <div
          className="embark-hero-current"
          aria-labelledby={`embark-hero-seat-${seatIndex}-label`}
        >
          <StandeeToken
            label={heroName}
            {...(currentPng ? { pngRel: currentPng } : {})}
            selected
            testId={`embark-hero-current-${seatIndex}`}
          />
          <span className="embark-hero-current__name">{heroName}</span>
        </div>
        <div className="embark-hero-roster" role="listbox" aria-label={`${seatLabel} · 更换`}>
          {FORMAL_HERO_NAMES.map((name) => {
            const png = standeePng(name);
            const selected = name === heroName;
            const takenSeat = seatHoldingHero(partyNames, name, seatIndex);
            if (takenSeat !== null) {
              return (
                <span
                  key={name}
                  className="embark-hero-pick embark-hero-pick--taken"
                  title={`已在席位 ${takenSeat}`}
                  role="option"
                  aria-disabled="true"
                  aria-label={`${name}，已在席位 ${takenSeat}`}
                >
                  <StandeeToken label={name} {...(png ? { pngRel: png } : {})} size="battle" />
                </span>
              );
            }
            return (
              <StandeeToken
                key={name}
                label={name}
                {...(png ? { pngRel: png } : {})}
                selected={selected}
                onClick={() => {
                  if (!selected) onSelect(name);
                }}
                ariaLabel={name}
                testId={`embark-hero-pick-${seatIndex}-${name}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
