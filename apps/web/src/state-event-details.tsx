import type { GameEvent } from "@ddbg/engine";
import { provisionLabels, provisionEffectLabels } from "./provision-labels";

/** 只显示事件记录的历史事实；不从当前棋子位置 / 伤口补字段。 */
export function StateEventDetails({
  event,
  entityName,
}: {
  readonly event: GameEvent;
  readonly entityName: (id: string) => string;
}) {
  switch (event.type) {
    case "provisionRolled":
    case "provisionSelected":
      return (
        <p className="state-event-details">
          {entityName(event.actorId)} ·{" "}
          {event.type === "provisionSelected" ? "选择骰面" : "补给骰面"}：
          {event.face === "wild" ? "Wild（待选）" : provisionLabels[event.face]}
        </p>
      );
    case "provisionConsumed":
      return (
        <p className="state-event-details">
          {entityName(event.entityId)} · 消耗：{provisionLabels[event.face]}
          {event.effect === "discard"
            ? " · 弃掉补给，不执行通常效果"
            : ` · 所选效果：${provisionEffectLabels[event.effect]}`}
        </p>
      );
    case "lootRevealed":
    case "lootResolved":
      return (
        <p className="state-event-details">
          {entityName(event.actorId)} · {event.type === "lootRevealed" ? "翻开宝箱" : "宝箱奖励"}
          {event.type === "lootResolved" &&
            ("gold" in event.reward
              ? ` · 获得金币 ${event.reward.gold}`
              : ` · 获得补给：${provisionLabels[event.reward.face]}`)}
        </p>
      );
    case "heroMoved":
      return (
        <p className="state-event-details">
          {entityName(event.actorId)} · 区域路径：{[event.from, ...event.path].join(" → ")}
        </p>
      );
    case "monsterPositioned":
      return (
        <div className="state-event-details">
          <p>
            {entityName(event.actorId)} · 定位：{event.from} → {event.to} · 移动 {event.steps} 步
            {event.skipped && " · 本次不攻击"}
          </p>
          {event.displaced && (
            <p>
              挤出角色：{entityName(event.displaced.entityId)} · {event.displaced.from} →{" "}
              {event.displaced.to}
            </p>
          )}
        </div>
      );
    case "shuffleResolved":
      return (
        <p className="state-event-details">
          {entityName(event.entityId)} · 区域落点：
          {event.path.length ? event.path.join(" → ") : "未改变区域"} · 姿态位移 {event.stanceSteps}{" "}
          格
        </p>
      );
    case "statusTurnStarted":
      return (
        <p className="state-event-details">
          {entityName(event.entityId)} · 同时伤口{" "}
          {event.woundAmounts.reduce((sum, amount) => sum + amount, 0)}
          {event.stunned && " · 眩晕生效"}
        </p>
      );
    case "heroHealthResolved":
      return (
        <p className="state-event-details">
          {entityName(event.entityId)} · 结算后伤口 {event.resolution.state.wounds}/
          {event.resolution.state.life}
          {event.resolution.enteredDeathDoor && " · 进入死门"}
          {event.resolution.leftDeathDoor && " · 离开死门"}
          {event.resolution.face !== null &&
            ` · 死门骰：${event.resolution.face === "skull" ? "骷髅" : "空白"}`}
          {event.resolution.deathblow && " · 死亡"}
        </p>
      );
    default:
      return null;
  }
}
