import { CoreboxPrintCardFace } from "../../card-art/corebox-print-card-face";
import type { BasicQuestId } from "../../../../../packages/data/src/basic-quests";

export type QuestCardOption = {
  readonly id: BasicQuestId;
  readonly name: string;
  readonly restPoints: number;
  readonly xpKind: "all" | "lair" | "gold" | "objective" | "curio" | "dark" | "camp";
  readonly roomsPerXp: number;
  readonly maxRooms: number;
};

export function QuestGoalNotes({ quest }: { readonly quest: QuestCardOption }) {
  return (
    <>
      <p>
        QuestMap FRONT
        p1（已批准）。从起点S开始，房间代币按任务随机分布，先领取八颗开局补给。普通遗迹全部九面已接通。
      </p>
      <p>
        柴火休息 {quest.restPoints} 点。
        {quest.xpKind === "gold"
          ? "清理至少一间巢穴后，可每捐献20金币获得1XP，最多捐献60金币、获得3XP。"
          : quest.xpKind === "camp"
            ? "在已清理 Empty 房每次消耗 1 Torch 或 1 Shovel 设营获得 1XP，最多 3XP（R-113）。"
            : `每清理${quest.roomsPerXp}${
                quest.xpKind === "lair"
                  ? "间巢穴"
                  : quest.xpKind === "curio"
                    ? "间 Curio 房"
                    : quest.xpKind === "dark"
                      ? "间已点亮暗房"
                      : quest.xpKind === "objective"
                        ? "个目标"
                        : "个房间"
              }获得1XP，最多${quest.maxRooms / quest.roomsPerXp}XP。`}
        任务结算仅记待发XP，回村发放。
      </p>
    </>
  );
}

export function QuestCardField({
  quests,
  questId,
  onQuestIdChange,
  readOnly = false,
}: {
  readonly quests: readonly QuestCardOption[];
  readonly questId: BasicQuestId;
  readonly onQuestIdChange?: (id: BasicQuestId) => void;
  readonly readOnly?: boolean;
}) {
  const selected = quests.find((q) => q.id === questId) ?? quests[0]!;
  return (
    <div className="quest-card-field" data-testid="quest-card-field">
      <label>
        任务卡
        {readOnly ? (
          <p className="quest-card-field__readonly-name" data-testid="quest-card-readonly-name">
            {selected.name}
          </p>
        ) : (
          <select
            aria-label="任务卡"
            value={selected.id}
            onChange={(e) => onQuestIdChange?.(e.target.value as BasicQuestId)}
          >
            {quests.map((q) => (
              <option key={q.id} value={q.id}>
                {q.name}
              </option>
            ))}
          </select>
        )}
      </label>
      <div className="quest-start-card">
        <CoreboxPrintCardFace
          deck="quest"
          cardId={selected.id}
          label={selected.name}
          testId={`quest-card-face-${selected.id}`}
        />
      </div>
      {!readOnly && <QuestGoalNotes quest={selected} />}
    </div>
  );
}
