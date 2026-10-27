import type { GameState, SkillStance } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { BattleEntityCardThumb } from "./card-art/battle-entity-card-thumb";
import { MonsterStanceBoard } from "./card-art/monster-stance-board";
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
}: {
  readonly battle: NonNullable<GameState["battle"]>;
  readonly entityName: (id: string) => string;
  readonly actorId?: string | undefined;
  readonly compact?: boolean;
}) {
  const stanceRows = listMonsterStanceSlots();

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
                      <EntityChip
                        key={e.id}
                        entity={e}
                        entityName={entityName}
                        isActor={actorId === e.id}
                        battle={battle}
                        compact
                        testId={`entity-${e.id}`}
                      />
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
  compact = false,
}: {
  readonly entity: BattleEntity;
  readonly entityName: (id: string) => string;
  readonly isActor: boolean;
  readonly battle: NonNullable<GameState["battle"]>;
  readonly testId?: string;
  readonly compact?: boolean;
}) {
  const widthLabel =
    entity.side === "monster" && entity.stanceSlots && entity.stanceSlots > 1
      ? `占${entity.stanceSlots}格`
      : null;
  const name = entityName(entity.id);

  return (
    <div
      className={[
        "stance-entity-chip",
        entity.side,
        compact ? "stance-entity-chip--compact" : "",
      ].join(" ")}
      data-testid={testId ?? `entity-${entity.id}`}
    >
      <BattleEntityCardThumb entity={entity} label={name} testId={`entity-thumb-${entity.id}`} />
      <div className="stance-entity-text">
        <strong>
          {name}
          {isActor ? " ← 当前" : ""}
          {widthLabel ? ` · ${widthLabel}` : ""}
        </strong>
        <p>
          区域 {entity.areaId} · 伤口 {entity.wounds}/{entity.life}
          {!compact && (
            <>
              {" "}
              · Dodge {entity.dodge}
              {entity.side === "hero"
                ? ` · 压力 ${entity.stress}/10${entity.wounds === entity.life ? " · 死门" : ""}`
                : ""}
            </>
          )}
        </p>
        {!compact && !!entity.statusStacks?.length && (
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
        {!compact && entity.side === "hero" && !!(entity.diseaseId || entity.quirkIds?.length) && (
          <p className="muted" data-testid={`conditions-${entity.id}`}>
            疾病：
            {battle.conditions?.diseases.find((c) => c.id === entity.diseaseId)?.name ?? "无"} ·
            怪癖：
            {entity.quirkIds
              ?.map((id) => battle.conditions?.quirks.find((q) => q.id === id)?.name ?? id)
              .join("、") || "无"}
          </p>
        )}
        {!compact && entity.resolveCardId && (
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
