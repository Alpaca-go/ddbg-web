import { useState } from "react";
import type { EmbarkRosterSlotIndex } from "@ddbg/engine";
import type { FormalHeroName } from "@ddbg/engine";
import {
  embarkPartyBackgroundUrl,
  EMBARK_PARTY_BACKGROUND_HEIGHT_PX,
  EMBARK_PARTY_BACKGROUND_WIDTH_PX,
  EMBARK_ROSTER_POSITION_STANCES,
  embarkRosterPositionUrl,
} from "../../card-art/resolve-assets-plus-art";
import {
  HERO_PORTRAIT_ROSTER_SIZE_PX,
  heroHasPortraitRoster,
  heroPortraitRosterUrl,
} from "../../card-art/resolve-hero-portrait-roster-art";
import { stanceLabels } from "./formal-party";

const ROSTER_DRAG_SEAT_KEY = "application/x-ddbg-embark-roster-seat";

function seatIndexForRosterSlot(
  slotIndex: number,
  portraitRevealedBySeat: readonly boolean[],
  rosterSlotBySeat: readonly (number | null)[],
): number | null {
  for (let seat = 0; seat < portraitRevealedBySeat.length; seat++) {
    if (portraitRevealedBySeat[seat] && rosterSlotBySeat[seat] === slotIndex) return seat;
  }
  return null;
}

export function EmbarkPartyRosterBar({
  partyNames,
  portraitRevealedBySeat,
  rosterSlotBySeat,
  onMoveRosterSeat,
}: {
  readonly partyNames: readonly FormalHeroName[];
  /** 对应席位已点 confirm 后才显示 roster 头像。 */
  readonly portraitRevealedBySeat: readonly boolean[];
  /** 各建队席位确认后占用的底栏格（0–3，左→右）。 */
  readonly rosterSlotBySeat: readonly (number | null)[];
  readonly onMoveRosterSeat: (fromSeat: number, toSlot: EmbarkRosterSlotIndex) => void;
}) {
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  return (
    <div
      className="embark-party-roster"
      data-testid="embark-party-roster"
      aria-label="编队头像"
      style={{
        backgroundImage: `url(${embarkPartyBackgroundUrl()})`,
        width: EMBARK_PARTY_BACKGROUND_WIDTH_PX,
        height: EMBARK_PARTY_BACKGROUND_HEIGHT_PX,
        ["--embark-roster-portrait-px" as string]: `${HERO_PORTRAIT_ROSTER_SIZE_PX}px`,
      }}
    >
      <ol className="embark-party-roster__slots">
        {EMBARK_ROSTER_POSITION_STANCES.map((positionStance, slotIndex) => {
          const seatIndex = seatIndexForRosterSlot(
            slotIndex,
            portraitRevealedBySeat,
            rosterSlotBySeat,
          );
          const name = seatIndex === null ? null : partyNames[seatIndex]!;
          const showPortrait = name !== null && heroHasPortraitRoster(name);
          const dropActive = dragOverSlot === slotIndex;
          return (
            <li
              key={slotIndex}
              className={[
                "embark-party-roster__slot",
                dropActive ? "embark-party-roster__slot--drop-target" : "",
              ].join(" ")}
              data-testid={`embark-party-roster-slot-${slotIndex}`}
              onDragOver={(e) => {
                const types = e.dataTransfer.types;
                if (!types.includes(ROSTER_DRAG_SEAT_KEY)) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDragOverSlot(slotIndex);
              }}
              onDragLeave={() => {
                setDragOverSlot((prev) => (prev === slotIndex ? null : prev));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverSlot(null);
                const raw = e.dataTransfer.getData(ROSTER_DRAG_SEAT_KEY);
                if (raw === "") return;
                const fromSeat = Number(raw);
                if (!Number.isInteger(fromSeat) || fromSeat < 0 || fromSeat > 3) return;
                onMoveRosterSeat(fromSeat, slotIndex as EmbarkRosterSlotIndex);
              }}
            >
              {showPortrait && name && seatIndex !== null ? (
                <div
                  className="embark-party-roster__portrait-drag"
                  draggable
                  data-testid={`embark-party-roster-portrait-${seatIndex}`}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(ROSTER_DRAG_SEAT_KEY, String(seatIndex));
                    e.dataTransfer.effectAllowed = "move";
                    const handle = e.currentTarget;
                    e.dataTransfer.setDragImage(
                      handle,
                      handle.offsetWidth / 2,
                      handle.offsetHeight / 2,
                    );
                  }}
                  onDragEnd={() => setDragOverSlot(null)}
                >
                  <img
                    src={heroPortraitRosterUrl(name)}
                    alt=""
                    draggable={false}
                    width={HERO_PORTRAIT_ROSTER_SIZE_PX}
                    height={HERO_PORTRAIT_ROSTER_SIZE_PX}
                    className="embark-party-roster__portrait"
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              ) : (
                <>
                  <span
                    className="embark-party-roster__slot-back"
                    aria-hidden="true"
                    data-testid={`embark-party-roster-slot-back-${slotIndex}`}
                  />
                  <img
                    src={embarkRosterPositionUrl(positionStance)}
                    alt=""
                    draggable={false}
                    width={HERO_PORTRAIT_ROSTER_SIZE_PX}
                    height={HERO_PORTRAIT_ROSTER_SIZE_PX}
                    className="embark-party-roster__position"
                    data-testid={`embark-party-roster-position-${slotIndex}`}
                    title={stanceLabels[positionStance]}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
