import { BattleView } from "../battle-view";
import { QuestSaveControls } from "./quest-save-controls";
import { useDungeonStore } from "./store";
import { DungeonHeader } from "./expedition/dungeon-header";
import { QuestMapPanel } from "./dungeon-map/quest-map-panel";
import { ScoutingPanel } from "./expedition/scouting-panel";

export function DungeonSandbox({ formal = false }: { formal?: boolean } = {}) {
  const { game, events, commands, dispatch, reset, select, page, fixture, preview } =
    useDungeonStore();
  const d = game.dungeon!;
  const pendingChoice = d.deathTrinketChoice ?? d.replacementPreparation?.choice ?? d.pending;
  if (game.battle)
    return (
      <>
        {formal && (
          <div className="shell">
            <QuestSaveControls />
          </div>
        )}
        <BattleView
          game={game}
          dispatch={dispatch}
          events={events}
          commands={commands}
          layout="dungeon"
          notice={events.map((e) => e.message).join("；")}
        />
      </>
    );
  return (
    <main className="shell">
      {formal && <QuestSaveControls />}
      <DungeonHeader game={game} formal={formal} page={page} fixture={fixture} preview={preview} />
      <QuestMapPanel
        game={game}
        formal={formal}
        page={page}
        fixture={fixture}
        preview={preview}
        select={select}
      />
      {!preview && (
        <ScoutingPanel
          game={game}
          dispatch={dispatch}
          events={events}
          commands={commands}
          formal={formal}
          reset={reset}
          pendingChoice={pendingChoice}
        />
      )}
    </main>
  );
}
