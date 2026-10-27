import type { BattleState, HeroSkillCardView } from "@ddbg/engine";
import { battleData } from "virtual:battle-data";
import { BattleStanceTrack } from "./battle-stance-track";
import {
  battleAreaDistance,
  printedAreaRangeReach,
  printedAreaRangeReachLabel,
  STANCE_SHORT_ZH,
} from "./battle-spatial-display";

type BattleEntity = BattleState["entities"][number];

export function BattleFormalBoard({
  battle,
  entityName,
  actor,
  skill,
  selectedTargetId,
  selectedAreaId,
  path,
  pendingArea,
  pendingAreaIds,
}: {
  readonly battle: BattleState;
  readonly entityName: (id: string) => string;
  readonly actor?: BattleEntity;
  readonly skill?: HeroSkillCardView;
  readonly selectedTargetId?: string;
  readonly selectedAreaId?: string;
  readonly path?: readonly string[];
  readonly pendingArea?: boolean;
  readonly pendingAreaIds?: readonly string[];
}) {
  const actorAreaId = actor?.areaId;
  const reachByArea =
    skill && actorAreaId
      ? Object.fromEntries(
          battle.areas.map((area) => [
            area.id,
            printedAreaRangeReach(skill, actorAreaId, area.id, battle.areas),
          ]),
        )
      : null;

  return (
    <section className="panel board tt-battle-board" aria-label="区域板">
      <header className="tt-battle-board__head">
        <h2>
          {battle.roomName ?? battleData.tileName} <small>站位与邻接</small>
        </h2>
        {actorAreaId && (
          <p className="tt-battle-board__actor" data-testid="battle-actor-position">
            当前行动者在区域 <strong>{actorAreaId}</strong>
            {actor?.stance && (
              <>
                {" "}
                · 姿态 <strong>{STANCE_SHORT_ZH[actor.stance]}</strong>
              </>
            )}
            {skill && (
              <span className="tt-battle-board__range-hint muted">
                {" "}
                · 选技能后各区域标注与卡面射程的距离对比（不含姿态/目标类型）
              </span>
            )}
          </p>
        )}
      </header>
      <BattleStanceTrack
        battle={battle}
        entityName={entityName}
        actorId={actor?.id}
        compact
        visual
      />
      <div className="area-grid tt-battle-area-grid" data-testid="battle-area-grid">
        {battle.areas.map((area) => {
          const occupants = battle.entities.filter((e) => !e.dead && e.areaId === area.id);
          const count = occupants.reduce(
            (sum, e) => sum + (e.side === "hero" ? 1 : e.stanceSlots!),
            0,
          );
          const distance =
            actorAreaId !== undefined
              ? battleAreaDistance(battle.areas, actorAreaId, area.id)
              : null;
          const reach = reachByArea?.[area.id];
          const onMovePath = path?.includes(area.id);
          const isActorArea = actor?.areaId === area.id;
          const isTargetArea = selectedAreaId === area.id;
          const choiceArea = pendingArea && pendingAreaIds?.includes(area.id);
          return (
            <article
              className={[
                "area",
                "tt-battle-area",
                isActorArea ? "active-area" : "",
                choiceArea ? "choice-area" : "",
                onMovePath ? "tt-battle-area--path" : "",
                reach === "in" || reach === "self" ? "tt-battle-area--range-in" : "",
                reach === "out" ? "tt-battle-area--range-out" : "",
                isTargetArea ? "tt-battle-area--target-zone" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              key={area.id}
              data-testid={`area-${area.id}`}
              data-area-distance={distance ?? undefined}
              data-range-reach={reach ?? undefined}
            >
              <div className="area-heading">
                <h3>{area.id}</h3>
                <span className="tt-battle-area__meta">
                  {count}/{area.capacity} 格
                  {distance !== null && (
                    <span
                      className="tt-battle-area__distance"
                      data-testid={`area-distance-${area.id}`}
                    >
                      · 距行动者 {distance}
                    </span>
                  )}
                  {reach && skill && (
                    <span
                      className={`tt-battle-area__reach tt-battle-area__reach--${reach}`}
                      data-testid={`area-reach-${area.id}`}
                    >
                      · {printedAreaRangeReachLabel(reach)}
                    </span>
                  )}
                  {area.elevation === "high"
                    ? " · 高地"
                    : area.elevation === "low"
                      ? " · 低地"
                      : ""}
                </span>
              </div>
              <p className="connections">邻接 {area.adjacent.join(" · ") || "无"}</p>
              <AreaRules area={area} battle={battle} />
              <ul className="tt-battle-area__occupants">
                {occupants.map((e) => {
                  const selected = selectedTargetId === e.id;
                  const entityReach =
                    skill && actorAreaId
                      ? printedAreaRangeReach(skill, actorAreaId, e.areaId, battle.areas)
                      : null;
                  return (
                    <li
                      key={e.id}
                      className={[
                        e.side,
                        "tt-battle-occupant",
                        e.id === actor?.id ? "tt-battle-occupant--actor" : "",
                        selected ? "tt-battle-occupant--selected" : "",
                        entityReach === "out" ? "tt-battle-occupant--range-out" : "",
                        entityReach === "in" || entityReach === "self"
                          ? "tt-battle-occupant--range-in"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      data-testid={`area-occupant-${e.id}`}
                    >
                      <span className="tt-battle-occupant__stance">
                        {e.stance ? STANCE_SHORT_ZH[e.stance] : "—"}
                      </span>
                      <span className="tt-battle-occupant__name">
                        {entityName(e.id)}
                        {e.id === actor?.id ? " · 行动中" : ""}
                      </span>
                      <span className="tt-battle-occupant__stats muted">
                        伤口 {e.wounds}/{e.life}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function AreaRules({
  area,
  battle,
}: {
  readonly area: BattleState["areas"][number];
  readonly battle: BattleState;
}) {
  const lines: string[] = [];
  if (area.endTurnStress === 1) {
    lines.push(`${area.endTurnStressName ?? "Cornered"}：英雄结束回合压力 +1`);
  }
  if (area.endTurnStress === -1) lines.push("Beacon of Light：英雄结束回合恢复 1 压力");
  if (area.healingForbidden) lines.push("Unholy Aura：英雄不能治疗或被治疗");
  if (area.ancestorGlory) {
    lines.push("Ancestor’s Glory：站立英雄免疫并移除多种状态；自身效果遵循 R20");
  }
  if (area.feelingThePresence) {
    lines.push("Feeling the Presence：结束回合压力与怪癖相关治疗");
  }
  if (area.spikedPit) lines.push("Spiked Pit：落坑或结束回合站立时受伤流血");
  if (area.invokerGoal) lines.push("The Invokers：末只可行动怪物向本区移动");
  if (area.invokingAbyss) lines.push("Invoking Abyss：轮末本区有怪物则全体英雄压力 +2");
  if (area.lootTheChest) lines.push("Loot the Chest：2 行动抽饰品，每场一次");
  if (area.hideAndHeal) lines.push("Hide and Heal：无怪物时 1 行动清伤口（压力 +2）");
  if (area.circleOfPower) lines.push("Circle of Power：怪物结束回合治疗 4");
  if (area.endTurnHeal === 3) lines.push("Healing Waters：英雄结束回合治疗 3");
  if (battle.loot?.placed.some((token) => token.areaId === area.id)) {
    lines.push("宝箱：同区可花行动拾取");
  }
  if (!lines.length) return null;
  return (
    <details className="tt-area-rules">
      <summary>区域效果（{lines.length}）</summary>
      <ul>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </details>
  );
}
