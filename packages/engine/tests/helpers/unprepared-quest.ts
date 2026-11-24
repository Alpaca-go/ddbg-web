import type { Command, GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
import type { QuestStart } from "../../../data/src/quest-save";

/** 与严格日志共用的 seed2 Patrol 真实检查点，不改状态、牌序或策略。 */
export function unpreparedQuest() {
  const start: QuestStart = {
    seed: 2,
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
  let before: GameState | undefined, after: GameState | undefined;
  let attack: Command | undefined;
  naturalQuest(start.seed, start.questId, true, sources, 2, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    wealdUnprepared: true,
    observe(game, command, events = []) {
      if (events.some((e) => e.type === "passiveTriggered" && e.trigger === "unprepared")) {
        before = previous;
        after = game;
        attack = command;
        throw new Error("Unprepared checkpoint ready");
      }
      commands.push(command);
      previous = game;
    },
  });
  if (!before || !after || !attack) throw new Error("未抵达自然 Ambush 开始检查点");
  return { start, before, after, attack, commands, sources };
}
