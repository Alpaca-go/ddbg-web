import type { PendingChoice } from "@ddbg/engine";
import { QuestSummaryPanel } from "../quest-return/quest-summary-panel";
import type { DungeonViewProps } from "../view-props";

export function HamletPhaseView({
  game,
  dispatch,
  formal,
  pendingChoice,
}: DungeonViewProps & { pendingChoice: PendingChoice | null | undefined }) {
  const d = game.dungeon!;
  if (!d.hamlet) return null;
  return (
    <section className="panel hamlet-phase-view" aria-label="村庄准备">
      <h2>村庄准备</h2>
      <QuestSummaryPanel
        game={game}
        dispatch={dispatch}
        formal={formal}
        pendingChoice={pendingChoice}
        events={[]}
        commands={[]}
        includeHamletEvent
      />
    </section>
  );
}
