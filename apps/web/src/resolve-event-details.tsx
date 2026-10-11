import type { GameEvent, ResolveCard } from "@ddbg/engine";

const roles = { virtue: "美德", affliction: "折磨" };

/** 卡名 / 分类查已批准目录；卡 ID 取事件，不取英雄后来持有的卡。 */
export function ResolveEventDetails({
  event,
  entityName,
  cards,
}: {
  readonly event: GameEvent;
  readonly entityName: (id: string) => string;
  readonly cards: readonly ResolveCard[];
}) {
  if (event.type === "heartAttack")
    return <p className="state-event-details">{entityName(event.entityId)} · 心脏病死亡</p>;
  if (event.type !== "resolveTested" && event.type !== "resolveTriggered") return null;
  const card = cards.find((card) => card.id === event.cardId && !card.verification.unverified);
  const label = `${card ? roles[card.role] : "意志卡"}：${card?.name ?? event.cardId}`;
  return (
    <p className="state-event-details">
      {entityName(event.entityId)} ·{" "}
      {event.type === "resolveTested"
        ? `获得${label} · 检定后压力归零`
        : `${label} · 回合开始效果${event.triggered ? "已触发" : "未触发"}`}
    </p>
  );
}
