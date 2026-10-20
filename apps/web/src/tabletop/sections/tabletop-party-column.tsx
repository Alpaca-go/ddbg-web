import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { lookupHeroStandeeArt } from "../../card-art/resolve-print-hero-standee-art";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type { FlowPhaseId } from "../phase/flow-phase";
import { StandeeToken } from "../standee-token";
import { stanceLabelZh } from "../tabletop-stance-label";
import type { TabletopHeroState } from "../tabletop-types";

function StressTrack({
  stress,
  stressFace,
}: {
  readonly stress: number;
  readonly stressFace: TabletopHeroState["stressFace"];
}) {
  const faceLabel =
    stressFace === "white"
      ? "白面"
      : stressFace === "red"
        ? "红面"
        : stressFace === null
          ? "面未知"
          : "";
  return (
    <div className="tt-stress-row">
      <div
        className="tt-stress tt-stat-animate"
        aria-label={`压力 ${stress}/10${faceLabel ? ` · ${faceLabel}` : ""}`}
        data-asset-type="punchboard_token"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={stress}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={i < stress ? "tt-stress__seg tt-stress__seg--filled" : "tt-stress__seg"}
          />
        ))}
      </div>
      <span className="tt-stress-face muted" data-testid="tt-stress-face-indicator">
        {stressFace === "white" && "白"}
        {stressFace === "red" && "红"}
        {stressFace === null && "—"}
      </span>
    </div>
  );
}

function TrinketSlots({ hero }: { readonly hero: TabletopHeroState }) {
  const slots = hero.trinketSlotCount;
  if (hero.isEmpty || slots <= 0) return null;
  const filled = hero.trinkets;
  return (
    <div className="tt-trinket-slots" aria-label={`饰品槽 ${filled.length}/${slots}`}>
      {Array.from({ length: slots }, (_, i) => {
        const t = filled[i];
        if (!t) {
          return <span key={i} className="tt-trinket-slot tt-trinket-slot--empty" />;
        }
        return (
          <span key={t.cardId} className="tt-trinket-slot" title={t.cardId}>
            <CoreboxPrintCardFace
              deck="trinket"
              cardId={t.cardId}
              face={t.face === "inverted" ? "back" : "front"}
              size="sm"
              testId={`tt-trinket-${hero.id}-${i}`}
            />
          </span>
        );
      })}
    </div>
  );
}

export function TabletopPartyColumn({
  phase,
  phaseCaption,
  heroes,
  activeHeroId,
  dataSource = "mock",
  onSelectHero,
}: {
  readonly phase: FlowPhaseId;
  readonly phaseCaption: string;
  readonly heroes: readonly TabletopHeroState[];
  readonly activeHeroId: string;
  readonly dataSource?: "mock" | "engine";
  readonly onSelectHero: (id: string) => void;
}) {
  const ordered = [...heroes].sort(
    (a, b) =>
      ["aggressive", "defensive", "ranged", "support"].indexOf(a.stance) -
      ["aggressive", "defensive", "ranged", "support"].indexOf(b.stance),
  );

  const showRoster =
    phase === "battle" ||
    phase === "dungeonExploration" ||
    phase === "hamlet" ||
    phase === "expeditionPrep" ||
    phase === "questReturn";

  return (
    <aside
      className="tt-party"
      aria-label="队伍"
      data-testid="tabletop-party"
      data-source={dataSource}
    >
      {!showRoster && <PhasePlaceholder label={phaseCaption} testId="tabletop-party-phase-ph" />}
      {showRoster &&
        ordered.map((hero) => {
          if (hero.isEmpty) {
            return (
              <div
                key={hero.id}
                className="tt-hero-row tt-hero-row--empty"
                data-testid={`tabletop-hero-row-${hero.id}`}
              >
                <span className="muted">空席位 {hero.seat}</span>
              </div>
            );
          }
          const standee = lookupHeroStandeeArt(hero.hero);
          const active = hero.id === activeHeroId;
          const woundsLabel = hero.lifeKnown
            ? `伤口 ${hero.wounds}/${hero.life}`
            : `伤口 ${hero.wounds}/—`;
          return (
            <button
              key={hero.id}
              type="button"
              className={[
                "tt-hero-row",
                active ? "tt-hero-row--active" : "",
                hero.actedThisRound ? "tt-hero-row--acted" : "",
                hero.isCurrentActor ? "tt-hero-row--turn" : "",
                hero.dead ? "tt-hero-row--dead" : "",
              ].join(" ")}
              onClick={() => onSelectHero(hero.id)}
              data-testid={`tabletop-hero-row-${hero.id}`}
              aria-pressed={active}
              disabled={hero.dead}
            >
              <StandeeToken
                label={hero.hero}
                {...(standee?.pngRel ? { pngRel: standee.pngRel } : {})}
                size="row"
              />
              <div className="tt-hero-row__body">
                <div className="tt-hero-row__title">
                  <span className="tt-hero-row__name">{hero.hero}</span>
                  <span className="tt-hero-row__level">
                    {hero.heroLevel > 0
                      ? (["I", "II", "III"][hero.heroLevel - 1] ?? hero.heroLevel)
                      : "—"}
                  </span>
                  {(hero.quirkCount > 0 || hero.diseaseCount > 0) && (
                    <span className="tt-hero-row__badges muted">
                      {hero.quirkCount > 0 && `怪癖×${hero.quirkCount}`}
                      {hero.diseaseCount > 0 && ` 病×${hero.diseaseCount}`}
                    </span>
                  )}
                </div>
                <div
                  className="tt-hero-row__wounds tt-stat-animate"
                  data-asset-type="punchboard_token"
                >
                  {woundsLabel}
                  {hero.dead && <span className="tt-hero-row__dead-tag">阵亡</span>}
                </div>
                <StressTrack stress={hero.stress} stressFace={hero.stressFace} />
                <div className="tt-hero-row__conditions">
                  {hero.statusStacks.length ? (
                    hero.statusStacks.map((s) => (
                      <span
                        key={`${s.kind}-${s.remaining}`}
                        className="tt-condition-chip tt-stat-animate"
                        data-asset-type="punchboard_token"
                      >
                        {s.kind}/{s.remaining}t
                      </span>
                    ))
                  ) : (
                    <span className="tt-hero-row__cond-empty muted">无状态</span>
                  )}
                </div>
                <TrinketSlots hero={hero} />
                <div className="tt-hero-row__meta">
                  <span>{stanceLabelZh(hero.stance)}</span>
                  <span>席{hero.seat}</span>
                  <span>区{hero.areaId}</span>
                  {hero.isCurrentActor && <span className="tt-hero-row__turn-tag">行动中</span>}
                </div>
              </div>
            </button>
          );
        })}
    </aside>
  );
}
