import { BattleView } from "../battle-view";
import { TabletopFormalShell } from "../tabletop/tabletop-formal-shell";
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
  const hamletPhase = Boolean(d.hamlet);
  const questReturnPhase = Boolean(d.hamletReturn || d.phase === "exited");
  const showDungeonMap = !hamletPhase && !questReturnPhase;
  const body = game.battle ? (
    <>
      {formal && <QuestSaveControls />}
      <BattleView
        game={game}
        dispatch={dispatch}
        events={events}
        commands={commands}
        layout="dungeon"
        notice={events.map((e) => e.message).join("；")}
      />
    </>
  ) : (
    <main className="shell">
      {formal && <QuestSaveControls />}
      {showDungeonMap && (
        <DungeonHeader game={game} formal={formal} page={page} fixture={fixture} preview={preview} />
      )}
      {showDungeonMap && (
        <QuestMapPanel
          game={game}
          formal={formal}
          page={page}
          fixture={fixture}
          preview={preview}
          select={select}
        />
      )}
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
  if (formal) return <TabletopFormalShell>{body}</TabletopFormalShell>;
  if (game.battle) {
    return (
      <>
        <div className="shell">
          <QuestSaveControls />
        </div>
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
  }
  return body;
}
