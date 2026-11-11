import { useState } from "react";
import { CONTENT_PACKS, createQuestSave, loadQuestSave } from "@ddbg/engine";
import { useDungeonStore } from "./store";
import { questSaveKey, writeLocalQuestSave, decodeLocalQuestSave } from "./quest-save-storage";
import {
  legacyTaskSources,
  previousTaskSources,
  sixHeroTaskSources,
  preBossTaskSources,
  preHeroStatReviewTaskSources,
  preAbominationTaskSources,
  preDarkestTaskSources,
  preFanaticTaskSources,
  preCollectorTaskSources,
  preProphetTaskSources,
  preNecromancerTaskSources,
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
      {questStart && (
        <p data-testid="campaign-active-packs">
          {game.dungeon?.contentPacks
            ? `本战役内容包：${CONTENT_PACKS.filter((p) =>
                game.dungeon!.contentPacks!.includes(p.id),
              )
                .map((p) => p.name)
                .join(" + ")}`
            : "旧存档：沿用原内容目录"}
          {" · 英雄与英雄技能全部开放"}
        </p>
      )}
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
                preHeroStatReviewTaskSources,
                preFanaticTaskSources,
                preCollectorTaskSources,
                preProphetTaskSources,
                preNecromancerTaskSources,
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
