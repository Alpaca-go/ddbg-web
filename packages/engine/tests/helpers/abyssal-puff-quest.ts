import { readPrintedTargets } from "../../src/core/heroes/hero-skill";
import type { Command, GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";
import type { QuestStart } from "../../../data/src/quest-save";

/** seed1 Fungal Research 的 destroy-all 玩家偏好；只执行公开命令。 */
export function abyssalPuffQuest() {
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
  let beforeStart = initial;
  const commands: Command[] = [];
  let before: GameState | undefined, after: GameState | undefined;
  let attack: Command | undefined;
  naturalQuest(start.seed, start.questId, true, sources, 4, {
    continueFrom: initial,
    survival: true,
    handleDeaths: true,
    wealdAbyssalPuff: true,
    fungalResearch: "destroy-all",
    restThreshold: 0,
    observe(game, command, events = []) {
      if (
        command.type === "startBattle" &&
        game.dungeon?.roomCards?.active?.cardId === "room:weald:08"
      )
        beforeStart = previous;
      if (events.some((e) => e.type === "passiveTriggered" && e.trigger === "abyssalPuff")) {
        before = previous;
        after = game;
        attack = command;
        throw new Error("Abyssal Puff checkpoint ready");
      }
      commands.push(command);
      previous = game;
    },
  });
  if (!before || !after || !attack) throw new Error("未抵达 Abyssal Puff 摧毁检查点");
  let uiAttack: Command = attack;
  if (attack.type === "playHeroSkill") {
    const skillId = attack.skillId;
    const skill = before.battle!.skills.find((s) => s.id === skillId)!;
    const targets = readPrintedTargets(skill);
    if (targets.kind === "exact" && targets.max > 1)
      uiAttack = {
        type: "playHeroSkillTargets",
        actorId: attack.actorId,
        skillId: attack.skillId,
        targetIds: [attack.targetId],
      };
  }
  return { start, before, beforeStart, after, attack, uiAttack, commands, sources };
}
