import type { GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { BattlePositionRaster } from "./card-art/battle-position-raster";
import {
  lookupHeroTokenArt,
  lookupStanceSlotArt,
  listStanceSlotArt,
} from "./card-art/resolve-battle-position-art";

const stances: SkillStance[] = ["aggressive", "defensive", "ranged", "support"];

const statusLabels = {
  bleed: "流血",
  blight: "腐蚀",
  stun: "眩晕",
  buff: "增益",
  debuff: "减益",
  mark: "标记",
  guard: "守护",
  riposte: "反击",
  protection: "防护",
} as const;

type BattleEntity = NonNullable<GameState["battle"]>["entities"][number];

export function BattleStanceTrack({
  battle,
  entityName,
  actorId,
}: {
  readonly battle: NonNullable<GameState["battle"]>;
  readonly entityName: (id: string) => string;
  readonly actorId?: string | undefined;
}) {
  const stanceRows = listStanceSlotArt();

  return (
    <section className="stance-track" aria-label="站位轨道">
      <p className="muted stance-track-note">
        四格站位（进攻→支援）：色条来自 TTS「Color Room
        Tiles」本地缓存；无缓存时显示占位与文字标签。
      </p>
      <div className="stance-track-grid">
        {(["hero", "monster"] as const).map((side) => (
          <div className={`stance-track-side stance-track-${side}`} key={side}>
            <h3>{side === "hero" ? "英雄站位" : "怪物站位"}</h3>
            {stances.map((stance) => {
              const row =
                stanceRows.find((r) => r.stance === stance) ?? lookupStanceSlotArt(stance);
              const occupants = battle.entities.filter(
                (e) => e.side === side && !e.dead && e.stance === stance,
              );
              return (
                <div
                  className={`stance-slot stance-slot-row stance-slot-${stance}`}
                  key={stance}
                  data-testid={`stance-${side}-${stance}`}
                >
                  <span className="stance-label">{row?.labelZh ?? stance}</span>
                  <div className="stance-slot-row-head">
                    <span className="stance-rank" aria-hidden="true">
                      {row?.rank ?? "—"}
                    </span>
                  </div>
                  <div
                    className={`stance-slot-strip ${row?.cacheName ? "has-art" : "fallback-strip"}`}
                  >
                    {row?.cacheName && (
                      <BattlePositionRaster
                        cacheName={row.cacheName}
                        alt={`${side === "hero" ? "英雄" : "怪物"}${row.labelZh}站位色条`}
                        className="stance-slot-strip-img"
                        testId={`stance-strip-${side}-${stance}`}
                      />
                    )}
                    <div className="stance-slot-occupants">
                      {occupants.length === 0 && <span className="stance-empty muted">空</span>}
                      {occupants.map((e) => (
                        <EntityChip
                          key={e.id}
                          entity={e}
                          entityName={entityName}
                          isActor={actorId === e.id}
                          battle={battle}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {battle.entities.some((e) => e.dead) && (
        <p className="muted">
          阵亡：
          {battle.entities
            .filter((e) => e.dead)
            .map((e) => entityName(e.id))
            .join("、")}
        </p>
      )}
    </section>
  );
}

function EntityChip({
  entity,
  entityName,
  isActor,
  battle,
}: {
  readonly entity: BattleEntity;
  readonly entityName: (id: string) => string;
  readonly isActor: boolean;
  readonly battle: NonNullable<GameState["battle"]>;
}) {
  const heroToken = entity.hero ? lookupHeroTokenArt(entity.hero) : undefined;
  const widthLabel =
    entity.side === "monster" && entity.stanceSlots && entity.stanceSlots > 1
      ? `占${entity.stanceSlots}格`
      : null;

  return (
    <div className={`stance-entity-chip ${entity.side}`} data-testid={`entity-${entity.id}`}>
      {heroToken && (
        <BattlePositionRaster
          cacheName={heroToken.cacheName}
          alt={entityName(entity.id)}
          className="stance-hero-token"
          testId={`hero-token-${entity.id}`}
        />
      )}
      <div className="stance-entity-text">
        <strong>
          {entityName(entity.id)}
          {isActor ? " ← 当前" : ""}
          {widthLabel ? ` · ${widthLabel}` : ""}
        </strong>
        <p>
          区域 {entity.areaId} · 伤口 {entity.wounds}/{entity.life} · Dodge {entity.dodge}
          {entity.side === "hero"
            ? ` · 压力 ${entity.stress}/10${entity.wounds === entity.life ? " · 死门" : ""}`
            : ""}
        </p>
        {!!entity.statusStacks?.length && (
          <p className="muted">
            状态：
            {entity.statusStacks
              .map(
                (stack) =>
                  `${statusLabels[stack.kind]}${stack.amount === undefined ? "" : ` ${stack.amount}`} / ${stack.remaining}t`,
              )
              .join("；")}
          </p>
        )}
        {entity.side === "hero" && !!(entity.diseaseId || entity.quirkIds?.length) && (
          <p className="muted" data-testid={`conditions-${entity.id}`}>
            疾病：
            {battle.conditions?.diseases.find((c) => c.id === entity.diseaseId)?.name ?? "无"} ·
            怪癖：
            {entity.quirkIds
              ?.map((id) => battle.conditions?.quirks.find((q) => q.id === id)?.name ?? id)
              .join("、") || "无"}
          </p>
        )}
        {entity.resolveCardId && (
          <p className="muted">
            意志卡：
            {battleData.resolveCards.find((card) => card.id === entity.resolveCardId)?.name ??
              entity.resolveCardId}{" "}
            · 压力红面
          </p>
        )}
      </div>
    </div>
  );
}
