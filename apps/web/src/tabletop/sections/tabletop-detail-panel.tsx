import { HeroStatCardFace } from "../../card-art/hero-stat-card-face";
import { MonsterCardFace } from "../../card-art/monster-card-face";
import type { FlowPhaseId } from "../phase/flow-phase";
import { PhasePlaceholder } from "../phase/phase-placeholder";
import type { TabletopHeroState, TabletopMonsterState } from "../tabletop-types";

export function TabletopDetailPanel({
  phase,
  detailCaption,
  kind,
  targetId,
  heroes,
  monsters,
}: {
  readonly phase: FlowPhaseId;
  readonly detailCaption: string;
  readonly kind: "hero" | "monster";
  readonly targetId: string | null;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
}) {
  const hero = kind === "hero" ? heroes.find((h) => h.id === targetId) : undefined;
  const monster = kind === "monster" ? monsters.find((m) => m.id === targetId) : undefined;

  const showBattleDetail = phase === "battle" || phase === "dungeonExploration";

  return (
    <aside
      className="tt-detail tt-phase-surface"
      aria-label="选中目标详情"
      data-testid="tabletop-detail"
    >
      <h3 className="tt-detail__title">目标详情</h3>
      {!showBattleDetail && (
        <PhasePlaceholder label={detailCaption} testId="tabletop-detail-phase-ph" />
      )}
      {showBattleDetail && monster && (
        <>
          <div className="tt-detail__card-slot" data-asset-type="monster_medium">
            <MonsterCardFace monsterCardId={monster.monsterCardId} size="md" />
          </div>
          <p className="tt-detail__stat">
            伤口 {monster.wounds}/{monster.life}（代币计数，非 HP 条）
          </p>
        </>
      )}
      {showBattleDetail && hero && !monster && (
        <>
          <HeroStatCardFace
            {...(hero.heroStatId ? { heroStatId: hero.heroStatId } : {})}
            label={`${hero.hero} 英雄卡`}
            className="tt-detail__hero-stat"
            testId={`hero-stat-face-${hero.id}`}
          />
          <p>
            伤口 {hero.wounds}/{hero.life} · 压力 {hero.stress}/10
          </p>
        </>
      )}
      {showBattleDetail && !hero && !monster && <p className="muted">点选立牌或英雄行查看详情</p>}
    </aside>
  );
}
