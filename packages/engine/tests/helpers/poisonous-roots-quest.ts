import type { QuestStart } from "../../../data/src/shared/quest-save";
import type { Command, GameState } from "../../src/shared/core/command";
import { createCoreDungeonQuest } from "../../src/shared/dungeon/dungeon-quest-entry";
import { naturalParty, naturalQuest } from "./natural-quest";
import { disinfectionSources as sources } from "./disinfection-quest";

/** 固定 seed2 Disinfection；星区英雄公开换姿态以结束回合。 */
export function poisonousRootsQuest() {
  const start: QuestStart = {
    seed: 2,
    questId: "quest:weald:p003",
    mode: "radiant",
    party: naturalParty,
    contentPacks: ["core", "weald"],
    bossEdgeRooms: true,
    stygianRoomRules: "full",
  };
  const initial = createCoreDungeonQuest(
    2,
    start.questId,
    start.mode,
    start.party,
    sources,
    true,
    "full",
    start.contentPacks,
  );
  const commands: Command[] = [];
  let previous = initial,
    before: GameState | undefined,
    after: GameState | undefined,
    action: Command | undefined;
  const run = naturalQuest(2, start.questId, true, sources, 4, {
    continueFrom: initial,
    heroAction(game) {
      const b = game.battle!,
        turn = b.encounter!.turn;
      if (turn.type !== "hero" || turn.mustMove) return undefined;
      const actor = b.entities.find((e) => e.id === turn.actorId)!;
      if (!b.areas.find((a) => a.id === actor.areaId)?.poisonousRoots) return undefined;
      return {
        type: "changeStance",
        actorId: actor.id,
        direction: actor.stance === "aggressive" ? "backward" : "forward",
        allTrinkets: true,
      };
    },
    observe(game, c, events = []) {
      if (
        c.type === "changeStance" &&
        events.some((e) => e.type === "passiveTriggered" && e.trigger === "poisonousRoots")
      ) {
        before = previous;
        after = game;
        action = c;
        throw new Error("poisonous roots checkpoint ready");
      }
      commands.push(c);
      previous = game;
    },
  });
  if (!before || !after || !action) throw new Error(`缺树根自然检查点：${run.stopReason}`);
  return { start, before, after, action, commands, sources };
}
