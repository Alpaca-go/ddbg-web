import type { Command, GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
import type { QuestStart } from "../../../data/src/quest-save";

/** 普通房间采样 seed2–5 后固定 seed4；不改玩家策略、站位或骰序。 */
export function toxicMushroomsQuest() {
  const start: QuestStart = {
    seed: 4,
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
  let beforeAttack = initial;
  const commands: Command[] = [];
  let before: GameState | undefined, after: GameState | undefined;
  let attack: Command | undefined;
  const run = naturalQuest(start.seed, start.questId, true, sources, 2, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    toxicMushrooms: true,
    observe(game, command, events = []) {
      if (command.type === "playMonsterSkill") beforeAttack = previous;
      if (events.some((e) => e.type === "passiveTriggered" && e.trigger === "toxicMushrooms")) {
        before = previous;
        after = game;
        attack = command;
        throw new Error("Toxic Mushrooms checkpoint ready");
      }
      commands.push(command);
      previous = game;
    },
  });
  if (!before || !after || !attack)
    throw new Error(`缺 Toxic Mushrooms 自然检查点：${run.stopReason}`);
  return { start, before, beforeAttack, after, attack, commands, sources };
}
