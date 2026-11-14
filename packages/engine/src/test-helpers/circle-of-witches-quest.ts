import type { QuestStart } from "../../../data/src/quest-save";
import type { Command, GameState } from "../command";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import { disinfectionSources } from "./disinfection-quest";
import { naturalParty, naturalQuest } from "./natural-quest";
import { WEALD_CRONE_EXCEPTION_INSTANCE_ID } from "../expansions/weald/circle-of-witches-spawn";

/** R-244/R-247：固定 seed 2，按公开命令完成一／三目标，不注入房间或伤害。 */
export function circleOfWitchesJourney(
  kills: 1 | 3,
  sources: CoreQuestSources = disinfectionSources,
) {
  const start: QuestStart = {
    seed: 2,
    questId: "quest:weald:p002",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    start.seed,
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
  const run = naturalQuest(2, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    exitAfterCroneKills: kills,
    observe: (game, command) => {
      const crone = game.battle?.entities.find((e) => e.id === WEALD_CRONE_EXCEPTION_INSTANCE_ID);
      const before = previous.battle?.entities.find(
        (e) => e.id === WEALD_CRONE_EXCEPTION_INSTANCE_ID,
      );
      const killed = crone?.dead && before && !before.dead;
      const handoff = command.type === "finishDungeonBattle" && before;
      if (killed || handoff) points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (killed || handoff || (command.type === "startDungeonBattle" && crone))
        points.push({ game, commands: [...commands] });
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`Circle of Witches 自然流程中断：${run.stopReason}`);
  return { start, run, points };
}
