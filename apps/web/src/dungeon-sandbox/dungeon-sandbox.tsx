import type { GameState } from "@ddbg/engine";
import { BattleView } from "../battle-view";
import { TabletopFormalShell } from "../tabletop/tabletop-formal-shell";
import { QuestSaveControls } from "./quest-save-controls";
import { useDungeonStore } from "./store";
import { DungeonHeader } from "./expedition/dungeon-header";
import { QuestMapPanel } from "./dungeon-map/quest-map-panel";
import { ScoutingPanel } from "./expedition/scouting-panel";
import { FormalDungeonExplorationView } from "./formal/formal-dungeon-exploration-view";

function isFormalDungeonTabletopExploration(game: GameState, formal: boolean): boolean {
  if (!formal || game.battle) return false;
  const d = game.dungeon;
  if (!d) return false;
  if (d.hamlet || d.hamletReturn || d.phase === "exited") return false;
  if (d.phase === "awaitingProvisions") return false;
  return true;
}

export function DungeonSandbox({ formal = false }: { formal?: boolean } = {}) {
  const { game, events, commands, dispatch, reset, select, page, fixture, preview } =
    useDungeonStore();
  const d = game.dungeon!;
  const pendingChoice = d.deathTrinketChoice ?? d.replacementPreparation?.choice ?? d.pending;
  const hamletPhase = Boolean(d.hamlet);
  const questReturnPhase = Boolean(d.hamletReturn || d.phase === "exited");
  const showDungeonMap = !hamletPhase && !(formal && questReturnPhase);
  const formalTabletopExploration = isFormalDungeonTabletopExploration(game, formal);
  const body = game.battle ? (
    <>
      {formal && <QuestSaveControls />}
      <BattleView
        formal={formal}
        game={game}
        dispatch={dispatch}
        events={events}
        commands={commands}
        layout="dungeon"
        notice={formal ? (events.at(-1)?.message ?? "") : events.map((e) => e.message).join("；")}
      />
    </>
  ) : formalTabletopExploration && !preview ? (
    <main className="shell shell--formal-exploration">
      <QuestSaveControls />
      <FormalDungeonExplorationView
        game={game}
        dispatch={dispatch}
        events={events}
        commands={commands}
        formal
        reset={reset}
        pendingChoice={pendingChoice}
      />
    </main>
  ) : (
    <main className="shell">
      {formal && <QuestSaveControls />}
      {showDungeonMap && (
        <DungeonHeader
          game={game}
          formal={formal}
          page={page}
          fixture={fixture}
          preview={preview}
        />
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
