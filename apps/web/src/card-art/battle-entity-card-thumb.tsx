import type { GameState } from "@ddbg/engine";
import { BattlePositionRaster } from "./battle-position-raster";
import { HeroStatCardFace } from "./hero-stat-card-face";
import { MonsterCardFace } from "./monster-card-face";
import { lookupHeroStandeeArt } from "./resolve-print-hero-standee-art";

type BattleEntity = NonNullable<GameState["battle"]>["entities"][number];

/**
 * 战斗内单位缩略：英雄优先 STAT 印刷卡，怪物用怪物卡 chip；无图走既有占位。
 */
export function BattleEntityCardThumb({
  entity,
  label,
  testId,
}: {
  readonly entity: BattleEntity;
  readonly label: string;
  readonly testId?: string;
}) {
  if (entity.side === "monster" && entity.monsterCardId) {
    return <MonsterCardFace monsterCardId={entity.monsterCardId} label={label} size="chip" />;
  }

  const standee = entity.hero ? lookupHeroStandeeArt(entity.hero) : undefined;

  return (
    <div className="battle-entity-card-thumb" data-testid={testId}>
      {entity.heroStatId ? (
        <HeroStatCardFace
          heroStatId={entity.heroStatId}
          label={label}
          size="sm"
          className="battle-entity-card-thumb__stat"
          {...(testId ? { testId: `${testId}-stat` } : {})}
        />
      ) : standee ? (
        <BattlePositionRaster
          standee={standee}
          alt={label}
          className="battle-entity-card-thumb__standee"
          {...(testId ? { testId: `${testId}-standee` } : {})}
        />
      ) : (
        <HeroStatCardFace label={label} size="sm" className="battle-entity-card-thumb__stat" />
      )}
    </div>
  );
}
