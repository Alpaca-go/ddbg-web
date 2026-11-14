import { createCoreDungeonQuest } from "../../../../packages/engine/src/dungeon-quest-entry";
import {
  coreParty,
  coreQuestSources,
} from "../../../../packages/engine/src/test-helpers/core-quest";
import { naturalQuest } from "../../../../packages/engine/src/test-helpers/natural-quest";
import type { GameState } from "../../../../packages/engine/src/command";

/** 真实 seed 6 公开命令的 UI 检查点，不注入伤口、战斗结局或 RNG。 */
export function hagUiFixture() {
  const initial = createCoreDungeonQuest(
    6,
    "quest:p019",
    "standard",
    coreParty,
    coreQuestSources,
    true,
    null,
    ["core", "weald"],
  );
  let bound: GameState | undefined, release: GameState | undefined;
  const run = naturalQuest(6, "quest:p019", true, coreQuestSources, 2, {
    continueFrom: initial,
    locationBosses: true,
    locationSources: true,
    observe(state, command) {
      if (
        command.type === "prepareDungeonBattle" &&
        state.dungeon?.roomCards?.active?.cardId === "room:weald:p010"
      )
        bound = state;
      if (!release && state.battle?.pending?.type === "hagRelease") release = state;
    },
  });
  if (run.stopReason || !bound || !release) throw new Error("Hag 自然 UI 检查点不完整");
  return {
    bound,
    release,
    initial: createCoreDungeonQuest(
      1,
      "quest:p019",
      "standard",
      coreParty,
      coreQuestSources,
      true,
      null,
      ["core", "weald"],
    ),
  };
}
