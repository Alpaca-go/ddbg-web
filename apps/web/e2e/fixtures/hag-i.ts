import { createQuestSave } from "../../../../packages/engine/src/shared/quest/quest-save";
import type { CoreQuestSources } from "../../../../packages/engine/src/shared/dungeon/dungeon-quest-entry";
import type { Command } from "../../../../packages/engine/src/shared/core/command";
import { createCoreDungeonQuest } from "../../../../packages/engine/src/shared/dungeon/dungeon-quest-entry";
import { coreParty, coreQuestSources } from "../../../../packages/engine/tests/helpers/core-quest";
import { naturalQuest } from "../../../../packages/engine/tests/helpers/natural-quest";
import type { GameState } from "../../../../packages/engine/src/shared/core/command";

/** 真实 seed 6 公开命令的 UI 检查点，不注入伤口、战斗结局或 RNG。 */
export function hagUiFixture(sources: CoreQuestSources = coreQuestSources) {
  const initial = createCoreDungeonQuest(
    6,
    "quest:p019",
    "standard",
    coreParty,
    sources,
    true,
    null,
    ["core", "weald"],
  );
  let bound: GameState | undefined, release: GameState | undefined;
  const commands: Command[] = [];
  let releaseCount = 0;
  const run = naturalQuest(6, "quest:p019", true, sources, 2, {
    continueFrom: initial,
    locationBosses: true,
    locationSources: true,
    observe(state, command) {
      commands.push(command);
      if (
        command.type === "prepareDungeonBattle" &&
        state.dungeon?.roomCards?.active?.cardId === "room:weald:10"
      )
        bound = state;
      if (!release && state.battle?.pending?.type === "hagRelease") {
        release = state;
        releaseCount = commands.length;
      }
    },
  });
  if (run.stopReason || !bound || !release) throw new Error("Hag 自然 UI 检查点不完整");
  return {
    bound,
    release,
    save: createQuestSave(
      {
        seed: 6,
        questId: "quest:p019",
        mode: "standard",
        party: coreParty.map((h) => ({ ...h, skillIds: [...h.skillIds] })),
        contentPacks: ["core", "weald"],
        bossEdgeRooms: true,
      },
      commands.slice(0, releaseCount),
      release,
      sources,
    ),
    initial: createCoreDungeonQuest(1, "quest:p019", "standard", coreParty, sources, true, null, [
      "core",
      "weald",
    ]),
  };
}
