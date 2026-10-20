import type { PendingChoice } from "@ddbg/engine";
import { FundraiserChoice } from "../fundraiser-choice";
import type { DungeonDispatch } from "../view-props";

export function DungeonPendingChoice({
  pendingChoice,
  dispatch,
}: {
  pendingChoice: PendingChoice | null | undefined;
  dispatch: DungeonDispatch;
}) {
  if (!pendingChoice) return null;
  return (
    <div className="dungeon-pending-choice">
      <p>{pendingChoice.prompt}</p>
      {pendingChoice.id.startsWith("dungeon-fundraiser:") ? (
        <FundraiserChoice
          key={pendingChoice.id}
          choice={pendingChoice}
          choose={(optionId) =>
            dispatch({ type: "resolveChoice", choiceId: pendingChoice.id, optionId })
          }
        />
      ) : (
        pendingChoice.options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() =>
              dispatch({
                type: "resolveChoice",
                choiceId: pendingChoice.id,
                optionId: o.id,
              })
            }
          >
            {o.label}
          </button>
        ))
      )}
    </div>
  );
}
