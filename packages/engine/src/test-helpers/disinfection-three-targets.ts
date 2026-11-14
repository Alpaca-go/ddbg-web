import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import type { Command, GameState } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources, disinfectionHeroAction } from "./disinfection-quest";

/** R-245：固定种子，经公开消毒、战斗和替补流程完成三棵橡树。 */
export function disinfectionThreeTargets(
  seed: 2 | 7,
  sources: CoreQuestSources = disinfectionSources,
) {
  const start: QuestStart = {
    seed,
    questId: "quest:weald:p003",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    seed,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  let previous = initial;
  const commands: Command[] = [];
  const points: { game: GameState; commands: Command[] }[] = [];
  const run = naturalQuest(seed, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    exitAfterDisinfectedOaks: 3,
    heroAction: disinfectionHeroAction,
    observe: (game, command) => {
      const record =
        command.type === "disinfectInfectedOak" ||
        command.type === "finishDungeonBattle" ||
        command.type === "joinPreparedReplacements";
      if (record) points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (record || command.type === "startDungeonBattle")
        points.push({ game, commands: [...commands] });
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`Disinfection 三目标中断：${run.stopReason}`);
  return { start, points, run };
}
