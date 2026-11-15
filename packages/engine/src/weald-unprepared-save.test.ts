import { expect, it } from "vitest";
import type { Command, GameState } from "./command";
import { createCoreDungeonQuest } from "./dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./test-helpers/natural-quest";
import { disinfectionSources as sources } from "./test-helpers/disinfection-quest";
import { createQuestSave, loadQuestSave } from "./quest-save";
import type { QuestStart } from "../../data/src/quest-save";

it("seed2 Patrol 自然 Ambush 战斗开始前后严格恢复，删标记拒绝（R-234）", () => {
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
  expect(attack).toEqual({ type: "startBattle", wealdUnprepared: true });
  for (const [game, log] of [
    [before, commands],
    [after, [...commands, attack]],
  ] as const) {
    const save = createQuestSave(start, [...log], game, sources);
    expect(loadQuestSave(JSON.parse(JSON.stringify(save)), sources).game).toEqual(game);
  }
  const tampered = createQuestSave(start, [...commands, attack], after, sources);
  const last = tampered.commands[tampered.commands.length - 1]!;
  if (last.type !== "startBattle") throw new Error("缺战斗开始命令");
  delete last.wealdUnprepared;
  expect(() => loadQuestSave(JSON.parse(JSON.stringify(tampered)), sources)).toThrow(/不一致/);
}, 120000);
