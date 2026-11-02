import { useState } from "react";
import { createQuestSave, loadQuestSave } from "@ddbg/engine";
import { useDungeonStore } from "./store";
import { questSaveKey, writeLocalQuestSave, decodeLocalQuestSave } from "./quest-save-storage";
import {
  legacyTaskSources,
  previousTaskSources,
  sixHeroTaskSources,
  preBossTaskSources,
  preAbominationTaskSources,
  preDarkestTaskSources,
  taskSources,
} from "./task-sources";

export function QuestSaveControls({ onLoad }: { onLoad?: () => void }) {
  const { game, commands, questStart, restoreTask } = useDungeonStore();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "存档操作失败，原进度保持不变");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="panel" aria-label="任务存档">
      <div className="button-row">
        {questStart && (
          <button
            disabled={busy}
            onClick={() =>
              run(async () => {
                const save = createQuestSave(questStart, commands, game, taskSources);
                await writeLocalQuestSave(JSON.stringify(save));
                setNotice("已保存到本机，可刷新后读取继续。");
              })
            }
          >
            保存进度
          </button>
        )}
        <button
          disabled={busy}
          onClick={() =>
            run(async () => {
              const raw = localStorage.getItem(questSaveKey);
              if (!raw) throw new Error("本机还没有任务存档");
              const json = await decodeLocalQuestSave(raw);
              if (useDungeonStore.getState().game !== game)
                throw new Error("读取期间进度已变化，请再次读取存档");
              const loaded = loadQuestSave(JSON.parse(json), taskSources, [
                preDarkestTaskSources,
                preAbominationTaskSources,
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
