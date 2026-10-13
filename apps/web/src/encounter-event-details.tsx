import type { GameEvent } from "@ddbg/engine";

const sides = { hero: "英雄", monster: "怪物" };

/** 轮次 / 阵营 / 角色只取事件；不读取当前回合、姿态或剩余行动。 */
export function EncounterEventDetails({
  event,
  entityName,
}: {
  readonly event: GameEvent;
  readonly entityName: (id: string) => string;
}) {
  switch (event.type) {
    case "roundStarted":
      return <p className="state-event-details">第 {event.round} 轮开始</p>;
    case "turnStarted":
      return (
        <p className="state-event-details">
          第 {event.round} 轮{event.side && ` · 先攻：${sides[event.side]}`}
          {event.actorId && ` · 回合：${entityName(event.actorId)}`}
        </p>
      );
    case "turnEnded":
    case "stanceChanged":
    case "casualtyRemoved": {
      const labels = {
        turnEnded: "回合结束",
        stanceChanged: "换姿态",
        casualtyRemoved: "退出战场",
      };
      return (
        <p className="state-event-details">
          第 {event.round} 轮 · {labels[event.type]}
          {event.actorId && `：${entityName(event.actorId)}`}
        </p>
      );
    }
    case "initiativeDiscarded":
      return (
        <p className="state-event-details">
          第 {event.round} 轮 · 弃置{event.side && sides[event.side]}先攻卡
        </p>
      );
    case "battleFinished":
      return (
        <p className="state-event-details">
          第 {event.round} 轮 · 单场结束
          {event.outcome === "victory" && "：胜利"}
          {event.outcome === "retreat" && "：撤退"}
        </p>
      );
    case "battleHalted":
      return (
        <p className="state-event-details">
          第 {event.round} 轮 ·{" "}
          {event.haltReason === "mutualWipeout" || event.monstersDefeated === true
            ? "双方同次全灭，单场停止，无胜利／撤退奖励"
            : "英雄全灭，单场停止"}
        </p>
      );
    default:
      return null;
  }
}
