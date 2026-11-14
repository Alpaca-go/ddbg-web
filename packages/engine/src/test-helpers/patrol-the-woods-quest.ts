import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import type { Command, GameState } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources } from "./disinfection-quest";

/** R-242：seed 3，经公开探索、战斗、奇物及替补流程清理六房。 */
export function patrolTheWoodsJourney(sources: CoreQuestSources = disinfectionSources) {
  const start: QuestStart = {
    seed: 3,
    questId: "quest:weald:p005",
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
  const rounds: { game: GameState; round: number }[] = [];
  const deployments: string[][] = [];
  let recordedFirst = false,
    recordedSecond = false;
  const run = naturalQuest(start.seed, start.questId, true, sources, 6, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    observe: (game, command) => {
      const round = game.battle?.encounter?.round;
      const newRound =
        game.battle?.encounter?.turn.type === "awaitingInitiative" &&
        round !== previous.battle?.encounter?.round;
      const first = newRound && round === 1 && !recordedFirst;
      const second = newRound && round === 2 && !recordedSecond;
      if (first) points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (newRound) rounds.push({ game, round: round! });
      if (
        first ||
        second ||
        game.dungeon!.rooms.filter((r) => r.cleared).length >
          previous.dungeon!.rooms.filter((r) => r.cleared).length
      )
        points.push({ game, commands: [...commands] });
      if (first) recordedFirst = true;
      if (second) recordedSecond = true;
      if (command.type === "startDungeonBattle")
        deployments.push(game.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId));
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`Patrol the Woods 自然流程中断：${run.stopReason}`);
  return { start, run, points, rounds, deployments };
}
