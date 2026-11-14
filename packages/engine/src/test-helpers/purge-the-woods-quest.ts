import type { QuestStart } from "../../../data/src/quest-save";
import { createCoreDungeonQuest, type CoreQuestSources } from "../dungeon-quest-entry";
import type { Command, GameState } from "../command";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources } from "./disinfection-quest";

/** R-248/R-251：seed 4，公开命令清理三巢穴；不改怪物牌序或伤害。 */
export function purgeTheWoodsJourney(sources: CoreQuestSources = disinfectionSources) {
  const start: QuestStart = {
    seed: 4,
    questId: "quest:weald:p004",
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
  const battles: { roomId: string; kind: string; ids: readonly string[] }[] = [];
  const darkVisits: { roomId: string; before: number; after: number; cleared: boolean }[] = [];
  let recordedTrap = false;
  const run = naturalQuest(start.seed, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    restThreshold: 0,
    wipeLairs: 3,
    observe: (game, command) => {
      const d = previous.dungeon!;
      const room = d.rooms.find((r) => r.id === d.position)!;
      const firstDark =
        command.type === "resolveDungeonRoom" && room.kind === "dark" && darkVisits.length === 0;
      const firstTrap =
        command.type === "resolveDungeonRoom" && room.kind === "trap" && !recordedTrap;
      const cleared =
        command.type === "finishDungeonBattle" &&
        game.dungeon!.rooms.find((r) => r.id === d.position)!.cleared;
      if (cleared || firstDark || firstTrap)
        points.push({ game: previous, commands: [...commands] });
      commands.push(command);
      if (command.type === "startDungeonBattle") {
        battles.push({
          roomId: d.position,
          kind: room.kind,
          ids: game.dungeon!.monsterPool!.active!.monsters.map((m) => m.instanceId),
        });
        if (battles.length === 1) points.push({ game, commands: [...commands] });
      }
      if (cleared || firstDark || firstTrap) points.push({ game, commands: [...commands] });
      if (command.type === "resolveDungeonRoom" && room.kind === "dark")
        darkVisits.push({
          roomId: d.position,
          before: d.explorationSetup!.light,
          after: game.dungeon!.explorationSetup!.light,
          cleared: game.dungeon!.rooms.find((r) => r.id === d.position)!.cleared === true,
        });
      if (firstTrap) recordedTrap = true;
      previous = game;
    },
  });
  if (run.stopReason) throw new Error(`Purge the Woods 自然流程中断：${run.stopReason}`);
  return { start, run, points, battles, darkVisits };
}
