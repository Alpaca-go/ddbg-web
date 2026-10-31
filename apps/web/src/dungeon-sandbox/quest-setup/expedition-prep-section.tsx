import type { BasicQuestId } from "../../../../../packages/data/src/basic-quests";
import type { QuestCardOption } from "./quest-card-field";
import { QuestCardField } from "./quest-card-field";

export function ExpeditionPrepSection({
  quests,
  questId,
  onQuestIdChange,
  onBack,
  onEmbark,
  error,
  embarking,
}: {
  readonly quests: readonly QuestCardOption[];
  readonly questId: BasicQuestId;
  readonly onQuestIdChange: (id: BasicQuestId) => void;
  readonly onBack: () => void;
  readonly onEmbark: () => void;
  readonly error: string;
  readonly embarking: boolean;
}) {
  return (
    <section className="panel" aria-label="出征准备" data-testid="expedition-prep-section">
      <header className="expedition-prep-header">
        <div>
          <p className="eyebrow">DDBG · PHASE 4</p>
          <h1>出征准备</h1>
          <p>选定本趟任务卡 · 开局掷补给骰 · 单设备1–4人轮流操作</p>
        </div>
      </header>
      <QuestCardField quests={quests} questId={questId} onQuestIdChange={onQuestIdChange} />
      <p>新遗迹战役先确定迫近威胁，再完成开局补给（八颗）；后续任务沿用战役威胁。</p>
      {error && <p role="alert">{error}</p>}
      <div className="expedition-prep-actions">
        <button type="button" onClick={onBack} disabled={embarking}>
          返回建队
        </button>
        <button type="button" onClick={onEmbark} disabled={embarking}>
          进入地牢
        </button>
      </div>
    </section>
  );
}
