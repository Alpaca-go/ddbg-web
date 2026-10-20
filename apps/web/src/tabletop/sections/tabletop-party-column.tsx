import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { TabletopRasterPiece } from "../tabletop-raster-piece";
import { AssetPlaceholder } from "../asset-placeholder";
import { stanceLabelZh } from "../tabletop-stance-label";
import type { TabletopHeroState } from "../tabletop-types";

function StressTrack({ stress }: { readonly stress: number }) {
  return (
    <div className="tt-stress" aria-label={`压力 ${stress}/10`} data-asset-type="punchboard_token">
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          className={i < stress ? "tt-stress__seg tt-stress__seg--filled" : "tt-stress__seg"}
        />
      ))}
    </div>
  );
}

export function TabletopPartyColumn({
  heroes,
  activeHeroId,
  onSelectHero,
}: {
  readonly heroes: readonly TabletopHeroState[];
  readonly activeHeroId: string;
  readonly onSelectHero: (id: string) => void;
}) {
  const ordered = [...heroes].sort(
    (a, b) =>
      ["aggressive", "defensive", "ranged", "support"].indexOf(a.stance) -
      ["aggressive", "defensive", "ranged", "support"].indexOf(b.stance),
  );

  return (
    <aside className="tt-party" aria-label="队伍" data-testid="tabletop-party">
      {ordered.map((hero) => {
        const standee = lookupHeroStandeeArt(hero.hero);
        const active = hero.id === activeHeroId;
        return (
          <button
            key={hero.id}
            type="button"
            className={[
              "tt-hero-row",
              active ? "tt-hero-row--active" : "",
              hero.actedThisRound ? "tt-hero-row--acted" : "",
            ].join(" ")}
            onClick={() => onSelectHero(hero.id)}
            data-testid={`tabletop-hero-row-${hero.id}`}
            aria-pressed={active}
          >
            <div className="tt-hero-row__avatar" data-asset-type="hero_standee">
              {standee?.pngRel ? (
                <TabletopRasterPiece
                  {...{ pngRel: standee.pngRel }}
                  label={hero.hero}
                  aspect="square"
                />
              ) : (
                <AssetPlaceholder assetType="hero_standee" label={hero.hero} />
              )}
            </div>
            <div className="tt-hero-row__body">
              <div className="tt-hero-row__title">
                <span>{hero.hero}</span>
                <span className="tt-hero-row__level">
                  {["I", "II", "III"][hero.heroLevel - 1] ?? hero.heroLevel}
                </span>
                <span className="muted">席 {hero.seat}</span>
              </div>
              <div className="tt-hero-row__wounds" data-asset-type="punchboard_token">
                伤口 {hero.wounds}/{hero.life}
              </div>
              <StressTrack stress={hero.stress} />
              <div className="tt-hero-row__conditions">
                {hero.statusStacks.length ? (
                  hero.statusStacks.map((s) => (
                    <span
                      key={s.kind}
                      className="tt-condition-chip"
                      data-asset-type="punchboard_token"
                    >
                      {s.kind}/{s.remaining}t
                    </span>
                  ))
                ) : (
                  <span className="muted">无状态堆</span>
                )}
              </div>
              <div className="tt-hero-row__trinkets">
                {Array.from({ length: hero.trinketSlotCount }, (_, i) => (
                  <span key={i} className="tt-trinket-slot" data-asset-type="trinket">
                    饰 {i + 1}
                  </span>
                ))}
              </div>
              <div className="muted tt-hero-row__meta">
                {stanceLabelZh(hero.stance)} · 技能 {hero.skillIds.length} · 区域 {hero.areaId}
              </div>
            </div>
          </button>
        );
      })}
    </aside>
  );
}
