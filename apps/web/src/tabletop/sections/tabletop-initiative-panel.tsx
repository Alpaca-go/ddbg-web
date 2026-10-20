import { AssetPlaceholder } from "../asset-placeholder";
import type { FlowPhaseId } from "../phase/flow-phase";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type { TabletopBattleMeta, TabletopHeroState } from "../tabletop-types";

export function TabletopInitiativePanel({
  phase,
  initiativeCaption,
  battle,
  turnHero,
}: {
  readonly phase: FlowPhaseId;
  readonly initiativeCaption: string;
  readonly battle: TabletopBattleMeta;
  readonly turnHero: TabletopHeroState;
}) {
  const showBattleInit = phase === "battle";

  return (
    <section
      className="tt-init tt-phase-surface"
      aria-label="当前行动与先攻"
      data-testid="tabletop-initiative"
    >
      {!showBattleInit && (
        <PhasePlaceholder label={initiativeCaption} testId="tabletop-initiative-phase-ph" />
      )}
      {showBattleInit && (
        <>
          <h3 className="tt-init__title">当前行动</h3>
          <p className="tt-init__actor" data-testid="tabletop-turn-actor">
            {turnHero.hero} · 剩余 {battle.actionsRemaining} 行动
          </p>
          <div className="tt-init__round">
            第 <strong>{battle.round}</strong> / 4 轮
          </div>
          <div className="tt-init__deck">
            <AssetPlaceholder
              assetType="initiative"
              label="先攻牌堆背面"
              className="tt-init__deck-back"
            />
            <span className="muted">
              英雄 {battle.initiativeDeckHero} · 怪物 {battle.initiativeDeckMonster}
            </span>
          </div>
          <div className="tt-init__revealed" aria-label="已翻开先攻">
            {battle.initiativeRevealed.map((side, i) => (
              <span key={i} className="tt-init__card">
                {side === "hero" ? "英" : "怪"}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
