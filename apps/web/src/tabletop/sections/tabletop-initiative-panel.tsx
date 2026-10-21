import type { FlowPhaseId } from "../phase/flow-phase";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type {
  TabletopBattleMeta,
  TabletopHeroState,
  TabletopMonsterState,
} from "../tabletop-types";

export function TabletopInitiativePanel({
  phase,
  initiativeCaption,
  battle,
  heroes,
  monsters,
  entityName,
}: {
  readonly phase: FlowPhaseId;
  readonly initiativeCaption: string;
  readonly battle: TabletopBattleMeta;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly entityName: (id: string) => string;
}) {
  const actor =
    heroes.find((h) => h.id === battle.turnActorId && !h.isEmpty) ??
    monsters.find((m) => m.id === battle.turnActorId);
  const nextHero =
    battle.nextHeroId === undefined
      ? heroes.find((h) => !h.dead && !h.isEmpty && !h.actedThisRound)?.id
      : battle.nextHeroId;
  const nextMonster = battle.nextMonsterId === undefined ? null : battle.nextMonsterId;
  return (
    <section
      className="tt-init tt-phase-surface"
      aria-label="当前行动与先攻"
      data-testid="tabletop-initiative"
    >
      {phase !== "battle" ? (
        <PhasePlaceholder label={initiativeCaption} testId="tabletop-initiative-phase-ph" />
      ) : (
        <>
          <h3 className="tt-init__title">先攻与回合</h3>
          <p className="tt-init__actor" data-testid="tabletop-turn-actor">
            {actor ? `${entityName(actor.id)} · ` : ""}
            {battle.turnLabel ?? `剩余 ${battle.actionsRemaining} 行动`}
          </p>
          <div
            className="tt-init__round"
            data-testid="tabletop-round-track"
            aria-label={`第 ${battle.round} / 4 轮`}
          >
            <span>第 {battle.round} / 4 轮</span>
            <ol>
              {[1, 2, 3, 4].map((round) => (
                <li key={round} aria-current={round === battle.round ? "step" : undefined}>
                  {round}
                </li>
              ))}
            </ol>
          </div>
          <div className="tt-init__deck" data-testid="tabletop-initiative-deck">
            <div className="tt-init__back" aria-label="先攻卡背待确认">
              先攻<span>{battle.initiativeDeckHero + battle.initiativeDeckMonster} 张</span>
            </div>
            <div>
              英雄 {battle.initiativeDeckHero} · 怪物 {battle.initiativeDeckMonster}
              <small className="muted">卡背待确认（U-13）</small>
            </div>
          </div>
          <div
            className="tt-init__revealed"
            aria-label="本轮已翻开先攻"
            data-testid="tabletop-initiative-revealed"
          >
            {battle.initiativeRevealed.length === 0 ? (
              <span className="muted">本轮尚无翻牌记录</span>
            ) : (
              battle.initiativeRevealed.map((side, i) => (
                <span key={i} className={`tt-init__card tt-init__card--${side}`}>
                  {side === "hero" ? "英雄" : "怪物"}
                </span>
              ))
            )}
          </div>
          <p className="tt-init__candidates" data-testid="tabletop-initiative-candidates">
            下一名英雄：{nextHero ? entityName(nextHero) : "—"}
            <br />
            下一只怪物：{nextMonster ? entityName(nextMonster) : "—"}
          </p>
        </>
      )}
    </section>
  );
}
