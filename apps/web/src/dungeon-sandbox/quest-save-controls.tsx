import { useState } from "react";
import { createQuestSave, loadQuestSave } from "@ddbg/engine";
import { useDungeonStore } from "./store";
import {
  legacyTaskSources,
  previousTaskSources,
  sixHeroTaskSources,
  preBossTaskSources,
  taskSources,
} from "./task-sources";

const questSaveKey = "ddbg.core-quest.save.v1";

export function QuestSaveControls({ onLoad }: { onLoad?: () => void }) {
  const { game, commands, questStart, restoreTask } = useDungeonStore();
  const [notice, setNotice] = useState("");
  const run = (action: () => void) => {
    try {
      action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "存档操作失败，原进度保持不变");
    }
  };
  return (
    <section className="panel" aria-label="任务存档">
      <div className="button-row">
        {questStart && (
          <button
            onClick={() =>
              run(() => {
                const save = createQuestSave(questStart, commands, game, taskSources);
                localStorage.setItem(questSaveKey, JSON.stringify(save));
                setNotice("已保存到本机，可刷新后读取继续。");
              })
            }
          >
            保存进度
          </button>
        )}
        <button
          onClick={() =>
            run(() => {
              const raw = localStorage.getItem(questSaveKey);
              if (!raw) throw new Error("本机还没有任务存档");
              const loaded = loadQuestSave(JSON.parse(raw), taskSources, [
                preBossTaskSources,
                sixHeroTaskSources,
                previousTaskSources,
                legacyTaskSources,
              ]);
              restoreTask(loaded);
              setNotice("已读取进度，可继续当前行动或待选决定。");
              onLoad?.();
            })
          }
        >
          读取本机存档
        </button>
      </div>
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
