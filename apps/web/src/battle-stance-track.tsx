import type { GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { MonsterCardFace } from "./card-art/monster-card-face";
import { BattlePositionRaster } from "./card-art/battle-position-raster";
import { MonsterStanceBoard } from "./card-art/monster-stance-board";
import { lookupHeroStandeeArt } from "./card-art/resolve-print-hero-standee-art";
import { listMonsterStanceSlots } from "./card-art/resolve-print-monster-stance-art";

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
  compact = false,
  visual = false,
}: {
  readonly battle: NonNullable<GameState["battle"]>;
  readonly entityName: (id: string) => string;
  readonly actorId?: string | undefined;
  readonly compact?: boolean;
  /** 正式战斗：四格站位板 + 简令牌，减少文字折叠。 */
  readonly visual?: boolean;
}) {
  const stanceRows = listMonsterStanceSlots();

  if (compact && visual) {
    return (
      <section className="tt-battle-stances tt-battle-stances--visual" aria-label="站位轨道">
        {(["hero", "monster"] as const).map((side) => {
          const occupantCountByStance = Object.fromEntries(
            stances.map((stance) => [
              stance,
              battle.entities.filter((e) => e.side === side && !e.dead && e.stance === stance)
                .length,
            ]),
          ) as Record<SkillStance, number>;

          return (
            <div className={`stance-track-side stance-track-${side}`} key={side}>
              <h3>{side === "hero" ? "英雄姿态轨" : "怪物姿态轨"}</h3>
              <MonsterStanceBoard
                sideLabel={side === "hero" ? "英雄" : "怪物"}
                testIdPrefix={`stance-${side}`}
                slots={stanceRows}
                occupantCountByStance={occupantCountByStance}
                renderOccupants={(stance) => {
                  const occupants = battle.entities.filter(
                    (e) => e.side === side && !e.dead && e.stance === stance,
                  );
                  return (
                    <>
                      {occupants.length === 0 && <span className="stance-empty muted">空</span>}
                      {occupants.map((e) => (
                        <div
                          key={e.id}
                          className={`tt-stance-token ${e.side} ${actorId === e.id ? "tt-stance-token--actor" : ""}`}
                          data-testid={`entity-${e.id}`}
                          title={`${entityName(e.id)} · 区域 ${e.areaId}`}
                        >
                          <span className="tt-stance-token__name">{entityName(e.id)}</span>
                          <span className="tt-stance-token__area">{e.areaId}</span>
                        </div>
                      ))}
                    </>
                  );
                }}
              />
            </div>
          );
        })}
      </section>
    );
  }

  if (compact) {
    return (
      <section className="tt-battle-stances" aria-label="站位轨道">
        {(["hero", "monster"] as const).map((side) => (
          <div key={side} className="tt-battle-stances__side">
            <h3>{side === "hero" ? "英雄站位" : "怪物站位"}</h3>
            <div className="tt-battle-stances__slots">
              {stanceRows.map((slot) => (
                <div key={slot.stance} className="tt-battle-stances__slot">
                  <h4>{slot.labelZh}</h4>
                  {battle.entities
                    .filter((e) => e.side === side && !e.dead && e.stance === slot.stance)
                    .map((e) => (
                      <details key={e.id} className={side} data-testid={`entity-${e.id}`}>
                        <summary>
                          <strong>
                            {entityName(e.id)}
                            {actorId === e.id ? " ← 当前" : ""}
                          </strong>
                          <span>
                            区域 {e.areaId} · 伤口 {e.wounds}/{e.life}
                          </span>
                          {e.side === "monster" && (e.stanceSlots ?? 0) > 1 && (
                            <span>占 {e.stanceSlots} 格</span>
                          )}
                        </summary>
                        <EntityChip
                          entity={e}
                          entityName={entityName}
                          isActor={actorId === e.id}
                          battle={battle}
                          testId={`entity-detail-${e.id}`}
                        />
                      </details>
                    ))}
                  {!battle.entities.some(
                    (e) => e.side === side && !e.dead && e.stance === slot.stance,
                  ) && <span className="muted">空</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
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

  return (
    <section className="stance-track" aria-label="站位轨道">
      <p className="muted stance-track-note">
        四格站位（进攻→支援）：背景为印刷 Monster Stance 整板 TrimBox PNG（
        <code>.cache/print-card-art</code>）；英雄立牌为 DH 冲压板 Rubine 刀线 bbox
        PNG，无本地图时占位，不回退 TTS <code>hero-token-*</code>。怪物头像为印刷
        PNG，缺图时占位（无 TTS 回退）。
      </p>
      <div className="stance-track-grid">
        {(["hero", "monster"] as const).map((side) => {
          const occupantCountByStance = Object.fromEntries(
            stances.map((stance) => [
              stance,
              battle.entities.filter((e) => e.side === side && !e.dead && e.stance === stance)
                .length,
            ]),
          ) as Record<SkillStance, number>;

          return (
            <div className={`stance-track-side stance-track-${side}`} key={side}>
              <h3>{side === "hero" ? "英雄站位" : "怪物站位"}</h3>
              <MonsterStanceBoard
                sideLabel={side === "hero" ? "英雄" : "怪物"}
                testIdPrefix={`stance-${side}`}
                slots={stanceRows}
                occupantCountByStance={occupantCountByStance}
                renderOccupants={(stance) => {
                  const occupants = battle.entities.filter(
                    (e) => e.side === side && !e.dead && e.stance === stance,
                  );
                  return (
                    <>
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
                    </>
                  );
                }}
              />
            </div>
          );
        })}
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
  testId,
}: {
  readonly entity: BattleEntity;
  readonly entityName: (id: string) => string;
  readonly isActor: boolean;
  readonly battle: NonNullable<GameState["battle"]>;
  readonly testId?: string;
}) {
  const heroStandee = entity.hero ? lookupHeroStandeeArt(entity.hero) : undefined;
  const widthLabel =
    entity.side === "monster" && entity.stanceSlots && entity.stanceSlots > 1
      ? `占${entity.stanceSlots}格`
      : null;

  return (
    <div
      className={`stance-entity-chip ${entity.side}`}
      data-testid={testId ?? `entity-${entity.id}`}
    >
      {heroStandee && (
        <BattlePositionRaster
          standee={heroStandee}
          alt={entityName(entity.id)}
          className="stance-hero-token"
          testId={`hero-standee-${entity.id}`}
        />
      )}
      {entity.side === "monster" && entity.monsterCardId && (
        <MonsterCardFace
          monsterCardId={entity.monsterCardId}
          label={entityName(entity.id)}
          size="chip"
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
