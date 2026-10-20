import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import { HeroStatCardFace } from "../../card-art/hero-stat-card-face";
import { MonsterCardFace } from "../../card-art/monster-card-face";
import {
  cachedPrintExplorationUrl,
  lookupRoomCardArt,
} from "../../card-art/resolve-exploration-art";
import {
  cachedPrintHamletBuildingTileUrl,
  lookupHamletBuildingTileArt,
} from "../../card-art/resolve-print-hamlet-building-tile-art";
import { HAMLET_BUILDING_MARKERS } from "../hamlet-building-markers";
import { TabletopRasterImage } from "../tabletop-raster-image";
import { stanceLabelZh } from "../tabletop-stance-label";
import type { TabletopDetailTargetKind } from "../tabletop-detail-types";
import { TabletopStatusList, woundsLine } from "../tabletop-detail-status";
import type { TabletopHeroState, TabletopMonsterState, TabletopQuestMeta } from "../tabletop-types";

const PENDING = "待确认";

function buildingLabel(buildingId: string): string {
  return HAMLET_BUILDING_MARKERS.find((m) => m.id === buildingId)?.label ?? buildingId;
}

function HeroDetail({ hero }: { readonly hero: TabletopHeroState }) {
  return (
    <div className="tt-detail__body" data-testid="tabletop-detail-hero">
      <div className="tt-detail__card-slot" data-asset-type="hero_stat">
        <HeroStatCardFace
          {...(hero.heroStatId ? { heroStatId: hero.heroStatId } : {})}
          label={`${hero.hero} 英雄卡`}
          className="tt-detail__hero-stat"
          testId={`hero-stat-face-${hero.id}`}
        />
      </div>
      <p className="tt-detail__stat" data-testid="tabletop-detail-wounds">
        {woundsLine(hero.wounds, hero.life, hero.lifeKnown)} · 压力 {hero.stress}/10
      </p>
      <p className="tt-detail__stat">
        姿态 {stanceLabelZh(hero.stance)} · 区 {hero.areaId}
        {hero.dead ? " · 阵亡" : ""}
      </p>
      <h4 className="tt-detail__section">当前状态</h4>
      <TabletopStatusList stacks={hero.statusStacks} testId="tabletop-detail-hero-status" />
      {hero.quirkCount > 0 && (
        <p className="tt-detail__stat muted">怪癖 {hero.quirkCount}（明细待确认）</p>
      )}
    </div>
  );
}

function MonsterDetail({
  monster,
  entityName,
}: {
  readonly monster: TabletopMonsterState;
  readonly entityName: (id: string) => string;
}) {
  const prepared = monster.preparedSkill;
  return (
    <div className="tt-detail__body" data-testid="tabletop-detail-monster">
      <div className="tt-detail__card-slot" data-asset-type="monster_medium">
        <MonsterCardFace monsterCardId={monster.monsterCardId} label={monster.name} size="md" />
      </div>
      <p className="tt-detail__stat" data-testid="tabletop-detail-wounds">
        {woundsLine(monster.wounds, monster.life, monster.lifeKnown)}（代币计数，非 HP 条）
      </p>
      {monster.stance && (
        <p className="tt-detail__stat">
          姿态 {stanceLabelZh(monster.stance)} · 区 {monster.areaId}
        </p>
      )}
      <h4 className="tt-detail__section">当前状态 / 修正</h4>
      <TabletopStatusList stacks={monster.statusStacks} testId="tabletop-detail-monster-status" />
      <h4 className="tt-detail__section">本回合选招（只读）</h4>
      {prepared ? (
        <div className="tt-detail__ai-skill" data-testid="tabletop-detail-monster-skill">
          <p>
            技能位 {prepared.skillSlot}：{prepared.skillName}
          </p>
          <p>
            {prepared.selectionRoll === null
              ? "固定技能（不掷选招骰）"
              : `选招 d10=${prepared.selectionRoll}`}
          </p>
          <p>
            卡面目标优先级：{prepared.targetPriority ?? PENDING} · 目标：
            {entityName(prepared.targetId)}
          </p>
        </div>
      ) : (
        <p className="muted">引擎尚未保存本回合选招</p>
      )}
    </div>
  );
}

function RoomDetail({ roomCardId }: { readonly roomCardId: string }) {
  const entry = lookupRoomCardArt(roomCardId);
  const src = entry ? cachedPrintExplorationUrl(entry) : undefined;
  const caption = entry?.name ?? roomCardId;
  return (
    <div className="tt-detail__body" data-testid="tabletop-detail-room">
      <div className="tt-detail__card-slot" data-asset-type="room">
        <TabletopRasterImage
          {...(src ? { src } : {})}
          label={caption}
          assetType="room"
          className="tt-detail__room-img"
          testId={`tabletop-detail-room-img-${roomCardId}`}
        />
      </div>
      <p className="tt-detail__stat">{caption}</p>
      <p className="muted">房间类型 / 板块几何：{PENDING}</p>
    </div>
  );
}

function BuildingDetail({ buildingId }: { readonly buildingId: string }) {
  const tile = lookupHamletBuildingTileArt(buildingId, 2);
  const src = tile ? cachedPrintHamletBuildingTileUrl(tile) : undefined;
  const label = buildingLabel(buildingId);
  return (
    <div className="tt-detail__body" data-testid="tabletop-detail-building">
      <div className="tt-detail__card-slot" data-asset-type="hamlet_building">
        <TabletopRasterImage
          {...(src ? { src } : {})}
          label={`${label} 建筑板块`}
          assetType="hamlet_building"
          className="tt-detail__building-tile"
          testId={`tabletop-detail-building-${buildingId}`}
        />
      </div>
      <h4 className="tt-detail__section">{label}</h4>
      <ul className="tt-detail__service-list">
        <li>今日看守占用：{PENDING}</li>
        <li>服务选项与价格：{PENDING}</li>
        <li>升级费用：{PENDING}</li>
      </ul>
    </div>
  );
}

function QuestDetail({
  questCardId,
  quest,
}: {
  readonly questCardId: string;
  readonly quest: TabletopQuestMeta;
}) {
  return (
    <div className="tt-detail__body" data-testid="tabletop-detail-quest">
      <div className="tt-detail__card-slot" data-asset-type="quest">
        <CoreboxPrintCardFace
          deck="quest"
          cardId={questCardId}
          label={quest.questLabel}
          size="md"
        />
      </div>
      <p className="tt-detail__stat">{quest.questLabel}</p>
      <p className="tt-detail__stat">
        {quest.locationLabel} · {quest.dungeonLevel} · XP {quest.xpProgress}
      </p>
      <p className="muted">
        房间构成 / 柴火需求：{PENDING}（已清理 {quest.roomsCleared}/{quest.roomTotal}）
      </p>
    </div>
  );
}

export function TabletopDetailPanel({
  detailCaption,
  kind,
  targetId,
  quest,
  heroes,
  monsters,
  entityName,
}: {
  readonly detailCaption: string;
  readonly kind: TabletopDetailTargetKind;
  readonly targetId: string | null;
  readonly quest: TabletopQuestMeta;
  readonly heroes: readonly TabletopHeroState[];
  readonly monsters: readonly TabletopMonsterState[];
  readonly entityName: (id: string) => string;
}) {
  const hero = kind === "hero" && targetId ? heroes.find((h) => h.id === targetId) : undefined;
  const monster =
    kind === "monster" && targetId ? monsters.find((m) => m.id === targetId) : undefined;

  const showObject =
    Boolean(hero && !hero.isEmpty) ||
    Boolean(monster) ||
    (kind === "room" && targetId) ||
    (kind === "building" && targetId) ||
    (kind === "quest" && targetId);

  return (
    <aside
      className="tt-detail tt-phase-surface"
      aria-label="选中目标详情"
      data-testid="tabletop-detail"
    >
      <h3 className="tt-detail__title">详情</h3>
      <div className="tt-detail__scroll">
        {!showObject && (
          <p className="tt-detail__hint muted" data-testid="tabletop-detail-phase-hint">
            {detailCaption}
          </p>
        )}
        {hero && !hero.isEmpty && <HeroDetail hero={hero} />}
        {monster && <MonsterDetail monster={monster} entityName={entityName} />}
        {kind === "room" && targetId && <RoomDetail roomCardId={targetId} />}
        {kind === "building" && targetId && <BuildingDetail buildingId={targetId} />}
        {kind === "quest" && targetId && <QuestDetail questCardId={targetId} quest={quest} />}
      </div>
    </aside>
  );
}
