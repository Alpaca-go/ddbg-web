import type { GameState } from "../../../../packages/engine/src/command";
import { applyCommand } from "../../../../packages/engine/src/command";
import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import { coreParty } from "../../../../packages/engine/src/test-helpers/core-quest";
import { taskSources } from "../../src/dungeon-sandbox/task-sources";

/** quest:p016 目标房入口夹具，不声称从自然最暗战役获得任务。 */
export function shufflingHorrorRoomFixture(mode: "standard" | "radiant"): GameState {
  const s = createCoreDungeonQuest(7, "quest:p016", mode, coreParty, taskSources, true);
  const d = s.dungeon!;
  const room = d.rooms.find((r) => r.kind === "objective")!;
  const entered: GameState = {
    ...s,
    dungeon: {
      ...d,
      phase: "awaitingRoom",
      position: room.id,
      rooms: d.rooms.map((r) => (r.kind === "objective" ? { ...r, revealed: true } : r)),
    },
  };
  const result = applyCommand(entered, { type: "prepareDungeonBattle" });
  const refused = result.events.filter((e) => e.type === "commandRefused");
  if (refused.length) throw new Error(refused.map((e) => e.message).join("; "));
  return result.state;
}
