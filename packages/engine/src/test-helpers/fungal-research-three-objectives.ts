import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import type { Command, GameState } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources } from "./disinfection-quest";
import { livingNecroticFungus } from "../expansions/weald/necrotic-fungus";
import { destroyedNecroticFungusCount } from "../expansions/weald/fungal-research-quest";

/** R-246/R-252：seed 1，保留真菌取得三目标；只执行公开命令。 */
export function fungalResearchThreeObjectives(sources: CoreQuestSources = disinfectionSources) {
  const start: QuestStart = {
    seed: 1,
    questId: "quest:weald:p001",
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
  const clearedBattles: {
    roomId: string;
    objective: boolean;
    destroyed: number;
    living: number;
    delta: number;
  }[] = [];
  let recordedDestruction = false;
  const run = naturalQuest(start.seed, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    exitAfterObjectiveRooms: 3,
    fungalResearch: "retain-one",
    observe: (game, command) => {
      const objective =
        previous.dungeon!.rooms.find((r) => r.id === previous.dungeon!.position)?.kind ===
        "objective";
      const handoff = command.type === "finishDungeonBattle" && objective;
      const destroyed =
        !recordedDestruction &&
        objective &&
        previous.battle &&
        game.battle &&
        destroyedNecroticFungusCount(game.battle) > destroyedNecroticFungusCount(previous.battle);
      if (handoff || destroyed) points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (handoff || destroyed || (objective && command.type === "startDungeonBattle"))
        points.push({ game, commands: [...commands] });
      if (destroyed) recordedDestruction = true;
      if (
        command.type === "finishDungeonBattle" &&
        previous.battle &&
        game.dungeon!.rooms.find((r) => r.id === previous.dungeon!.position)?.cleared
      ) {
        clearedBattles.push({
          roomId: previous.dungeon!.position,
          objective,
          destroyed: destroyedNecroticFungusCount(previous.battle),
          living: livingNecroticFungus(previous.battle).length,
          delta:
            (game.dungeon!.necroticFungusBroughtBackCount ?? 0) -
            (previous.dungeon!.necroticFungusBroughtBackCount ?? 0),
        });
      }
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`Fungal Research 三目标中断：${run.stopReason}`);
  return { start, run, points, clearedBattles };
}
