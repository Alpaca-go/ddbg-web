import { MonsterCardFace } from "../../card-art/monster-card-face";
import { RoomCardFace } from "../../card-art/room-card-face";
import { AssetPlaceholder } from "../asset-placeholder";
import type { TabletopHeroState, TabletopMonsterState, TabletopQuestMeta } from "../tabletop-types";

export function TabletopDetailPanel({
  kind,
  targetId,
  heroes,
  monsters,
  quest,
}: {
  readonly kind: "hero" | "monster";
  readonly targetId: string | null;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly quest: TabletopQuestMeta;
}) {
  const hero = kind === "hero" ? heroes.find((h) => h.id === targetId) : undefined;
  const monster = kind === "monster" ? monsters.find((m) => m.id === targetId) : undefined;

  return (
    <aside className="tt-detail" aria-label="选中目标详情" data-testid="tabletop-detail">
      <h3 className="tt-detail__title">目标详情</h3>
      {monster && (
        <>
          <div className="tt-detail__card-slot" data-asset-type="monster_medium">
            <MonsterCardFace monsterCardId={monster.monsterCardId} size="md" />
          </div>
          <p className="tt-detail__stat">
            伤口 {monster.wounds}/{monster.life}（代币计数，非 HP 条）
          </p>
          <p className="muted">修正：光照 {quest.locationLabel} · Protection 堆见卡面</p>
        </>
      )}
      {hero && !monster && (
        <>
          <AssetPlaceholder
            assetType="hero_stat"
            label={`${hero.hero} 英雄卡`}
            className="tt-detail__hero-stat"
          />
          <p>
            伤口 {hero.wounds}/{hero.life} · 压力 {hero.stress}/10
          </p>
        </>
      )}
      {!hero && !monster && <p className="muted">点选立牌或英雄行查看详情</p>}
      <div className="tt-detail__room">
        <h4>房间卡（替换光环位）</h4>
        <RoomCardFace roomCardId={quest.currentRoomCardId} />
      </div>
    </aside>
  );
}
