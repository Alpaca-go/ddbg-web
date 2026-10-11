import type { GameEvent } from "@ddbg/engine";

/** 卡面优先级和最终目标分别展示；不从当前 Guard / Mark 逆推选人原因。 */
export function MonsterActionDetails({
  event,
  entityName,
  skillName,
}: {
  readonly event: GameEvent;
  readonly entityName: (id: string) => string;
  readonly skillName: (id: string) => string;
}) {
  if (event.type !== "monsterActionPrepared" && event.type !== "monsterActionSkipped") return null;
  return (
    <div className="state-event-details">
      <p>
        {entityName(event.actorId)} · 技能 {event.skillSlot}：{skillName(event.skillId)} ·{" "}
        {event.selectionRoll === null
          ? "固定技能（不掷选招骰）"
          : `选招 d10=${event.selectionRoll}`}
      </p>
      <p>
        卡面目标优先级：{event.targetPriority} ·{" "}
        {event.type === "monsterActionPrepared"
          ? `最终目标：${entityName(event.targetId)}`
          : "没有有限距离目标，本回合跳过攻击"}
      </p>
    </div>
  );
}
